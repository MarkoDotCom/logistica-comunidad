import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { contractStatus, UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import { unitBreadcrumb } from '../../../../core/unit-routes';
import { UnitsApi, type UnitDetail } from '../../../../core/units.api';
import { Breadcrumb, SectionHeader, Tag } from '../../../../shared/ui';
import { UnitContracts } from '../../units/unit-contracts/unit-contracts';
import { UnitLevel } from '../../units/unit-level/unit-level';

// Detalle completo de un departamento: ruta, datos, quién lo ocupa hoy, sus cuentas de cobro y todos sus contratos
@Component({
  selector: 'app-apartment-detail',
  imports: [DatePipe, Breadcrumb, SectionHeader, Tag, UnitContracts, UnitLevel],
  templateUrl: './apartment-detail.html',
  styleUrl: '../../detail.scss',
})
export class ApartmentDetail {
  private readonly api = inject(UnitsApi);

  readonly id = input.required<string>();

  protected readonly unit = signal<UnitDetail | null>(null);
  protected readonly failed = signal(false);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly unitLabel = unitLabel;
  protected readonly breadcrumb = unitBreadcrumb;

  // Quién tiene contrato vigente hoy, por tipo
  protected readonly current = computed(() => (this.unit()?.contracts ?? []).filter((c) => contractStatus(c) === 'current'));
  protected readonly owners = computed(() => this.current().filter((c) => c.type === 'ownership'));
  protected readonly tenants = computed(() => this.current().filter((c) => c.type === 'lease'));

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  /** Tras crear o modificar un contrato: vuelve a pedir el detalle. */
  protected reload(): void {
    this.load(this.id());
  }

  private load(id: string): void {
    this.unit.set(null);
    this.failed.set(false);
    this.api.detail(id).subscribe({ next: (u) => this.unit.set(u), error: () => this.failed.set(true) });
  }
}
