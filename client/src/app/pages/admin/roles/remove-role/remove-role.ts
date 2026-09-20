import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { apiErrorMessage } from '../../../../core/labels';
import { type RoleSummary, RolesApi } from '../../../../core/roles.api';
import { Card, type CardAction, Stepper } from '../../../../shared/ui';

// Borrado lógico de un rol en dos pasos (Finalizar en danger). Las personas que lo tenían lo pierden.
@Component({
  selector: 'app-remove-role',
  imports: [Card, Stepper],
  templateUrl: './remove-role.html',
  styleUrl: '../../wizard.scss',
})
export class RemoveRole {
  private readonly api = inject(RolesApi);

  readonly role = input.required<RoleSummary>();
  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly resultActions: CardAction[] = [{ id: 'close', label: 'Cerrar' }];
  protected readonly canAdvance = computed(() => !this.saving());

  protected finish(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.remove(this.role().id).subscribe({
      next: () => {
        this.done.set(true);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, 'No se pudo eliminar el rol'));
        this.saving.set(false);
      },
    });
  }
}
