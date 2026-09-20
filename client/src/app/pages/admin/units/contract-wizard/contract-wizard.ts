import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, type OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { ContractsApi, type Contract, type CreateContract, type UpdateContract } from '../../../../core/contracts.api';
import { allowedContractTypes, apiErrorMessage, CONTRACT_TYPE_LABELS, UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import type { Unit } from '../../../../core/units.api';
import { type ContractType, UsersApi, type UserSummary } from '../../../../core/users.api';
import { Card, type CardAction, Stepper, Tag } from '../../../../shared/ui';

// Alta o edición de un contrato sobre una unidad, en cuatro pasos (card en modo wizard) y tarjeta de resultado.
// Con `contract` edita; sin él crea. La persona se elige buscando entre los usuarios existentes.
@Component({
  selector: 'app-contract-wizard',
  imports: [ReactiveFormsModule, Card, Stepper, Tag],
  templateUrl: './contract-wizard.html',
  styleUrl: './contract-wizard.scss',
})
export class ContractWizard implements OnInit {
  private readonly api = inject(ContractsApi);
  private readonly usersApi = inject(UsersApi);

  readonly unit = input.required<Unit>();
  readonly contract = input<Contract | null>(null);
  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Persona', 'Datos', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<Contract | null>(null);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly typeLabels = CONTRACT_TYPE_LABELS;
  protected readonly unitLabel = unitLabel;
  protected readonly resultActions: CardAction[] = [{ id: 'close', label: 'Cerrar' }];

  protected readonly isEdit = computed(() => this.contract() !== null);
  protected readonly types = computed<ContractType[]>(() => allowedContractTypes(this.unit().kind));

  // Búsqueda de personas: el término va a un Subject y cada cambio cancela la búsqueda anterior
  private readonly term$ = new Subject<string>();
  protected readonly results = toSignal(
    this.term$.pipe(
      distinctUntilChanged(),
      switchMap((term) => (term.length >= 2 ? this.usersApi.list(term) : of([] as UserSummary[]))),
    ),
    { initialValue: [] as UserSummary[] },
  );
  protected readonly selected = signal<{ id: string; fullName: string; email: string } | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    type: ['' as ContractType | '', Validators.required],
    startsAt: ['', Validators.required],
    endsAt: [''],
    documentUrl: ['', Validators.maxLength(500)],
    notes: ['', Validators.maxLength(2000)],
  });

  protected readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  // Etiqueta del tipo elegido, o '—' mientras no haya
  protected readonly typeLabel = computed(() => {
    const t = this.value().type;
    return t ? CONTRACT_TYPE_LABELS[t] : '—';
  });

  protected readonly datesOk = computed(() => {
    const v = this.value();
    return !!v.startsAt && (!v.endsAt || v.endsAt >= v.startsAt);
  });

  protected readonly canAdvance = computed(() => {
    this.value();
    switch (this.step()) {
      case 0:
        return this.types().length > 0;
      case 1:
        return this.selected() !== null;
      case 2:
        return this.form.controls.type.valid && this.datesOk() && this.form.controls.documentUrl.valid && this.form.controls.notes.valid;
      case 3:
        return !this.saving();
      default:
        return true;
    }
  });

  ngOnInit(): void {
    const c = this.contract();
    if (c) {
      this.selected.set(c.user);
      this.form.setValue({ type: c.type, startsAt: c.startsAt, endsAt: c.endsAt ?? '', documentUrl: c.documentUrl ?? '', notes: c.notes ?? '' });
    } else {
      this.form.controls.type.setValue(this.types()[0] ?? '');
    }
  }

  protected onSearch(event: Event): void {
    this.term$.next((event.target as HTMLInputElement).value.trim());
  }

  protected select(user: UserSummary): void {
    this.selected.set({ id: user.id, fullName: user.fullName, email: user.email });
  }

  /** Cuerpo del PATCH: solo lo que cambió respecto al contrato original. */
  protected patch(): UpdateContract {
    const c = this.contract()!;
    const v = this.form.getRawValue();
    const patch: UpdateContract = {};
    if (this.selected()!.id !== c.user.id) patch.userId = this.selected()!.id;
    if (v.type !== c.type) patch.type = v.type as ContractType;
    if (v.startsAt !== c.startsAt) patch.startsAt = v.startsAt;
    if ((v.endsAt || null) !== c.endsAt) patch.endsAt = v.endsAt || null;
    if ((v.documentUrl.trim() || null) !== c.documentUrl) patch.documentUrl = v.documentUrl.trim() || null;
    if ((v.notes.trim() || null) !== c.notes) patch.notes = v.notes.trim() || null;
    return patch;
  }

  protected finish(): void {
    const v = this.form.getRawValue();
    const c = this.contract();
    this.saving.set(true);
    this.error.set(null);
    const request = c
      ? this.api.update(c.id, this.patch())
      : this.api.create(this.unit().id, {
          userId: this.selected()!.id,
          type: v.type as ContractType,
          startsAt: v.startsAt,
          endsAt: v.endsAt || null,
          documentUrl: v.documentUrl.trim() || undefined,
          notes: v.notes.trim() || undefined,
        } satisfies CreateContract);
    request.subscribe({
      next: (saved) => {
        this.saved.set(saved);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, c ? 'No se pudo guardar el contrato' : 'No se pudo crear el contrato'));
        this.saving.set(false);
      },
    });
  }
}
