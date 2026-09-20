import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, type OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage, CONTRACT_TYPE_LABELS, unitLabel } from '../../../../core/labels';
import { type RoleSummary, RolesApi } from '../../../../core/roles.api';
import { UsersApi, type UpdateUser, type UserDetail } from '../../../../core/users.api';
import { Card, type CardAction, Stepper, Tag } from '../../../../shared/ui';

// Edición de usuario (card en modo wizard) y tarjeta de resultado. Se muestra dentro de un ui-dialog.
// Los contratos se muestran en la presentación pero no se editan aquí; los roles sí, en su propio paso.
@Component({
  selector: 'app-edit-user',
  imports: [ReactiveFormsModule, Card, Stepper, Tag],
  templateUrl: './edit-user.html',
  styleUrl: '../../wizard.scss',
})
export class EditUser implements OnInit {
  private readonly api = inject(UsersApi);
  private readonly rolesApi = inject(RolesApi);

  readonly userId = input.required<string>();
  readonly closed = output<void>();

  protected readonly user = signal<UserDetail | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly steps = ['Presentación', 'Datos', 'Roles', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly updated = signal<UserDetail | null>(null);
  protected readonly roles = signal<RoleSummary[] | null>(null);
  protected readonly rolesFailed = signal(false);
  protected readonly selectedRoles = signal<Set<string>>(new Set());
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
    this.selectedRoles();
    switch (this.step()) {
      case 1:
        return this.form.controls.fullName.valid && this.form.controls.email.valid;
      case 2:
        return this.roles() !== null;
      case 3:
        return !this.saving() && this.hasChanges(); // Finalizar solo si hay un cambio real
      default:
        return true;
    }
  });

  ngOnInit(): void {
    this.api.get(this.userId()).subscribe({
      next: (user) => {
        this.user.set(user);
        this.form.patchValue({ fullName: user.fullName, email: user.email, phone: user.phone ?? '', isActive: user.isActive });
        this.selectedRoles.set(new Set(user.roles.map((r) => r.id)));
      },
      error: () => this.loadFailed.set(true),
    });
    this.rolesApi.list().subscribe({ next: (roles) => this.roles.set(roles), error: () => this.rolesFailed.set(true) });
  }

  protected hasRole(id: string): boolean {
    return this.selectedRoles().has(id);
  }

  protected onToggleRole(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedRoles.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected selectedRoleNames(): string[] {
    return (this.roles() ?? []).filter((r) => this.selectedRoles().has(r.id)).map((r) => r.name);
  }

  private rolesChanged(): boolean {
    const u = this.user();
    if (!u) return false;
    const current = u.roles.map((r) => r.id).sort().join(',');
    return [...this.selectedRoles()].sort().join(',') !== current;
  }

  protected hasChanges(): boolean {
    const u = this.user();
    const v = this.form.getRawValue();
    return !!u && (v.fullName.trim() !== u.fullName || v.email.trim() !== u.email || (v.phone.trim() || null) !== u.phone || v.isActive !== u.isActive || this.rolesChanged());
  }

  protected finish(): void {
    const v = this.form.getRawValue();
    const patch: UpdateUser = { fullName: v.fullName.trim(), email: v.email.trim(), phone: v.phone.trim() || null, isActive: v.isActive };
    if (this.rolesChanged()) patch.roleIds = [...this.selectedRoles()];

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
