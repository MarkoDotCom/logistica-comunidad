// Identidad contra la base del compose: login, me, refresh con rotación, logout y permisos.
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { ADMIN_EMAIL, loginAs, PASSWORD, READ_ONLY_EMAIL } from './session.helper.js';

describe('Identidad (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('logs in, returns the account with permissions and sets an httpOnly refresh cookie', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD }).expect(200);
    expect(res.body.data.accessToken).toMatch(/^eyJ/);
    expect(res.body.data.user).toMatchObject({ fullName: 'Marcela Soto', roles: [{ name: 'admin' }] });
    expect(res.body.data.user.permissions).toEqual(expect.arrayContaining(['units.write', 'roles.write']));
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain('refresh_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/auth');

    await request(app.getHttpServer()).post('/auth/login').send({ email: ADMIN_EMAIL, password: 'mala' }).expect(401);
    await request(app.getHttpServer()).post('/auth/login').send({ email: 'no-es-email', password: 'x' }).expect(400);
  });

  it('protects every endpoint: 401 without token, 403 without the permission', async () => {
    await request(app.getHttpServer()).get('/units').expect(401);
    await request(app.getHttpServer()).get('/units').set('Authorization', 'Bearer basura').expect(401);
    await request(app.getHttpServer()).get('/health').expect(200); // público

    const admin = await loginAs(app);
    await request(app.getHttpServer()).get('/auth/me').set(admin.auth).expect(200);
    await request(app.getHttpServer()).get('/units').set(admin.auth).expect(200);

    const readOnly = await loginAs(app, READ_ONLY_EMAIL);
    await request(app.getHttpServer()).get('/units').set(readOnly.auth).expect(200);
    const forbidden = await request(app.getHttpServer()).post('/units').set(readOnly.auth).send({ kind: 'community', code: 'x' }).expect(403);
    expect(forbidden.body).toMatchObject({ code: 'FORBIDDEN', message: 'No tienes el permiso units.write' });
  });

  it('rotates the refresh token, rejects the used one and logs out', async () => {
    const session = await loginAs(app);
    const first = await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', session.cookie).expect(200);
    expect(first.body.data.accessToken).toMatch(/^eyJ/);
    const rotated = String(first.headers['set-cookie']).split(';')[0];
    expect(rotated).not.toBe(session.cookie);

    await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', session.cookie).expect(401); // ya usado
    await request(app.getHttpServer()).post('/auth/refresh').expect(401); // sin cookie
    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', rotated).expect(204);
    await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', rotated).expect(401); // revocado
  });
});
