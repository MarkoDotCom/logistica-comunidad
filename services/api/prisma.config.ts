import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Un solo .env para todo el repo: proyectos/logistica-comunidad/.env
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export default defineConfig({
  schema: 'src/database/prisma/schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
