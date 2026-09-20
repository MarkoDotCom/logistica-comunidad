import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../../../core/labels';
import { UsersApi, type UserSummary } from '../../../../core/users.api';
import { Card, type CardAction, Stepper } from '../../../../shared/ui';

// Alta de usuario en tres pasos (card en modo wizard) y tarjeta de resultado. Se muestra dentro de un ui-dialog.
@Component({
  selector: 'app-new-user',
  imports: [ReactiveFormsModule, Card, Stepper],
  templateUrl: './new-user.html',
  styleUrl: '../../wizard.scss',
})
export class NewUser {
  private readonly api = inject(UsersApi);

  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Datos', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly created = signal<UserSummary | null>(null);
  protected readonly resultActions: CardAction[] = [
    { id: 'close', label: 'Cerrar' },
    { id: 'another', label: 'Crear otro', variant: 'ghost' },
  ];

  protected readonly form = inject(NonNullableFormBuilder).group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  // Copia reactiva del formulario: la app es zoneless y la plantilla decide con señales
  protected readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly canAdvance = computed(() => {
    this.value();
    switch (this.step()) {
      case 1:
        return this.form.controls.fullName.valid && this.form.controls.email.valid;
      case 2:
        return !this.saving();
      default:
        return true;
    }
  });

  protected finish(): void {
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.api.create({ email: v.email.trim(), fullName: v.fullName.trim(), phone: v.phone.trim() || undefined }).subscribe({
      next: (created) => {
        this.created.set(created);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, 'No se pudo crear el usuario'));
        this.saving.set(false);
      },
    });
  }

  protected onResult(action: string): void {
    if (action === 'close') {
      this.closed.emit();
      return;
    }
    this.form.reset();
    this.created.set(null);
    this.error.set(null);
    this.step.set(0);
  }
}
