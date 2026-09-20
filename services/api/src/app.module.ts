import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { RestModule } from './rest/rest.module.js';

// Dos capas con dependencias en un solo sentido:
//   rest      →  database   (endpoints HTTP de negocio)
//   database  →  (nada nuestro)   (tablas vía Prisma)
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Un solo .env para todo el repo: proyectos/logistica-comunidad/.env. Las variables ya presentes en el entorno (compose) tienen prioridad.
      envFilePath: fileURLToPath(new URL('../../../.env', import.meta.url)),
    }),
    DatabaseModule,
    RestModule,
  ],
})
export class AppModule {}
