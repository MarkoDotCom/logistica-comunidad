// Contratos contra la base del compose. Borra lo que crea al final.
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

const LOS_ALAMOS = '10000000-0000-4000-8000-000000000001';
const A_101 = '30000000-0000-4000-8000-000000000001';
const GC_A_101 = '40000000-0000-4000-8000-000000000001';
const BRUNO = '50000000-0000-4000-8000-000000000003';

describe('Contratos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const ids: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.contract.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('creates a contract on a community, reads it back and sees it in the unit detail', async () => {
    const res = await request(app.getHttpServer())
      .post(`/units/${LOS_ALAMOS}/contracts`)
      .send({ userId: BRUNO, type: 'employment', startsAt: '2026-02-01', endsAt: '2026-07-31', notes: 'Jardinería' })
      .expect(201);
    ids.push(res.body.data.id);
    expect(res.body.data).toMatchObject({ unitId: LOS_ALAMOS, type: 'employment', startsAt: '2026-02-01', endsAt: '2026-07-31', documentUrl: null, notes: 'Jardinería', user: { fullName: 'Bruno Díaz' } });

    await request(app.getHttpServer()).get(`/contracts/${res.body.data.id}`).expect(200);
    const detail = await request(app.getHttpServer()).get(`/units/${LOS_ALAMOS}/detail`).expect(200);
    expect(detail.body.data.contracts).toEqual(expect.arrayContaining([expect.objectContaining({ id: res.body.data.id })]));
  });

  it('updates the dates and notes, and clears the end date with null', async () => {
    const id = ids[0];
    const res = await request(app.getHttpServer()).patch(`/contracts/${id}`).send({ endsAt: null, notes: 'Indefinido' }).expect(200);
    expect(res.body.data).toMatchObject({ endsAt: null, notes: 'Indefinido' });
    await request(app.getHttpServer()).patch(`/contracts/${id}`).send({ endsAt: '2025-01-01' }).expect(400); // antes del inicio
    await request(app.getHttpServer()).patch(`/contracts/${id}`).send({ type: 'lease' }).expect(400); // arriendo sobre comunidad
    await request(app.getHttpServer()).patch(`/contracts/${id}`).send({ startsAt: '01/02/2026' }).expect(400);
  });

  it('enforces the type per unit kind and rejects unknown people or accounts', async () => {
    await request(app.getHttpServer()).post(`/units/${A_101}/contracts`).send({ userId: BRUNO, type: 'administration', startsAt: '2026-01-01' }).expect(400);
    await request(app.getHttpServer()).post(`/units/${GC_A_101}/contracts`).send({ userId: BRUNO, type: 'ownership', startsAt: '2026-01-01' }).expect(400);
    await request(app.getHttpServer()).post(`/units/${A_101}/contracts`).send({ userId: '00000000-0000-4000-8000-000000000000', type: 'lease', startsAt: '2026-01-01' }).expect(400);
    await request(app.getHttpServer()).get('/contracts/00000000-0000-4000-8000-000000000000').expect(404);
  });
});
