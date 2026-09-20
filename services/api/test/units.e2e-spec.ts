// Unidades contra la base del compose. Crea su propia comunidad y la borra al final (cascade).
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

const LOS_ALAMOS = '10000000-0000-4000-8000-000000000001'; // seed
const TORRE_A = '20000000-0000-4000-8000-000000000001';

describe('Unidades (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let communityId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (communityId) await prisma.unit.delete({ where: { id: communityId } });
    await app.close();
  });

  it('lists roots and children level by level', async () => {
    const roots = await request(app.getHttpServer()).get('/units').expect(200);
    expect(roots.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: LOS_ALAMOS, kind: 'community', parentId: null })]));

    const children = await request(app.getHttpServer()).get(`/units?parentId=${LOS_ALAMOS}`).expect(200);
    expect(children.body.data.map((u: { code: string }) => u.code)).toEqual(['A', 'B']);
  });

  it('lists children with their alive children count, optionally including deleted ones', async () => {
    // La base del compose puede tener datos creados a mano además del seed: se comprueba lo mínimo
    const res = await request(app.getHttpServer()).get(`/units?parentId=${TORRE_A}`).expect(200);
    const a101 = res.body.data.find((u: { code: string }) => u.code === '101');
    expect(a101.childrenCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((u: { deletedAt: string | null }) => u.deletedAt === null)).toBe(true);
    const all = await request(app.getHttpServer()).get(`/units?parentId=${TORRE_A}&includeDeleted=true`).expect(200);
    expect(all.body.data.length).toBeGreaterThanOrEqual(res.body.data.length);
  });

  it('returns the full detail of an apartment: path, accounts and contracts with people', async () => {
    const res = await request(app.getHttpServer()).get('/units/30000000-0000-4000-8000-000000000001/detail').expect(200); // A-101
    const d = res.body.data;
    expect(d).toMatchObject({ kind: 'apartment', code: '101' });
    expect(d.ancestors.map((u: { code: string }) => u.code)).toEqual(['los-alamos', 'A']);
    expect(d.children).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'account', code: 'GC', childrenCount: 0 })]));
    expect(d.contracts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'lease', startsAt: '2026-01-01', endsAt: '2026-12-31', user: expect.objectContaining({ fullName: 'Carla Muñoz' }) }),
      expect.objectContaining({ type: 'lease', startsAt: '2025-01-01' }),
      expect.objectContaining({ type: 'ownership', startsAt: '2019-06-15', endsAt: null, user: expect.objectContaining({ fullName: 'Ana Rojas', email: 'ana.rojas@example.com' }) }),
    ]));
    expect(d.contracts[0].startsAt >= d.contracts.at(-1).startsAt).toBe(true); // del más reciente al más antiguo
    await request(app.getHttpServer()).get('/units/00000000-0000-4000-8000-000000000000/detail').expect(404);
  });

  it('returns the nested subtree of a unit', async () => {
    const res = await request(app.getHttpServer()).get(`/units/${TORRE_A}/tree`).expect(200);
    expect(res.body.data).toMatchObject({ id: TORRE_A, code: 'A' });
    expect(res.body.data.children.map((u: { code: string }) => u.code)).toEqual(expect.arrayContaining(['101', '102']));
    expect(res.body.data.children[0].children).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'account', code: 'GC', children: [] })]));
    await request(app.getHttpServer()).get('/units/00000000-0000-4000-8000-000000000000/tree').expect(404);
  });

  it('creates a community and its children, enforcing root and sibling-code rules', async () => {
    const community = await request(app.getHttpServer()).post('/units').send({ kind: 'community', code: `e2e-${suffix}`, name: 'E2E' }).expect(201);
    communityId = community.body.data.id;
    expect(community.body.data).toMatchObject({ parentId: null, kind: 'community', deletedAt: null });

    const tower = await request(app.getHttpServer()).post('/units').send({ kind: 'building', code: 'T1', parentId: communityId }).expect(201);
    await request(app.getHttpServer()).post('/units').send({ kind: 'apartment', code: '11', parentId: tower.body.data.id }).expect(201);

    await request(app.getHttpServer()).post('/units').send({ kind: 'building', code: 'T1', parentId: communityId }).expect(409);
    await request(app.getHttpServer()).post('/units').send({ kind: 'building', code: 'T2' }).expect(400);
    await request(app.getHttpServer()).post('/units').send({ kind: 'community', code: 'x', parentId: communityId }).expect(400);
    await request(app.getHttpServer()).post('/units').send({ kind: 'garage', code: 'x', parentId: communityId }).expect(400);
    await request(app.getHttpServer()).post('/units').send({ kind: 'building', code: 'T3', parentId: '00000000-0000-4000-8000-000000000000' }).expect(400);
  });

  it('updates a unit and moves it without creating cycles', async () => {
    const [tower] = (await request(app.getHttpServer()).get(`/units?parentId=${communityId}`)).body.data;
    const [apt] = (await request(app.getHttpServer()).get(`/units?parentId=${tower.id}`)).body.data;

    const renamed = await request(app.getHttpServer()).patch(`/units/${tower.id}`).send({ name: 'Torre uno' }).expect(200);
    expect(renamed.body.data).toMatchObject({ name: 'Torre uno' });

    // Mover la torre bajo su propio departamento crearía un ciclo
    await request(app.getHttpServer()).patch(`/units/${tower.id}`).send({ parentId: apt.id }).expect(400);
    // Mover el departamento directo bajo la comunidad sí se permite (jerarquía flexible)
    const moved = await request(app.getHttpServer()).patch(`/units/${apt.id}`).send({ parentId: communityId }).expect(200);
    expect(moved.body.data.parentId).toBe(communityId);

    const tree = await request(app.getHttpServer()).get(`/units/${communityId}/tree`).expect(200);
    expect(tree.body.data.children.map((u: { code: string }) => u.code)).toEqual(['11', 'T1']);
  });

  it('soft-deletes a subtree, hides it, frees the code and restores it top-down', async () => {
    const children = (await request(app.getHttpServer()).get(`/units?parentId=${communityId}`)).body.data as { id: string; code: string }[];
    const tower = children.find((u) => u.code === 'T1')!;
    const apt = children.find((u) => u.code === '11')!; // movido bajo la comunidad en el test anterior
    // Un hijo nuevo dentro de la torre para que la cascada tenga algo que arrastrar
    await request(app.getHttpServer()).post('/units').send({ kind: 'apartment', code: '12', parentId: tower.id }).expect(201);

    const del = await request(app.getHttpServer()).delete(`/units/${tower.id}`).expect(200);
    expect(del.body.data).toEqual({ deleted: 2 });

    // Desaparece de listas, árbol y GET; el árbol con includeDeleted la muestra con deletedAt
    const after = (await request(app.getHttpServer()).get(`/units?parentId=${communityId}`)).body.data as { code: string }[];
    expect(after.map((u) => u.code)).toEqual(['11']);
    await request(app.getHttpServer()).get(`/units/${tower.id}`).expect(404);
    await request(app.getHttpServer()).patch(`/units/${tower.id}`).send({ name: 'x' }).expect(404);
    const withDeleted = await request(app.getHttpServer()).get(`/units/${communityId}/tree?includeDeleted=true`).expect(200);
    const deletedTower = withDeleted.body.data.children.find((u: { id: string }) => u.id === tower.id);
    expect(deletedTower.deletedAt).not.toBeNull();
    expect(deletedTower.children[0].deletedAt).toBe(deletedTower.deletedAt);

    // El código T1 queda libre; con una T1 viva no se puede restaurar la vieja
    const twin = await request(app.getHttpServer()).post('/units').send({ kind: 'building', code: 'T1', parentId: communityId }).expect(201);
    await request(app.getHttpServer()).post(`/units/${tower.id}/restore`).expect(409);
    await request(app.getHttpServer()).delete(`/units/${twin.body.data.id}`).expect(200);

    // Restaurar un hijo cuyo padre sigue eliminado se rechaza; restaurar el padre trae al hijo
    await request(app.getHttpServer()).post(`/units/${deletedTower.children[0].id}/restore`).expect(400);
    const restored = await request(app.getHttpServer()).post(`/units/${tower.id}/restore`).expect(200);
    expect(restored.body.data).toMatchObject({ id: tower.id, deletedAt: null });
    const tree = await request(app.getHttpServer()).get(`/units/${tower.id}/tree`).expect(200);
    expect(tree.body.data.children.map((u: { code: string }) => u.code)).toEqual(['12']);
    await request(app.getHttpServer()).post(`/units/${tower.id}/restore`).expect(400); // ya está viva
    await request(app.getHttpServer()).post(`/units/${apt.id}/restore`).expect(400);
  });
});
