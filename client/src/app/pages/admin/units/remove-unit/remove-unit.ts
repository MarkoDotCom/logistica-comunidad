import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { apiErrorMessage, UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import { UnitsApi, type UnitNode } from '../../../../core/units.api';
import { Card, type CardAction, Stepper, Tag } from '../../../../shared/ui';

/** Cuántas unidades vivas hay en el subárbol, la raíz incluida. */
export function countAlive(node: UnitNode): number {
  return (node.deletedAt ? 0 : 1) + node.children.reduce((sum, c) => sum + countAlive(c), 0);
}

// Borrado lógico de una unidad en dos pasos (card en modo wizard, Finalizar en danger) y tarjeta de resultado.
// Se muestra dentro de un ui-dialog. La presentación dice qué se va con ella.
@Component({
  selector: 'app-remove-unit',
  imports: [Card, Stepper, Tag],
  templateUrl: './remove-unit.html',
  styleUrl: '../../wizard.scss',
})
export class RemoveUnit {
  private readonly api = inject(UnitsApi);

  /** Nodo vivo con su subárbol vivo, tal como viene de GET /units/:id/tree. */
  readonly node = input.required<UnitNode>();
  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deleted = signal<number | null>(null);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly unitLabel = unitLabel;
  protected readonly resultActions: CardAction[] = [{ id: 'close', label: 'Cerrar' }];

  // Las que se van con ella, sin contarla
  protected readonly companions = computed(() => countAlive(this.node()) - 1);
  protected readonly canAdvance = computed(() => !this.saving());

  protected finish(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.remove(this.node().id).subscribe({
      next: ({ deleted }) => {
        this.deleted.set(deleted);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, 'No se pudo eliminar la unidad'));
        this.saving.set(false);
      },
    });
  }
}
