import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const IS_PUBLIC = 'isPublic';
export const PERMISSION = 'permission';

/** Endpoint sin sesión (health, login, refresh). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Permiso del catálogo que exige el endpoint; sin él, 403. */
export const RequirePermission = (key: string) => SetMetadata(PERMISSION, key);

export interface SessionUser {
  id: string;
}

export type RequestWithUser = Request & { user?: SessionUser };

/** El usuario de la sesión, puesto por JwtAuthGuard. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => ctx.switchToHttp().getRequest<RequestWithUser>().user!);
