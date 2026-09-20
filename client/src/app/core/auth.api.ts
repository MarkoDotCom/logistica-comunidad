import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { UserSummary } from './users.api';

// Misma forma que devuelve services/api en /auth
export interface Account extends UserSummary {
  permissions: string[];
}

export interface SessionResponse {
  accessToken: string;
  user: Account;
}

// withCredentials: la cookie httpOnly del refresh token solo viaja a /auth/*
const CREDENTIALS = { withCredentials: true } as const;

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${environment.apiUrl}/auth/login`, { email, password }, CREDENTIALS);
  }

  refresh(): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${environment.apiUrl}/auth/refresh`, {}, CREDENTIALS);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, CREDENTIALS);
  }
}
