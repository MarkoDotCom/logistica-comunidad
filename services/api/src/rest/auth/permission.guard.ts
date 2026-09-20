import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { PERMISSION, type RequestWithUser } from './auth.decorators.js';

// Exige el permiso declarado con @RequirePermission(). Los permisos se leen de la base en cada petición:
// un cambio de rol surte efecto de inmediato, sin esperar a que expire el token.
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: AppUserTable,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | undefined>(PERMISSION, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;

    const user = ctx.switchToHttp().getRequest<RequestWithUser>().user;
    if (!user) throw new UnauthorizedException('Falta el token de acceso');
    const account = await this.users.findAccount(user.id);
    if (!account || !account.isActive) throw new UnauthorizedException('La cuenta no existe o está inactiva');
    if (!account.permissions.includes(required)) throw new ForbiddenException(`No tienes el permiso ${required}`);
    return true;
  }
}
