import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, type OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage, CONTRACT_TYPE_LABELS, unitLabel } from '../../../../core/labels';
import { UsersApi, type UpdateUser, type UserDetail } from '../../../../core/users.api';
import { Card, type CardAction, Stepper, Tag } from '../../../../shared/ui';

// Edición de usuario (card en modo wizard) y tarjeta de resultado. Se muestra dentro de un ui-dialog.
// Los contratos se muestran en la presentación pero no se editan aquí.
@Component({
  selector: 'app-edit-user',
  imports: [ReactiveFormsModule, Card, Stepper, Tag],
  templateUrl: './edit-user.html',
  styleUrl: '../../wizard.scss',
})
export class EditUser implements OnInit {
  private readonly api = inject(UsersApi);

  readonly userId = input.required<string>();
  readonly closed = output<void>();

  protected readonly user = signal<UserDetail | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly steps = ['Presentación', 'Datos', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly updated = signal<UserDetail | null>(null);
  protected readonly contractLabels = CONTRACT_TYPE_LABELS;
  protected readonly unitLabel = unitLabel;
  protected readonly resultActions: CardAction[] = [{ id: 'close', label: 'Cerrar' }];

  protected readonly form = inject(NonNullableFormBuilder).group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    isActive: [true],
  });

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

  ngOnInit(): void {
    this.api.get(this.userId()).subscribe({
      next: (user) => {
        this.user.set(user);
        this.form.patchValue({ fullName: user.fullName, email: user.email, phone: user.phone ?? '', isActive: user.isActive });
      },
      error: () => this.loadFailed.set(true),
    });
  }

  protected finish(): void {
    const v = this.form.getRawValue();
    const patch: UpdateUser = { fullName: v.fullName.trim(), email: v.email.trim(), phone: v.phone.trim() || null, isActive: v.isActive };

    this.saving.set(true);
    this.error.set(null);
    this.api.update(this.userId(), patch).subscribe({
      next: (user) => {
        this.updated.set(user);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, 'No se pudo guardar el usuario'));
        this.saving.set(false);
      },
    });
  }
}
