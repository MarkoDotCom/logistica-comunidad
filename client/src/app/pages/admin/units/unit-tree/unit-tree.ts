import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { unitLabel } from '../../../../core/labels';
import { UnitsApi, type Unit, type UnitNode as UnitNodeData } from '../../../../core/units.api';
import { Button, Dialog, SectionHeader } from '../../../../shared/ui';
import { EditUnit, type MoveOption } from '../edit-unit/edit-unit';
import { NewUnit } from '../new-unit/new-unit';
import { UnitNode } from '../unit-node/unit-node';

/** Lista plana de un subárbol como opciones de "colgar de", saltando la unidad que se mueve y sus descendientes. */
export function moveOptions(root: UnitNodeData, skipId: string, depth = 0): MoveOption[] {
  if (root.id === skipId) return [];
  const own: MoveOption = { id: root.id, label: `${'— '.repeat(depth)}${unitLabel(root)}` };
  return [own, ...root.children.flatMap((c) => moveOptions(c, skipId, depth + 1))];
}

@Component({
  selector: 'app-unit-tree',
  imports: [Button, Dialog, EditUnit, NewUnit, SectionHeader, UnitNode],
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

  protected readonly moveOptions = computed<MoveOption[]>(() => {
    const unit = this.editing();
    const trees = this.trees();
    if (!unit || !trees || unit.kind === 'community') return [];
    const tree = trees.find((t) => contains(t, unit.id));
    return tree ? moveOptions(tree, unit.id) : [];
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

  private load(): void {
    this.api
      .children()
      .pipe(switchMap((roots) => (roots.length ? forkJoin(roots.map((r) => this.api.tree(r.id))) : of([]))))
      .subscribe({ next: (trees) => this.trees.set(trees), error: () => this.failed.set(true) });
  }
}

function contains(node: UnitNodeData, id: string): boolean {
  return node.id === id || node.children.some((c) => contains(c, id));
}
