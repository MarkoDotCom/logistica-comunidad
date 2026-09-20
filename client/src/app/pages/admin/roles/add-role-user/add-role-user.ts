import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { apiErrorMessage } from '../../../../core/labels';
import { type RoleDetail, RolesApi } from '../../../../core/roles.api';
import { UsersApi, type UserSummary } from '../../../../core/users.api';
import { Card, type CardAction, Stepper } from '../../../../shared/ui';

// Asigna el rol a una persona existente, buscándola entre los usuarios (Presentación → Persona → Confirmar).
@Component({
  selector: 'app-add-role-user',
  imports: [Card, Stepper],
  templateUrl: './add-role-user.html',
  styleUrl: './add-role-user.scss',
})
export class AddRoleUser {
  private readonly api = inject(RolesApi);
  private readonly usersApi = inject(UsersApi);

  readonly role = input.required<RoleDetail>();
  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Persona', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<RoleDetail | null>(null);
  protected readonly selected = signal<UserSummary | null>(null);
  protected readonly resultActions: CardAction[] = [
    { id: 'another', label: 'Agregar otra', variant: 'ghost' },
    { id: 'close', label: 'Cerrar' },
  ];

  private readonly term$ = new Subject<string>();
  protected readonly results = toSignal(
    this.term$.pipe(
      distinctUntilChanged(),
      switchMap((term) => (term.length >= 2 ? this.usersApi.list(term) : of([] as UserSummary[]))),
    ),
    { initialValue: [] as UserSummary[] },
  );

  protected readonly alreadyHas = computed(() => {
    const u = this.selected();
    return !!u && this.role().users.some((x) => x.id === u.id);
  });

  protected readonly canAdvance = computed(() => {
    switch (this.step()) {
      case 1:
        return this.selected() !== null && !this.alreadyHas();
      case 2:
        return !this.saving();
      default:
        return true;
    }
  });

  protected onSearch(event: Event): void {
    this.term$.next((event.target as HTMLInputElement).value.trim());
  }

  protected finish(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.addUser(this.role().id, this.selected()!.id).subscribe({
      next: (role) => {
        this.saved.set(role);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, 'No se pudo asignar el rol'));
        this.saving.set(false);
      },
    });
  }

  protected onResult(action: string): void {
    if (action === 'close') {
      this.closed.emit();
      return;
    }
    this.saved.set(null);
    this.selected.set(null);
    this.error.set(null);
    this.step.set(0);
  }
}
