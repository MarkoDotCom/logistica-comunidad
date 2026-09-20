import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { UnitKind } from './units.api';

// GET /summary: métricas del inicio del dashboard
export interface Summary {
  units: Record<UnitKind, number>;
  users: { total: number; active: number };
  contracts: { current: number; endingSoon: number };
}

@Injectable({ providedIn: 'root' })
export class SummaryApi {
  private readonly http = inject(HttpClient);

  get(): Observable<Summary> {
    return this.http.get<Summary>(`${environment.apiUrl}/summary`);
  }
}
