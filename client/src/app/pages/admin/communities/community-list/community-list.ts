import { Component } from '@angular/core';
import type { Unit } from '../../../../core/units.api';
import { unitRoute } from '../../../../core/unit-routes';
import { SectionHeader } from '../../../../shared/ui';
import { UnitLevel } from '../../units/unit-level/unit-level';

@Component({
  selector: 'app-community-list',
  imports: [SectionHeader, UnitLevel],
  template: `
    <main class="page">
      <ui-section-header heading="Comunidades" subtitle="Cada comunidad es la raíz de su árbol de edificios, departamentos y cuentas" />
      <app-unit-level [parent]="null" childKind="community" [linkFor]="link" />
    </main>
  `,
})
export class CommunityList {
  protected readonly link = (unit: Unit) => unitRoute(unit, []);
}
