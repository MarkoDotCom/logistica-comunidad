// Sesión falsa para los specs de páginas: una persona con los permisos indicados, sin HTTP.
import { computed, type Provider, signal } from '@angular/core';
import type { Account } from './auth.api';
import { SECTIONS } from './sections';
import { Session } from './session';

export const ALL_PERMISSIONS = ['summary.read', 'units.read', 'units.write', 'units.delete', 'contracts.read', 'contracts.write', 'users.read', 'users.write', 'roles.read', 'roles.write'];

export function fakeSession(permissions: string[], overrides: Partial<Account> = {}): Session {
  const account: Account = {
    id: 'u1', email: 'admin@losalamos.example.com', externalAuthId: null, fullName: 'Marcela Soto', phone: null, isActive: true,
    roles: [{ id: 'r1', name: 'admin' }], permissions, ...overrides,
  };
  const user = signal<Account | null>(account);
  const session = {
    user,
    token: signal<string | null>('token'),
    isLoggedIn: computed(() => user() !== null),
    can: (p: string) => user()?.permissions.includes(p) ?? false,
    firstAllowed: () => SECTIONS.find((s) => permissions.includes(s.permission))?.path ?? null,
    // Sin vi.fn(): este archivo entra en la compilación de la app. Los specs espían con vi.spyOn(session, 'login').
    login: async () => undefined,
    restore: async () => true,
    refreshToken: async () => 'token',
    logout: async () => user.set(null),
  };
  return session as unknown as Session;
}

export function provideSessionWith(permissions: string[], overrides: Partial<Account> = {}): Provider {
  return { provide: Session, useValue: fakeSession(permissions, overrides) };
}
