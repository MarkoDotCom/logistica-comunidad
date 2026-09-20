import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { apiErrorMessage, canNest, UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import { UnitsApi, type Unit, type UnitKind, type UnitNode as UnitNodeData } from '../../../../core/units.api';
import { Button, Card, type CardAction, Dialog, SectionHeader } from '../../../../shared/ui';
import { EditUnit, type MoveOption } from '../edit-unit/edit-unit';
import { NewUnit } from '../new-unit/new-unit';
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

@Component({
  selector: 'app-unit-tree',
  imports: [Button, Card, Dialog, EditUnit, NewUnit, RestoreUnit, SectionHeader, UnitNode],
  templateUrl: './unit-tree.html',
  styleUrl: './unit-tree.scss',
})
export class UnitTree {
  private readonly api = inject(UnitsApi);

  // Un árbol completo por comunidad raíz
  protected readonly trees = signal<UnitNodeData[] | null>(null);
  protected readonly failed = signal(false);
  // undefined = diálogo cerrado; null = nueva comunidad; Unit = nuevo hijo de esa unidad
  protected readonly newParent = signal<Unit | null | undefined>(undefined);
  protected readonly editing = signal<Unit | null>(null);
  // Unidad pendiente de confirmar su eliminación; null = diálogo cerrado
  protected readonly removing = signal<Unit | null>(null);
  // Nodo eliminado (con su subárbol) cuya restauración está en el wizard; null = diálogo cerrado
  protected readonly restoring = signal<UnitNodeData | null>(null);
  protected readonly showDeleted = signal(false);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly unitLabel = unitLabel;
  protected readonly removeActions = computed<CardAction[]>(() => [
    { id: 'confirm', label: 'Eliminar', disabled: this.busy() },
    { id: 'cancel', label: 'Cancelar', variant: 'ghost' },
  ]);

  // Cuántas unidades vivas se van con la que se elimina (ella incluida)
  protected readonly removingCount = computed(() => {
    const unit = this.removing();
    const trees = this.trees();
    if (!unit || !trees) return 0;
    const node = trees.map((t) => findNode(t, unit.id)).find(Boolean);
    return node ? countAlive(node) : 1;
  });

  protected readonly moveOptions = computed<MoveOption[]>(() => {
    const unit = this.editing();
    const trees = this.trees();
    if (!unit || !trees || unit.kind === 'community') return [];
    const tree = trees.find((t) => contains(t, unit.id));
    return tree ? moveOptions(tree, unit.id, unit.kind) : [];
  });

  // Tipo del padre y tipos de los hijos de la unidad en edición, para que el wizard ofrezca solo tipos válidos
  protected readonly editingParentKind = computed<UnitKind | null>(() => {
    const unit = this.editing();
    const trees = this.trees();
    if (!unit?.parentId || !trees) return null;
    return trees.map((t) => findNode(t, unit.parentId!)).find(Boolean)?.kind ?? null;
  });
  protected readonly editingChildKinds = computed<UnitKind[]>(() => {
    const unit = this.editing();
    const trees = this.trees();
    if (!unit || !trees) return [];
    const node = trees.map((t) => findNode(t, unit.id)).find(Boolean);
    return [...new Set(node?.children.map((c) => c.kind) ?? [])];
  });

  constructor() {
    this.load();
  }

  protected onNewOpenChange(open: boolean): void {
    if (!open) {
      this.newParent.set(undefined);
      this.load();
    }
  }

  protected onEditOpenChange(open: boolean): void {
    if (!open) {
      this.editing.set(null);
      this.load();
    }
  }

  protected onShowDeletedChange(event: Event): void {
    this.showDeleted.set((event.target as HTMLInputElement).checked);
    this.load();
  }

  protected onRestoreOpenChange(open: boolean): void {
    if (!open) {
      this.restoring.set(null);
      this.load();
    }
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
    const includeDeleted = this.showDeleted();
    this.api
      .children()
      .pipe(switchMap((roots) => (roots.length ? forkJoin(roots.map((r) => this.api.tree(r.id, includeDeleted))) : of([]))))
      .subscribe({ next: (trees) => this.trees.set(trees), error: () => this.failed.set(true) });
  }
}

function contains(node: UnitNodeData, id: string): boolean {
  return findNode(node, id) !== null;
}

function findNode(node: UnitNodeData, id: string): UnitNodeData | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function countAlive(node: UnitNodeData): number {
  return (node.deletedAt ? 0 : 1) + node.children.reduce((sum, c) => sum + countAlive(c), 0);
}
