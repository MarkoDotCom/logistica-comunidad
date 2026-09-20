import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, type OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage, CHILD_KIND, NEW_UNIT_LABELS, UNIT_KIND_LABELS, UNIT_KIND_PLURALS, unitLabel } from '../../../../core/labels';
import { UnitsApi, type Unit, type UnitKind, type UnitNode, type UnitSummary } from '../../../../core/units.api';
import { Button, Card, type CardAction, Dialog, Tag } from '../../../../shared/ui';
import { EditUnit } from '../edit-unit/edit-unit';
import { NewUnit } from '../new-unit/new-unit';
import { RestoreUnit } from '../restore-unit/restore-unit';

// Tabla de un nivel del árbol (los hijos de `parent`, o las comunidades raíz si es null) con alta, edición,
// borrado lógico y restauración en diálogos. Mover unidades no se ofrece aquí: se hace desde el Árbol.
@Component({
  selector: 'app-unit-level',
  imports: [RouterLink, Button, Card, Dialog, EditUnit, NewUnit, RestoreUnit, Tag],
  templateUrl: './unit-level.html',
  styleUrl: './unit-level.scss',
})
export class UnitLevel implements OnInit {
  private readonly api = inject(UnitsApi);

  readonly parent = input.required<Unit | null>();
  /** Tipo que se crea con el botón de alta y que da nombre a la columna de hijos. */
  readonly childKind = input.required<UnitKind>();
  /** Ruta de la página de una fila; null = sin enlace. */
  readonly linkFor = input<((unit: Unit) => unknown[] | null) | null>(null);

  protected readonly units = signal<UnitSummary[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly showDeleted = signal(false);
  protected readonly newOpen = signal(false);
  protected readonly editing = signal<Unit | null>(null);
  protected readonly removing = signal<Unit | null>(null);
  protected readonly restoring = signal<UnitNode | null>(null);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly plurals = UNIT_KIND_PLURALS;
  protected readonly unitLabel = unitLabel;
  protected readonly newLabel = computed(() => NEW_UNIT_LABELS[this.childKind()]);
  // Cabecera de la columna de hijos: para filas de edificios, "Departamentos"; para cuentas no hay columna
  protected readonly childrenHeader = computed(() => (this.childKind() === 'account' ? null : UNIT_KIND_PLURALS[CHILD_KIND[this.childKind()]]));
  protected readonly removeActions = computed<CardAction[]>(() => [
    { id: 'confirm', label: 'Eliminar', disabled: this.busy() },
    { id: 'cancel', label: 'Cancelar', variant: 'ghost' },
  ]);

  ngOnInit(): void {
    this.load();
  }

  protected route(unit: Unit): unknown[] | null {
    return this.linkFor()?.(unit) ?? null;
  }

  protected onShowDeletedChange(event: Event): void {
    this.showDeleted.set((event.target as HTMLInputElement).checked);
    this.load();
  }

  // Al cerrar cualquier diálogo se recarga: lo nuevo o modificado aparece en la tabla
  protected onDialogClose(dialog: 'new' | 'edit' | 'restore'): void {
    if (dialog === 'new') this.newOpen.set(false);
    if (dialog === 'edit') this.editing.set(null);
    if (dialog === 'restore') this.restoring.set(null);
    this.load();
  }

  /** El wizard de restaurar necesita el subárbol para contar qué vuelve: se pide con las eliminadas. */
  protected openRestore(unit: Unit): void {
    this.actionError.set(null);
    this.api.tree(unit.id, true).subscribe({
      next: (node) => this.restoring.set(node),
      error: (e: HttpErrorResponse) => this.actionError.set(apiErrorMessage(e, 'No se pudo cargar la unidad')),
    });
  }

  protected onRemoveAction(action: string): void {
    const unit = this.removing();
    if (action !== 'confirm' || !unit) {
      this.removing.set(null);
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    this.api.remove(unit.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.removing.set(null);
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.removing.set(null);
        this.actionError.set(apiErrorMessage(e, 'No se pudo eliminar la unidad'));
      },
    });
  }

  private load(): void {
    this.api.children(this.parent()?.id, this.showDeleted()).subscribe({
      next: (units) => this.units.set(units),
      error: () => this.failed.set(true),
    });
  }
}
