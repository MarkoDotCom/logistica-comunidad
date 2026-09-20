import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import { unitBreadcrumb, unitRoute } from '../../../../core/unit-routes';
import { UnitsApi, type Unit, type UnitDetail } from '../../../../core/units.api';
import { Breadcrumb, SectionHeader } from '../../../../shared/ui';
import { UnitContracts } from '../../units/unit-contracts/unit-contracts';
import { UnitLevel } from '../../units/unit-level/unit-level';

// Una comunidad: su ruta, sus edificios (gestionables) y los contratos sobre ella (administración, personal)
@Component({
  selector: 'app-community-detail',
  imports: [Breadcrumb, SectionHeader, UnitContracts, UnitLevel],
  templateUrl: './community-detail.html',
  styleUrl: '../../detail.scss',
})
export class CommunityDetail {
  private readonly api = inject(UnitsApi);

  readonly id = input.required<string>(); // :id de la ruta

  protected readonly unit = signal<UnitDetail | null>(null);
  protected readonly failed = signal(false);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly unitLabel = unitLabel;
  protected readonly breadcrumb = unitBreadcrumb;
  protected readonly link = (building: Unit) => unitRoute(building, this.unit() ? [this.unit()!] : []);

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
