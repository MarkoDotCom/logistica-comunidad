import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, type OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage, UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import { UnitsApi, type Unit, type UnitKind } from '../../../../core/units.api';
import { Card, type CardAction, Stepper, Tag } from '../../../../shared/ui';

// Tipo sugerido para el hijo según el tipo del padre
const CHILD_KIND: Record<UnitKind, UnitKind> = { community: 'building', building: 'apartment', apartment: 'account', account: 'account' };
const CHILD_KINDS: UnitKind[] = ['building', 'apartment', 'account'];

// Alta de unidad en tres pasos (card en modo wizard) y tarjeta de resultado. Se muestra dentro de un ui-dialog.
// Sin padre crea una comunidad; con padre, un hijo del tipo elegido.
@Component({
  selector: 'app-new-unit',
  imports: [ReactiveFormsModule, Card, Stepper, Tag],
  templateUrl: './new-unit.html',
  styleUrl: '../../wizard.scss',
})
export class NewUnit implements OnInit {
  private readonly api = inject(UnitsApi);

  readonly parent = input.required<Unit | null>();
  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Datos', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly created = signal<Unit | null>(null);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly kinds = CHILD_KINDS;
  protected readonly unitLabel = unitLabel;
  protected readonly resultActions: CardAction[] = [
    { id: 'close', label: 'Cerrar' },
    { id: 'another', label: 'Crear otra', variant: 'ghost' },
  ];

  protected readonly form = inject(NonNullableFormBuilder).group({
    kind: ['community' as UnitKind, Validators.required],
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: [''],
  });

  protected readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

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
    const parent = this.parent();
    this.form.controls.kind.setValue(parent ? CHILD_KIND[parent.kind] : 'community');
  }

  protected finish(): void {
    const v = this.form.getRawValue();
    const parent = this.parent();
    this.saving.set(true);
    this.error.set(null);
    this.api
      .create({ kind: parent ? v.kind : 'community', code: v.code.trim(), name: v.name.trim() || undefined, parentId: parent?.id })
      .subscribe({
        next: (created) => {
          this.created.set(created);
          this.saving.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(apiErrorMessage(e, 'No se pudo crear la unidad'));
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
    this.ngOnInit();
    this.created.set(null);
    this.error.set(null);
    this.step.set(0);
  }
}
