import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, type OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage, groupPermissions, permissionLabel } from '../../../../core/labels';
import { type CreateRole, type Permission, type RoleDetail, RolesApi, type UpdateRole } from '../../../../core/roles.api';
import { Card, type CardAction, Stepper, Tag } from '../../../../shared/ui';

// Alta o edición de un rol en cuatro pasos (card en modo wizard) y tarjeta de resultado. Con `role` edita; sin él crea.
// Los permisos se eligen del catálogo, agrupados por recurso. Un rol del sistema no cambia de nombre.
@Component({
  selector: 'app-role-wizard',
  imports: [ReactiveFormsModule, Card, Stepper, Tag],
  templateUrl: './role-wizard.html',
  styleUrl: './role-wizard.scss',
})
export class RoleWizard implements OnInit {
  private readonly api = inject(RolesApi);

  readonly role = input<RoleDetail | null>(null);
  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Datos', 'Permisos', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<RoleDetail | null>(null);
  protected readonly catalog = signal<Permission[] | null>(null);
  protected readonly catalogFailed = signal(false);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly permissionLabel = permissionLabel;
  protected readonly resultActions: CardAction[] = [{ id: 'close', label: 'Cerrar' }];

  protected readonly isEdit = computed(() => this.role() !== null);
  protected readonly groups = computed(() => groupPermissions(this.catalog() ?? []));

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    description: ['', Validators.maxLength(500)],
  });

  protected readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly canAdvance = computed(() => {
    this.value();
    this.selected();
    switch (this.step()) {
      case 1:
        return this.form.valid;
      case 2:
        return this.catalog() !== null;
      case 3:
        return !this.saving() && (!this.isEdit() || Object.keys(this.patch()).length > 0);
      default:
        return true;
    }
  });

  ngOnInit(): void {
    const r = this.role();
    if (r) {
      this.form.setValue({ name: r.name, description: r.description ?? '' });
      this.selected.set(new Set(r.permissions));
      if (r.isSystem) this.form.controls.name.disable();
    }
    this.api.permissions().subscribe({ next: (p) => this.catalog.set(p), error: () => this.catalogFailed.set(true) });
  }

  protected has(key: string): boolean {
    return this.selected().has(key);
  }

  protected toggle(key: string, checked: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  protected onToggle(key: string, event: Event): void {
    this.toggle(key, (event.target as HTMLInputElement).checked);
  }

  protected selectedKeys(): string[] {
    return [...this.selected()].sort();
  }

  /** Cuerpo del PATCH: solo lo que cambió respecto al rol original. */
  protected patch(): UpdateRole {
    const r = this.role()!;
    const v = this.form.getRawValue();
    const patch: UpdateRole = {};
    if (!r.isSystem && v.name.trim() !== r.name) patch.name = v.name.trim();
    if ((v.description.trim() || null) !== r.description) patch.description = v.description.trim() || null;
    const keys = this.selectedKeys();
    if (keys.join(',') !== [...r.permissions].sort().join(',')) patch.permissions = keys;
    return patch;
  }

  protected finish(): void {
    const v = this.form.getRawValue();
    const r = this.role();
    this.saving.set(true);
    this.error.set(null);
    const request = r
      ? this.api.update(r.id, this.patch())
      : this.api.create({ name: v.name.trim(), description: v.description.trim() || undefined, permissions: this.selectedKeys() } satisfies CreateRole);
    request.subscribe({
      next: (saved) => {
        this.saved.set(saved);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, r ? 'No se pudo guardar el rol' : 'No se pudo crear el rol'));
        this.saving.set(false);
      },
    });
  }
}
