import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type RoleDetail, type RoleSummary, RolesApi } from '../../../../core/roles.api';
import { Button, Dialog, SectionHeader, Tag } from '../../../../shared/ui';
import { RemoveRole } from '../remove-role/remove-role';
import { RoleWizard } from '../role-wizard/role-wizard';

@Component({
  selector: 'app-role-list',
  imports: [RouterLink, Button, Dialog, RemoveRole, RoleWizard, SectionHeader, Tag],
  templateUrl: './role-list.html',
  styleUrl: './role-list.scss',
})
export class RoleList {
  private readonly api = inject(RolesApi);

  protected readonly roles = signal<RoleSummary[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly newOpen = signal(false);
  // Detalle del rol en edición (el wizard necesita sus permisos); null = cerrado
  protected readonly editing = signal<RoleDetail | null>(null);
  protected readonly removing = signal<RoleSummary | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected onDialogClose(dialog: 'new' | 'edit' | 'remove'): void {
    if (dialog === 'new') this.newOpen.set(false);
    if (dialog === 'edit') this.editing.set(null);
    if (dialog === 'remove') this.removing.set(null);
    this.load();
  }

  protected openEdit(role: RoleSummary): void {
    this.actionError.set(null);
    this.api.get(role.id).subscribe({ next: (detail) => this.editing.set(detail), error: () => this.actionError.set('No se pudo cargar el rol') });
  }

  private load(): void {
    this.api.list().subscribe({ next: (roles) => this.roles.set(roles), error: () => this.failed.set(true) });
  }
}
