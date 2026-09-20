// Envoltorio de respuestas y health contra la base del compose.
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /health answers with the success envelope and echoes the trace id', async () => {
    const res = await request(app.getHttpServer()).get('/health').set('x-request-id', 'e2e-health').expect(200);
    expect(res.headers['x-request-id']).toBe('e2e-health');
    expect(res.body).toMatchObject({ success: true, status: 200, message: 'OK', traceId: 'e2e-health', data: { status: 'ok', database: 'up' } });
  });

  it('wraps errors with the same envelope', async () => {
    const res = await request(app.getHttpServer()).get('/units/no-es-uuid').expect(400);
    expect(res.body).toMatchObject({ success: false, status: 400, code: 'BAD_REQUEST' });
    expect(res.body.traceId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
