import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import { unitBreadcrumb, unitRoute } from '../../../../core/unit-routes';
import { UnitsApi, type Unit, type UnitDetail } from '../../../../core/units.api';
import { Breadcrumb, SectionHeader } from '../../../../shared/ui';
import { UnitContracts } from '../../units/unit-contracts/unit-contracts';
import { UnitLevel } from '../../units/unit-level/unit-level';

// Un edificio: su ruta, sus departamentos (gestionables) y los contratos sobre él (personal)
@Component({
  selector: 'app-building-detail',
  imports: [Breadcrumb, SectionHeader, UnitContracts, UnitLevel],
  templateUrl: './building-detail.html',
  styleUrl: '../../detail.scss',
})
export class BuildingDetail {
  private readonly api = inject(UnitsApi);

  readonly id = input.required<string>(); // :id del edificio; :communityId solo da forma a la URL

  protected readonly unit = signal<UnitDetail | null>(null);
  protected readonly failed = signal(false);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly unitLabel = unitLabel;
  protected readonly breadcrumb = unitBreadcrumb;
  protected readonly link = (apartment: Unit) => unitRoute(apartment, []);

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
