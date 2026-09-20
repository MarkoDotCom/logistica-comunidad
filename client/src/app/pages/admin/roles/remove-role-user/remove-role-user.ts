import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { apiErrorMessage } from '../../../../core/labels';
import { type RoleDetail, RolesApi } from '../../../../core/roles.api';
import { Card, type CardAction, Stepper } from '../../../../shared/ui';

// Quita el rol a una persona (Presentación → Confirmar, Finalizar en danger).
@Component({
  selector: 'app-remove-role-user',
  imports: [Card, Stepper],
  templateUrl: './remove-role-user.html',
  styleUrl: '../../wizard.scss',
})
export class RemoveRoleUser {
  private readonly api = inject(RolesApi);

  readonly role = input.required<RoleDetail>();
  readonly user = input.required<{ id: string; fullName: string; email: string }>();
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
    this.api.removeUser(this.role().id, this.user().id).subscribe({
      next: () => {
        this.done.set(true);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, 'No se pudo quitar el rol'));
        this.saving.set(false);
      },
    });
  }
}
