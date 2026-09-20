import { Injectable } from '@nestjs/common';
import type { unit_kind } from '../../database/generated/enums.js';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { ContractTable } from '../../database/tables/contract.table.js';
import { UnitTable } from '../../database/tables/unit.table.js';

export const ENDING_SOON_DAYS = 30;

// Métricas del inicio del dashboard
export interface Summary {
  units: Record<unit_kind, number>;
  users: { total: number; active: number };
  contracts: { current: number; endingSoon: number }; // endingSoon: vigentes que terminan en ENDING_SOON_DAYS días
}

@Injectable()
export class SummaryService {
  constructor(
    private readonly units: UnitTable,
    private readonly users: AppUserTable,
    private readonly contracts: ContractTable,
  ) {}

  async get(): Promise<Summary> {
    const [units, users, contracts] = await Promise.all([this.units.countByKind(), this.users.countByActive(), this.contracts.countCurrent(ENDING_SOON_DAYS)]);
    return { units, users, contracts };
  }
}
