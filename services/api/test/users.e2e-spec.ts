// Usuarios contra la base del compose. Borra lo que crea al final.
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

const ANA = '50000000-0000-4000-8000-000000000002'; // seed: dueña de A-101 y B-201

describe('Usuarios (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const ids: string[] = [];
  const suffix = Date.now();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.app_user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('lists users and filters by name or email', async () => {
    const all = await request(app.getHttpServer()).get('/users').expect(200);
    expect(all.body.data.length).toBeGreaterThanOrEqual(5);

    const res = await request(app.getHttpServer()).get('/users?search=rojas').expect(200);
    expect(res.body.data.map((u: { email: string }) => u.email)).toEqual(['ana.rojas@example.com']);
  });

  it('reads a user with their contracts and units', async () => {
    const res = await request(app.getHttpServer()).get(`/users/${ANA}`).expect(200);
    expect(res.body.data).toMatchObject({ fullName: 'Ana Rojas', email: 'ana.rojas@example.com', isActive: true });
    expect(res.body.data.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'ownership', startsAt: '2019-06-15', endsAt: null, unit: expect.objectContaining({ kind: 'apartment', code: '101' }) }),
        expect.objectContaining({ type: 'ownership', unit: expect.objectContaining({ code: '201' }) }),
      ]),
    );
    await request(app.getHttpServer()).get('/users/00000000-0000-4000-8000-000000000000').expect(404);
  });

  it('creates, updates and validates a user', async () => {
    const email = `e2e.${suffix}@example.com`;
    const created = await request(app.getHttpServer()).post('/users').send({ email, fullName: 'Eva Soto' }).expect(201);
    ids.push(created.body.data.id);
    expect(created.body.data).toMatchObject({ email, fullName: 'Eva Soto', phone: null, externalAuthId: null, isActive: true });

    const updated = await request(app.getHttpServer())
      .patch(`/users/${created.body.data.id}`)
      .send({ phone: '+56 9 5555 5555', isActive: false })
      .expect(200);
    expect(updated.body.data).toMatchObject({ phone: '+56 9 5555 5555', isActive: false, contracts: [] });

    await request(app.getHttpServer()).post('/users').send({ email: 'no-es-email', fullName: 'X' }).expect(400);
    await request(app.getHttpServer()).post('/users').send({ email: 'ANA.ROJAS@example.com', fullName: 'Ana' }).expect(409); // citext
    await request(app.getHttpServer()).patch(`/users/${created.body.data.id}`).send({ email: 'ana.rojas@example.com' }).expect(409);
  });
});
