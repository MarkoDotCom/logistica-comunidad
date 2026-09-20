import { Component, input } from '@angular/core';
import { CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS, contractStatus } from '../../../../core/labels';
import type { UnitContract } from '../../../../core/units.api';
import { Tag } from '../../../../shared/ui';

// Tabla de los contratos de una unidad con la persona de cada uno y su estado (vigente, vencido, futuro)
@Component({
  selector: 'app-unit-contracts',
  imports: [Tag],
  templateUrl: './unit-contracts.html',
})
export class UnitContracts {
  readonly contracts = input.required<UnitContract[]>();

  protected readonly typeLabels = CONTRACT_TYPE_LABELS;
  protected readonly statusLabels = CONTRACT_STATUS_LABELS;
  protected readonly status = contractStatus;
}
