import { Component, inject } from '@angular/core';
import { Session } from '../../../core/session';
import { SectionHeader } from '../../../shared/ui';

@Component({
  selector: 'app-no-access',
  imports: [SectionHeader],
  template: `
    <main class="page page--narrow">
      <ui-section-header heading="Sin acceso" [subtitle]="'Hola, ' + (session.user()?.fullName ?? '') + '. Tu cuenta no tiene permisos para ver ninguna sección.'" />
      <p class="ui-muted">Pide a una persona administradora que te asigne un rol con permisos.</p>
    </main>
  `,
})
export class NoAccess {
  protected readonly session = inject(Session);
}
