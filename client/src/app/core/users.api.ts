import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { UnitKind } from './units.api';

// Misma forma que devuelve services/api en /users
export type ContractType = 'ownership' | 'lease' | 'administration' | 'employment';
export const CONTRACT_TYPES: ContractType[] = ['ownership', 'lease', 'administration', 'employment'];

export interface UserSummary {
  id: string;
  email: string;
  externalAuthId: string | null;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  roles: { id: string; name: string }[];
}

export interface UserContract {
  id: string;
  type: ContractType;
  startsAt: string; // YYYY-MM-DD
  endsAt: string | null;
  unit: { id: string; kind: UnitKind; code: string; name: string | null };
}

// GET /users/:id: el resumen más sus contratos
export interface UserDetail extends UserSummary {
  contracts: UserContract[];
}

export interface CreateUser {
  email: string;
  fullName: string;
  phone?: string;
}

// PATCH /users/:id: solo lo que cambia; null borra el teléfono; roleIds reemplaza sus roles
export interface UpdateUser {
  email?: string;
  fullName?: string;
  phone?: string | null;
  isActive?: boolean;
  roleIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  list(search?: string): Observable<UserSummary[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<UserSummary[]>(`${environment.apiUrl}/users`, { params });
  }

  get(id: string): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${environment.apiUrl}/users/${id}`);
  }

  create(user: CreateUser): Observable<UserSummary> {
    return this.http.post<UserSummary>(`${environment.apiUrl}/users`, user);
  }

  update(id: string, user: UpdateUser): Observable<UserDetail> {
    return this.http.patch<UserDetail>(`${environment.apiUrl}/users/${id}`, user);
  }
}
