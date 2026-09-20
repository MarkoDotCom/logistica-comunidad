import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { PermissionGuard } from './permission.guard.js';

function context(user: { id: string } | undefined): ExecutionContext {
  return { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user }) }) } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  const account = (permissions: string[], isActive = true) => ({ id: 'u1', isActive, permissions });

  it('lets through endpoints without a required permission, and users who have it', async () => {
    const findAccount = vi.fn().mockResolvedValue(account(['units.read']));
    const reflector = { getAllAndOverride: vi.fn().mockReturnValueOnce(undefined).mockReturnValue('units.read') } as unknown as Reflector;
    const guard = new PermissionGuard(reflector, { findAccount } as unknown as AppUserTable);

    await expect(guard.canActivate(context({ id: 'u1' }))).resolves.toBe(true); // sin @RequirePermission
    await expect(guard.canActivate(context({ id: 'u1' }))).resolves.toBe(true);
  });

  it('answers 403 without the permission and 401 without user or with an inactive account', async () => {
    const findAccount = vi.fn().mockResolvedValueOnce(account(['units.read'])).mockResolvedValueOnce(account(['units.write'], false));
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue('units.write') } as unknown as Reflector;
    const guard = new PermissionGuard(reflector, { findAccount } as unknown as AppUserTable);

    await expect(guard.canActivate(context({ id: 'u1' }))).rejects.toThrow('No tienes el permiso units.write');
    await expect(guard.canActivate(context({ id: 'u1' }))).rejects.toThrow('inactiva');
    await expect(guard.canActivate(context(undefined))).rejects.toThrow('Falta el token');
  });
});
