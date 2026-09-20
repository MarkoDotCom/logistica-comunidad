import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ContractType } from './users.api';

// Misma forma que devuelve services/api en /units
export type UnitKind = 'community' | 'building' | 'apartment' | 'account';
export const UNIT_KINDS: UnitKind[] = ['community', 'building', 'apartment', 'account'];

export interface Unit {
  id: string;
  parentId: string | null;
  kind: UnitKind;
  code: string;
  name: string | null;
  deletedAt: string | null; // ISO 8601; null = viva
}

// GET /units?parentId=: cada fila con cuántos hijos vivos tiene
export interface UnitSummary extends Unit {
  childrenCount: number;
}

// GET /units/:id/tree (con ?includeDeleted=true también las eliminadas)
export interface UnitNode extends Unit {
  children: UnitNode[];
}

export interface UnitContract {
  id: string;
  type: ContractType;
  startsAt: string; // YYYY-MM-DD
  endsAt: string | null;
  user: { id: string; fullName: string; email: string };
}

// GET /units/:id/detail: la unidad, su ruta hasta la raíz, sus hijos vivos y sus contratos con persona
export interface UnitDetail extends Unit {
  ancestors: Unit[]; // de la raíz al padre directo
  children: UnitSummary[];
  contracts: UnitContract[];
}

export interface CreateUnit {
  parentId?: string;
  kind: UnitKind;
  code: string;
  name?: string;
}

// PATCH /units/:id: solo lo que cambia; cambiar parentId mueve la unidad con su subárbol
export interface UpdateUnit {
  parentId?: string;
  kind?: UnitKind;
  code?: string;
  name?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UnitsApi {
  private readonly http = inject(HttpClient);

  /** Sin parentId, las comunidades raíz; con él, los hijos directos. Solo vivas salvo includeDeleted. */
  children(parentId?: string, includeDeleted = false): Observable<UnitSummary[]> {
    let params = new HttpParams();
    if (parentId) params = params.set('parentId', parentId);
    if (includeDeleted) params = params.set('includeDeleted', 'true');
    return this.http.get<UnitSummary[]>(`${environment.apiUrl}/units`, { params });
  }

  detail(id: string): Observable<UnitDetail> {
    return this.http.get<UnitDetail>(`${environment.apiUrl}/units/${id}/detail`);
  }

  tree(id: string, includeDeleted = false): Observable<UnitNode> {
    const params = includeDeleted ? new HttpParams().set('includeDeleted', 'true') : undefined;
    return this.http.get<UnitNode>(`${environment.apiUrl}/units/${id}/tree`, { params });
  }

  create(unit: CreateUnit): Observable<Unit> {
    return this.http.post<Unit>(`${environment.apiUrl}/units`, unit);
  }

  update(id: string, unit: UpdateUnit): Observable<Unit> {
    return this.http.patch<Unit>(`${environment.apiUrl}/units/${id}`, unit);
  }

  /** Borrado lógico de la unidad y su subárbol. Devuelve cuántas se eliminaron. */
  remove(id: string): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${environment.apiUrl}/units/${id}`);
  }

  restore(id: string): Observable<Unit> {
    return this.http.post<Unit>(`${environment.apiUrl}/units/${id}/restore`, {});
  }
}
