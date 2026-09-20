import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { apiErrorMessage, UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import { UnitsApi, type Unit, type UnitNode } from '../../../../core/units.api';
import { Card, type CardAction, Stepper, Tag } from '../../../../shared/ui';

/** Cuántas unidades del subárbol se eliminaron junto con la raíz (mismo deleted_at), ella incluida. */
export function countDeletedWith(node: UnitNode, deletedAt = node.deletedAt): number {
  return (node.deletedAt === deletedAt ? 1 : 0) + node.children.reduce((sum, c) => sum + countDeletedWith(c, deletedAt), 0);
}

// Restauración de una unidad eliminada en dos pasos (card en modo wizard) y tarjeta de resultado. Se muestra dentro de un ui-dialog.
@Component({
  selector: 'app-restore-unit',
  imports: [DatePipe, Card, Stepper, Tag],
  templateUrl: './restore-unit.html',
  styleUrl: '../../wizard.scss',
})
export class RestoreUnit {
  private readonly api = inject(UnitsApi);

  /** Nodo eliminado, con su subárbol, tal como viene de GET /units/:id/tree?includeDeleted=true. */
  readonly node = input.required<UnitNode>();
  readonly closed = output<void>();

  protected readonly steps = ['Presentación', 'Confirmar'];
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly restored = signal<Unit | null>(null);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly unitLabel = unitLabel;
  protected readonly resultActions: CardAction[] = [{ id: 'close', label: 'Cerrar' }];

  // Las que vuelven con ella, sin contarla
  protected readonly companions = computed(() => countDeletedWith(this.node()) - 1);
  protected readonly canAdvance = computed(() => !this.saving());

  protected finish(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.restore(this.node().id).subscribe({
      next: (unit) => {
        this.restored.set(unit);
        this.saving.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(e, 'No se pudo restaurar la unidad'));
        this.saving.set(false);
      },
    });
  }
}
