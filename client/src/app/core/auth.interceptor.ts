import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Session } from './session';

// Añade el access token a cada petición a la API. Ante un 401, intenta un refresh una vez y repite la petición;
// si el refresh también falla, la sesión se limpia y se va al login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(Session);
  const router = inject(Router);
  if (req.url.includes('/auth/')) return next(req);

  return next(withToken(req, session.token())).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);
      return from(session.refreshToken()).pipe(
        switchMap((token) => {
          if (token) return next(withToken(req, token));
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => error);
        }),
      );
    }),
  );
};

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
