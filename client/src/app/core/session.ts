import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { type Account, AuthApi, type SessionResponse } from './auth.api';
import { SECTIONS } from './sections';

// La sesión vive en memoria: el access token nunca se guarda en el navegador. Al recargar la página se recupera
// con la cookie httpOnly del refresh token (restore). Los permisos vienen de la API con la cuenta.
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly api = inject(AuthApi);
  private restoring: Promise<boolean> | null = null;

  readonly user = signal<Account | null>(null);
  readonly token = signal<string | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);

  can(permission: string): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }

  /** Primera sección del menú que la persona puede ver; null si no puede ver ninguna. */
  firstAllowed(): string | null {
    return SECTIONS.find((s) => this.can(s.permission))?.path ?? null;
  }

  async login(email: string, password: string): Promise<void> {
    this.set(await firstValueFrom(this.api.login(email, password)));
  }

  /** Recupera la sesión con la cookie de refresh. Varias llamadas a la vez comparten la misma petición. */
  restore(): Promise<boolean> {
    if (this.isLoggedIn()) return Promise.resolve(true);
    this.restoring ??= firstValueFrom(this.api.refresh())
      .then((r) => {
        this.set(r);
        return true;
      })
      .catch(() => false)
      .finally(() => (this.restoring = null));
    return this.restoring;
  }

  /** Access token nuevo tras un 401; null si la sesión ya no se puede recuperar (y la limpia). */
  async refreshToken(): Promise<string | null> {
    try {
      const r = await firstValueFrom(this.api.refresh());
      this.set(r);
      return r.accessToken;
    } catch {
      this.clear();
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      // la sesión local se limpia igual
    }
    this.clear();
  }

  private set(r: SessionResponse): void {
    this.user.set(r.user);
    this.token.set(r.accessToken);
  }

  private clear(): void {
    this.user.set(null);
    this.token.set(null);
  }
}
