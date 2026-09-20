import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Misma forma que devuelve services/api en /units
export type UnitKind = 'community' | 'building' | 'apartment' | 'account';
export const UNIT_KINDS: UnitKind[] = ['community', 'building', 'apartment', 'account'];

export interface Unit {
  id: string;
  parentId: string | null;
  kind: UnitKind;
  code: string;
  name: string | null;
  isActive: boolean;
}

// GET /units/:id/tree
export interface UnitNode extends Unit {
  children: UnitNode[];
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
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UnitsApi {
  private readonly http = inject(HttpClient);

  /** Sin parentId, las comunidades raíz; con él, los hijos directos. */
  children(parentId?: string): Observable<Unit[]> {
    const params = parentId ? new HttpParams().set('parentId', parentId) : undefined;
    return this.http.get<Unit[]>(`${environment.apiUrl}/units`, { params });
  }

  tree(id: string): Observable<UnitNode> {
    return this.http.get<UnitNode>(`${environment.apiUrl}/units/${id}/tree`);
  }

  create(unit: CreateUnit): Observable<Unit> {
    return this.http.post<Unit>(`${environment.apiUrl}/units`, unit);
  }

  update(id: string, unit: UpdateUnit): Observable<Unit> {
    return this.http.patch<Unit>(`${environment.apiUrl}/units/${id}`, unit);
  }
}
