import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiResponseFilter } from './api-response.filter.js';
import { ApiResponseInterceptor } from './api-response.interceptor.js';
import { AuthModule } from './auth/auth.module.js';
import { ContractsModule } from './contracts/contracts.module.js';
import { HealthController } from './health/health.controller.js';
import { RolesModule } from './roles/roles.module.js';
import { SummaryModule } from './summary/summary.module.js';
import { UnitsModule } from './units/units.module.js';
import { UsersModule } from './users/users.module.js';

// Endpoints HTTP de negocio. Usa DatabaseModule; nunca al revés.
@Module({
  imports: [AuthModule, UsersModule, UnitsModule, ContractsModule, RolesModule, SummaryModule],
  controllers: [HealthController],
  // Toda respuesta, éxito o error, sale con el mismo envoltorio; ver api-response.ts
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiResponseFilter },
  ],
})
export class RestModule {}
