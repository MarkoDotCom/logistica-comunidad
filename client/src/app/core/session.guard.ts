import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { Session } from './session';

/** Exige sesión; intenta recuperarla con la cookie antes de mandar al login (con returnUrl). */
export const sessionGuard: CanActivateFn = async (_route, state) => {
  const session = inject(Session);
  const router = inject(Router);
  if (session.isLoggedIn() || (await session.restore())) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Exige un permiso; sin él, va a la primera sección permitida o a "Sin acceso". */
export function permissionGuard(permission: string): CanActivateFn {
  return () => {
    const session = inject(Session);
    const router = inject(Router);
    if (session.can(permission)) return true;
    return router.createUrlTree([session.firstAllowed() ?? '/admin/sin-acceso']);
  };
}
