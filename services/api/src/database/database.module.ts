import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { AppUserTable } from './tables/app-user.table.js';
import { ContractTable } from './tables/contract.table.js';
import { UnitTable } from './tables/unit.table.js';

// Único punto de acceso a la base: los módulos de negocio inyectan las tablas, no Prisma.
const TABLES = [AppUserTable, UnitTable, ContractTable];

@Global()
@Module({
  providers: [PrismaService, ...TABLES],
  exports: [PrismaService, ...TABLES],
})
export class DatabaseModule {}
