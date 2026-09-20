// Inicia sesión contra la API levantada en los e2e y devuelve cómo autenticar las peticiones.
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

export const PASSWORD = 'Comunidad2026!';
export const ADMIN_EMAIL = 'admin@losalamos.example.com'; // Marcela: admin
export const READ_ONLY_EMAIL = 'tomas.ibanez@example.com'; // Tomás: read-only

export interface Session {
  token: string;
  cookie: string; // cabecera Cookie con el refresh token
  auth: { Authorization: string };
}

export async function loginAs(app: INestApplication<App>, email = ADMIN_EMAIL): Promise<Session> {
  const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password: PASSWORD }).expect(200);
  const setCookie = res.headers['set-cookie'] as unknown as string[] | string;
  const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie]).map((c) => c.split(';')[0]).join('; ');
  return { token: res.body.data.accessToken, cookie, auth: { Authorization: `Bearer ${res.body.data.accessToken}` } };
}
