import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Misma forma que devuelve services/api en /permissions y /roles
export interface Permission {
  key: string; // 'units.write'
  resource: string;
  action: string;
  description: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean; // no se elimina ni renombra
  permissionCount: number;
  userCount: number;
}

export interface RoleDetail extends RoleSummary {
  permissions: string[];
  users: { id: string; fullName: string; email: string }[];
}

export interface CreateRole {
  name: string;
  description?: string;
  permissions: string[];
}

// PATCH /roles/:id: solo lo que cambia; permissions reemplaza el conjunto; null borra la descripción
export interface UpdateRole {
  name?: string;
  description?: string | null;
  permissions?: string[];
}

@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly http = inject(HttpClient);

  permissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${environment.apiUrl}/permissions`);
  }

  list(): Observable<RoleSummary[]> {
    return this.http.get<RoleSummary[]>(`${environment.apiUrl}/roles`);
  }

  get(id: string): Observable<RoleDetail> {
    return this.http.get<RoleDetail>(`${environment.apiUrl}/roles/${id}`);
  }

  create(role: CreateRole): Observable<RoleDetail> {
    return this.http.post<RoleDetail>(`${environment.apiUrl}/roles`, role);
  }

  update(id: string, role: UpdateRole): Observable<RoleDetail> {
    return this.http.patch<RoleDetail>(`${environment.apiUrl}/roles/${id}`, role);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/roles/${id}`);
  }

  addUser(roleId: string, userId: string): Observable<RoleDetail> {
    return this.http.put<RoleDetail>(`${environment.apiUrl}/roles/${roleId}/users/${userId}`, {});
  }

  removeUser(roleId: string, userId: string): Observable<RoleDetail> {
    return this.http.delete<RoleDetail>(`${environment.apiUrl}/roles/${roleId}/users/${userId}`);
  }
}
