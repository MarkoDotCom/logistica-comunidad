import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ContractType } from './users.api';

// Misma forma que devuelve services/api en /contracts y en /units/:id/detail
export interface Contract {
  id: string;
  unitId: string;
  type: ContractType;
  startsAt: string; // YYYY-MM-DD
  endsAt: string | null;
  documentUrl: string | null;
  notes: string | null;
  user: { id: string; fullName: string; email: string };
}

// POST /units/:unitId/contracts
export interface CreateContract {
  userId: string;
  type: ContractType;
  startsAt: string;
  endsAt?: string | null;
  documentUrl?: string;
  notes?: string;
}

// PATCH /contracts/:id: solo lo que cambia; null borra el término, el documento o las notas
export interface UpdateContract {
  userId?: string;
  type?: ContractType;
  startsAt?: string;
  endsAt?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ContractsApi {
  private readonly http = inject(HttpClient);

  create(unitId: string, contract: CreateContract): Observable<Contract> {
    return this.http.post<Contract>(`${environment.apiUrl}/units/${unitId}/contracts`, contract);
  }

  update(id: string, contract: UpdateContract): Observable<Contract> {
    return this.http.patch<Contract>(`${environment.apiUrl}/contracts/${id}`, contract);
  }
}
