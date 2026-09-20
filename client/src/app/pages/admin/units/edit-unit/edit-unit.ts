import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, type OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage, UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import { UnitsApi, type Unit, type UnitKind, type UpdateUnit } from '../../../../core/units.api';
import { Card, type CardAction, Stepper, Tag } from '../../../../shared/ui';

export interface MoveOption {
  id: string;
  label: string;
}

const CHILD_KINDS: UnitKind[] = ['building', 'apartment', 'account'];

// Edición de unidad (card en modo wizard) y tarjeta de resultado. Se muestra dentro de un ui-dialog.
// Cambiar "Cuelga de" mueve la unidad con todo su subárbol; una comunidad no se mueve ni cambia de tipo.
@Component({
  selector: 'app-edit-unit',
  imports: [ReactiveFormsModule, Card, Stepper, Tag],
  templateUrl: './edit-unit.html',
  styleUrl: '../../wizard.scss',
})
export class EditUnit implements OnInit {
  private readonly api = inject(UnitsApi);

  readonly unit = input.required<Unit>();
  /** Unidades a las que se puede mover (misma comunidad, sin la propia ni sus descendientes). Vacío para una comunidad. */
  readonly moveOptions = input<MoveOption[]>([]);
  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Datos', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly updated = signal<Unit | null>(null);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly kinds = CHILD_KINDS;
  protected readonly unitLabel = unitLabel;
  protected readonly resultActions: CardAction[] = [{ id: 'close', label: 'Cerrar' }];

  protected readonly form = inject(NonNullableFormBuilder).group({
    kind: ['building' as UnitKind, Validators.required],
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: [''],
    parentId: [''],
  });

  protected readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly isCommunity = computed(() => this.unit().kind === 'community');
  protected readonly parentLabel = computed(() => this.moveOptions().find((o) => o.id === this.value().parentId)?.label ?? '—');

  protected readonly canAdvance = computed(() => {
    this.value();
    switch (this.step()) {
      case 1:
        return this.form.controls.code.valid && this.form.controls.code.value.trim().length > 0;
      case 2:
        return !this.saving();
      default:
        return true;
    }
  });

  ngOnInit(): void {
    const u = this.unit();
    this.form.setValue({ kind: u.kind, code: u.code, name: u.name ?? '', parentId: u.parentId ?? '' });
  }

  /** Solo lo que cambió respecto a la unidad original. */
  protected patch(): UpdateUnit {
    const u = this.unit();
    const v = this.form.getRawValue();
    const patch: UpdateUnit = {};
    if (v.code.trim() !== u.code) patch.code = v.code.trim();
    if ((v.name.trim() || null) !== u.name) patch.name = v.name.trim() || null;
    if (!this.isCommunity()) {
      if (v.kind !== u.kind) patch.kind = v.kind;
      if (v.parentId && v.parentId !== u.parentId) patch.parentId = v.parentId;
    }
    return patch;
  }

  protected finish(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.update(this.unit().id, this.patch()).subscribe({
      next: (unit) => {
        this.updated.set(unit);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, 'No se pudo guardar la unidad'));
        this.saving.set(false);
      },
    });
  }
}
