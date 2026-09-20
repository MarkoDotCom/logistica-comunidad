import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, type OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage, CHILD_KIND, NEW_UNIT_LABELS, UNIT_KIND_LABELS, UNIT_KIND_PLURALS, unitLabel } from '../../../../core/labels';
import { Session } from '../../../../core/session';
import { UnitsApi, type Unit, type UnitKind, type UnitNode, type UnitSummary } from '../../../../core/units.api';
import { Button, Dialog, Tag } from '../../../../shared/ui';
import { EditUnit } from '../edit-unit/edit-unit';
import { NewUnit } from '../new-unit/new-unit';
import { RemoveUnit } from '../remove-unit/remove-unit';
import { RestoreUnit } from '../restore-unit/restore-unit';

// Tabla de un nivel del árbol (los hijos de `parent`, o las comunidades raíz si es null) con alta, edición,
// borrado lógico y restauración, cada uno en su wizard. Mover unidades no se ofrece aquí: se hace desde el Árbol.
@Component({
  selector: 'app-unit-level',
  imports: [RouterLink, Button, Dialog, EditUnit, NewUnit, RemoveUnit, RestoreUnit, Tag],
  templateUrl: './unit-level.html',
  styleUrl: './unit-level.scss',
})
export class UnitLevel implements OnInit {
  private readonly api = inject(UnitsApi);
  private readonly session = inject(Session);

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
  // Nodos (con su subárbol) cuya eliminación o restauración está en un wizard; null = diálogo cerrado
  protected readonly removing = signal<UnitNode | null>(null);
  protected readonly restoring = signal<UnitNode | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly canWrite = this.session.can('units.write');
  protected readonly canDelete = this.session.can('units.delete');
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly plurals = UNIT_KIND_PLURALS;
  protected readonly unitLabel = unitLabel;
  protected readonly newLabel = computed(() => NEW_UNIT_LABELS[this.childKind()]);
  // Cabecera de la columna de hijos: para filas de edificios, "Departamentos"; para cuentas no hay columna
  protected readonly childrenHeader = computed(() => (this.childKind() === 'account' ? null : UNIT_KIND_PLURALS[CHILD_KIND[this.childKind()]]));

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
  protected onDialogClose(dialog: 'new' | 'edit' | 'remove' | 'restore'): void {
    if (dialog === 'new') this.newOpen.set(false);
    if (dialog === 'edit') this.editing.set(null);
    if (dialog === 'remove') this.removing.set(null);
    if (dialog === 'restore') this.restoring.set(null);
    this.load();
  }

  /** El wizard de eliminar necesita el subárbol vivo para decir qué se va. */
  protected openRemove(unit: Unit): void {
    this.fetchNode(unit, false, (node) => this.removing.set(node));
  }

  /** El wizard de restaurar necesita el subárbol con las eliminadas para decir qué vuelve. */
  protected openRestore(unit: Unit): void {
    this.fetchNode(unit, true, (node) => this.restoring.set(node));
  }

  private fetchNode(unit: Unit, includeDeleted: boolean, then: (node: UnitNode) => void): void {
    this.actionError.set(null);
    this.api.tree(unit.id, includeDeleted).subscribe({
      next: then,
      error: (e: HttpErrorResponse) => this.actionError.set(apiErrorMessage(e, 'No se pudo cargar la unidad')),
    });
  }

  private load(): void {
    this.api.children(this.parent()?.id, this.showDeleted()).subscribe({
      next: (units) => this.units.set(units),
      error: () => this.failed.set(true),
    });
  }
}
