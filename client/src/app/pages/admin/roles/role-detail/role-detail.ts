import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { permissionLabel } from '../../../../core/labels';
import { type RoleDetail as RoleDetailData, RolesApi } from '../../../../core/roles.api';
import { Session } from '../../../../core/session';
import { Breadcrumb, type BreadcrumbItem, Button, Dialog, SectionHeader, Tag } from '../../../../shared/ui';
import { AddRoleUser } from '../add-role-user/add-role-user';
import { RemoveRoleUser } from '../remove-role-user/remove-role-user';
import { RoleWizard } from '../role-wizard/role-wizard';

type RoleUser = RoleDetailData['users'][number];

// Un rol: sus permisos y las personas que lo tienen, con agregar y quitar en wizards.
@Component({
  selector: 'app-role-detail',
  imports: [AddRoleUser, Breadcrumb, Button, Dialog, RemoveRoleUser, RoleWizard, SectionHeader, Tag],
  templateUrl: './role-detail.html',
  styleUrl: '../../detail.scss',
})
export class RoleDetail {
  private readonly api = inject(RolesApi);
  private readonly session = inject(Session);

  protected readonly canWrite = this.session.can('roles.write');
  readonly id = input.required<string>();

  protected readonly role = signal<RoleDetailData | null>(null);
  protected readonly failed = signal(false);
  protected readonly editOpen = signal(false);
  protected readonly addOpen = signal(false);
  protected readonly removingUser = signal<RoleUser | null>(null);
  protected readonly permissionLabel = permissionLabel;
  protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [{ label: 'Roles', link: ['/admin/roles'] }, { label: this.role()?.name ?? '' }]);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  protected onDialogClose(): void {
    this.editOpen.set(false);
    this.addOpen.set(false);
    this.removingUser.set(null);
    this.load(this.id());
  }

  private load(id: string): void {
    this.failed.set(false);
    this.api.get(id).subscribe({ next: (r) => this.role.set(r), error: () => this.failed.set(true) });
  }
}
