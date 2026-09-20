import { Component, computed, input, output, signal } from '@angular/core';
import type { Contract } from '../../../../core/contracts.api';
import { allowedContractTypes, CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS, contractStatus } from '../../../../core/labels';
import type { Unit } from '../../../../core/units.api';
import { Button, Dialog, Tag } from '../../../../shared/ui';
import { ContractWizard } from '../contract-wizard/contract-wizard';

// Tabla de los contratos de una unidad con la persona de cada uno y su estado, con alta y edición en wizard.
// No carga datos: los recibe del detalle y avisa con `changed` para que la página recargue.
@Component({
  selector: 'app-unit-contracts',
  imports: [Button, ContractWizard, Dialog, Tag],
  templateUrl: './unit-contracts.html',
  styleUrl: './unit-contracts.scss',
})
export class UnitContracts {
  readonly unit = input.required<Unit>();
  readonly contracts = input.required<Contract[]>();
  readonly changed = output<void>();

  protected readonly newOpen = signal(false);
  protected readonly editing = signal<Contract | null>(null);
  protected readonly typeLabels = CONTRACT_TYPE_LABELS;
  protected readonly statusLabels = CONTRACT_STATUS_LABELS;
  protected readonly status = contractStatus;
  // Sin tipos posibles (cuentas) o con la unidad eliminada no se ofrece crear
  protected readonly canCreate = computed(() => allowedContractTypes(this.unit().kind).length > 0 && !this.unit().deletedAt);

  protected onDialogClose(): void {
    this.newOpen.set(false);
    this.editing.set(null);
    this.changed.emit();
  }
}
