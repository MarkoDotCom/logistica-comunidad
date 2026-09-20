// Métricas del dashboard contra la base del compose (solo lectura sobre el seed).
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { loginAs, type Session } from './session.helper.js';

describe('Resumen (e2e)', () => {
  let app: INestApplication<App>;
  let session: Session;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    session = await loginAs(app);
  });

  afterAll(() => app.close());

  it('GET /summary counts units by kind, users and current contracts', async () => {
    const res = await request(app.getHttpServer()).get('/summary').set(session.auth).expect(200);
    const { units, users, contracts } = res.body.data;
    expect(units.community).toBeGreaterThanOrEqual(1);
    expect(units.apartment).toBeGreaterThanOrEqual(4);
    expect(users.total).toBeGreaterThanOrEqual(users.active);
    // Seed: 6 vigentes (el arriendo 2025 ya venció); el de 2026 vence el 31-12, fuera de los 30 días de hoy
    expect(contracts.current).toBeGreaterThanOrEqual(6);
    expect(contracts.endingSoon).toBeLessThanOrEqual(contracts.current);
  });
});
