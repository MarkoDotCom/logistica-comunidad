import { Component, computed, inject, signal } from '@angular/core';
import { UsersApi, type UserSummary } from '../../../../core/users.api';
import { Button, Dialog, SectionHeader, Tag } from '../../../../shared/ui';
import { EditUser } from '../edit-user/edit-user';
import { NewUser } from '../new-user/new-user';

@Component({
  selector: 'app-user-list',
  imports: [Button, Dialog, EditUser, NewUser, SectionHeader, Tag],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  private readonly api = inject(UsersApi);

  protected readonly users = signal<UserSummary[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly query = signal('');
  protected readonly newUserOpen = signal(false);
  // id del usuario en edición; null = diálogo cerrado
  protected readonly editingId = signal<string | null>(null);

  // Filtro local por nombre o email: la lista completa ya está cargada
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const users = this.users();
    if (!users || !q) return users;
    return users.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  });

  constructor() {
    this.load();
  }

  // Al cerrar un diálogo se recarga: el usuario nuevo o modificado aparece en la tabla
  protected onNewUserOpenChange(open: boolean): void {
    if (!open) this.load();
  }

  protected onEditOpenChange(open: boolean): void {
    if (!open) {
      this.editingId.set(null);
      this.load();
    }
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  private load(): void {
    this.api.list().subscribe({ next: (users) => this.users.set(users), error: () => this.failed.set(true) });
  }
}
