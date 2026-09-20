import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { canNest, unitLabel } from '../../../../core/labels';
import { UnitsApi, type Unit, type UnitKind, type UnitNode as UnitNodeData } from '../../../../core/units.api';
import { Button, Dialog, SectionHeader } from '../../../../shared/ui';
import { EditUnit, type MoveOption } from '../edit-unit/edit-unit';
import { NewUnit } from '../new-unit/new-unit';
import { RemoveUnit } from '../remove-unit/remove-unit';
import { RestoreUnit } from '../restore-unit/restore-unit';
import { UnitNode } from '../unit-node/unit-node';

/**
 * Lista plana de un subárbol como opciones de "colgar de": salta la unidad que se mueve y sus descendientes,
 * y solo ofrece unidades de rango superior al tipo `kind` (regla de orden).
 */
export function moveOptions(root: UnitNodeData, skipId: string, kind: UnitKind, depth = 0): MoveOption[] {
  if (root.id === skipId) return [];
  const own: MoveOption[] = canNest(root.kind, kind) ? [{ id: root.id, label: `${'— '.repeat(depth)}${unitLabel(root)}` }] : [];
  return [...own, ...root.children.flatMap((c) => moveOptions(c, skipId, kind, depth + 1))];
}

// Vista global: un árbol completo por comunidad. Aquí se mueven unidades de rama y se restauran las eliminadas.
// Toda mutación pasa por un wizard en un ui-dialog; al cerrarlo se recarga.
@Component({
  selector: 'app-unit-tree',
  imports: [Button, Dialog, EditUnit, NewUnit, RemoveUnit, RestoreUnit, SectionHeader, UnitNode],
  templateUrl: './unit-tree.html',
  styleUrl: './unit-tree.scss',
})
export class UnitTree {
  private readonly api = inject(UnitsApi);

  protected readonly trees = signal<UnitNodeData[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly showDeleted = signal(false);
  // undefined = diálogo cerrado; null = nueva comunidad; Unit = nuevo hijo de esa unidad
  protected readonly newParent = signal<Unit | null | undefined>(undefined);
  protected readonly editing = signal<Unit | null>(null);
  // Nodos (con su subárbol) cuya eliminación o restauración está en un wizard; null = diálogo cerrado
  protected readonly removing = signal<UnitNodeData | null>(null);
  protected readonly restoring = signal<UnitNodeData | null>(null);

  protected readonly moveOptions = computed<MoveOption[]>(() => {
    const unit = this.editing();
    const trees = this.trees();
    if (!unit || !trees || unit.kind === 'community') return [];
    const tree = trees.find((t) => findNode(t, unit.id));
    return tree ? moveOptions(tree, unit.id, unit.kind) : [];
  });

  // Tipo del padre y tipos de los hijos de la unidad en edición, para que el wizard ofrezca solo tipos válidos
  protected readonly editingParentKind = computed<UnitKind | null>(() => {
    const unit = this.editing();
    const trees = this.trees();
    if (!unit?.parentId || !trees) return null;
    return this.find(unit.parentId)?.kind ?? null;
  });
  protected readonly editingChildKinds = computed<UnitKind[]>(() => {
    const unit = this.editing();
    return unit ? [...new Set(this.find(unit.id)?.children.map((c) => c.kind) ?? [])] : [];
  });

  constructor() {
    this.load();
  }

  protected onShowDeletedChange(event: Event): void {
    this.showDeleted.set((event.target as HTMLInputElement).checked);
    this.load();
  }

  // Al cerrar cualquier diálogo se recarga: lo nuevo, movido, eliminado o restaurado se refleja en el árbol
  protected onDialogClose(dialog: 'new' | 'edit' | 'remove' | 'restore'): void {
    if (dialog === 'new') this.newParent.set(undefined);
    if (dialog === 'edit') this.editing.set(null);
    if (dialog === 'remove') this.removing.set(null);
    if (dialog === 'restore') this.restoring.set(null);
    this.load();
  }

  /** Los wizards de eliminar y restaurar reciben el nodo con su subárbol para decir qué se va o qué vuelve. */
  protected openRemove(unit: Unit): void {
    this.removing.set(this.find(unit.id));
  }

  private find(id: string): UnitNodeData | null {
    return (this.trees() ?? []).map((t) => findNode(t, id)).find(Boolean) ?? null;
  }

  private load(): void {
    const includeDeleted = this.showDeleted();
    this.api
      .children()
      .pipe(switchMap((roots) => (roots.length ? forkJoin(roots.map((r) => this.api.tree(r.id, includeDeleted))) : of([]))))
      .subscribe({ next: (trees) => this.trees.set(trees), error: () => this.failed.set(true) });
  }
}

function findNode(node: UnitNodeData, id: string): UnitNodeData | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}
