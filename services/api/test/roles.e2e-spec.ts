// Roles y permisos contra la base del compose. Borra lo que crea al final.
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { loginAs, type Session } from './session.helper.js';
import { PrismaService } from '../src/database/prisma.service.js';

const ADMIN_ROLE = '70000000-0000-4000-8000-000000000001';
const BRUNO = '50000000-0000-4000-8000-000000000003';

describe('Roles (e2e)', () => {
  let app: INestApplication<App>;
  let session: Session;
  let prisma: PrismaService;
  const ids: string[] = [];
  const suffix = Date.now();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    session = await loginAs(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.role.deleteMany({ where: { id: { in: ids } } }); // cascade: permisos y asignaciones
    await app.close();
  });

  it('lists the permission catalog and the roles with counts', async () => {
    const perms = await request(app.getHttpServer()).get('/permissions').set(session.auth).expect(200);
    expect(perms.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'units.write', resource: 'units', action: 'write' })]));
    const roles = await request(app.getHttpServer()).get('/roles').set(session.auth).expect(200);
    const admin = roles.body.data.find((r: { id: string }) => r.id === ADMIN_ROLE);
    expect(admin).toMatchObject({ name: 'admin', isSystem: true, permissionCount: perms.body.data.length });
    expect(admin.userCount).toBeGreaterThanOrEqual(1);
  });

  it('creates, reads, updates and soft-deletes a role', async () => {
    const created = await request(app.getHttpServer()).post('/roles').set(session.auth).send({ name: `Contador ${suffix}`, description: 'Ve cuentas', permissions: ['units.read', 'contracts.read'] }).expect(201);
    ids.push(created.body.data.id);
    expect(created.body.data).toMatchObject({ isSystem: false, permissions: ['contracts.read', 'units.read'], users: [], permissionCount: 2, userCount: 0 });

    await request(app.getHttpServer()).post('/roles').set(session.auth).send({ name: `contador ${suffix}`, permissions: [] }).expect(409); // citext
    await request(app.getHttpServer()).post('/roles').set(session.auth).send({ name: 'X', permissions: ['nope.read'] }).expect(400);
    await request(app.getHttpServer()).post('/roles').set(session.auth).send({ name: 'Mal', permissions: ['sin-punto'] }).expect(400);

    const updated = await request(app.getHttpServer()).patch(`/roles/${created.body.data.id}`).set(session.auth).send({ permissions: ['users.read'], description: null }).expect(200);
    expect(updated.body.data).toMatchObject({ permissions: ['users.read'], description: null, permissionCount: 1 });

    await request(app.getHttpServer()).delete(`/roles/${created.body.data.id}`).set(session.auth).expect(204);
    await request(app.getHttpServer()).get(`/roles/${created.body.data.id}`).set(session.auth).expect(404);
    const list = await request(app.getHttpServer()).get('/roles').set(session.auth).expect(200);
    expect(list.body.data.map((r: { id: string }) => r.id)).not.toContain(created.body.data.id);
  });

  it('protects system roles and assigns users from both sides', async () => {
    await request(app.getHttpServer()).patch(`/roles/${ADMIN_ROLE}`).set(session.auth).send({ name: 'Root' }).expect(400);
    await request(app.getHttpServer()).delete(`/roles/${ADMIN_ROLE}`).set(session.auth).expect(400);

    const role = await request(app.getHttpServer()).post('/roles').set(session.auth).send({ name: `Comité ${suffix}`, permissions: ['units.read'] }).expect(201);
    ids.push(role.body.data.id);

    // Desde el rol: agregar a Bruno (idempotente) y quitarlo
    const added = await request(app.getHttpServer()).put(`/roles/${role.body.data.id}/users/${BRUNO}`).set(session.auth).expect(200);
    expect(added.body.data.users).toEqual([expect.objectContaining({ fullName: 'Bruno Díaz' })]);
    await request(app.getHttpServer()).put(`/roles/${role.body.data.id}/users/${BRUNO}`).set(session.auth).expect(200);
    const bruno = await request(app.getHttpServer()).get(`/users/${BRUNO}`).set(session.auth).expect(200);
    expect(bruno.body.data.roles).toEqual(expect.arrayContaining([expect.objectContaining({ name: `Comité ${suffix}` })]));
    const removed = await request(app.getHttpServer()).delete(`/roles/${role.body.data.id}/users/${BRUNO}`).set(session.auth).expect(200);
    expect(removed.body.data.users).toEqual([]);
    await request(app.getHttpServer()).put(`/roles/${role.body.data.id}/users/00000000-0000-4000-8000-000000000000`).set(session.auth).expect(400);

    // Desde el usuario: roleIds reemplaza el conjunto (con Bruno, para no tocar a la admin de la sesión); al final se restaura
    const before = (await request(app.getHttpServer()).get(`/users/${BRUNO}`).set(session.auth)).body.data.roles.map((r: { id: string }) => r.id);
    const patched = await request(app.getHttpServer()).patch(`/users/${BRUNO}`).set(session.auth).send({ roleIds: [role.body.data.id] }).expect(200);
    expect(patched.body.data.roles.map((r: { id: string }) => r.id)).toEqual([role.body.data.id]);
    await request(app.getHttpServer()).patch(`/users/${BRUNO}`).set(session.auth).send({ roleIds: ['00000000-0000-4000-8000-000000000000'] }).expect(400);
    await request(app.getHttpServer()).patch(`/users/${BRUNO}`).set(session.auth).send({ roleIds: before }).expect(200);
    const users = await request(app.getHttpServer()).get('/users').set(session.auth).expect(200);
    expect(users.body.data.find((u: { id: string }) => u.id === BRUNO).roles).toEqual([expect.objectContaining({ name: 'propietario' })]);
  });
});
