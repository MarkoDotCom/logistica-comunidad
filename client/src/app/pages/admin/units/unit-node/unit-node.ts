import { Component, input, output, signal } from '@angular/core';
import { UNIT_KIND_LABELS, unitLabel } from '../../../../core/labels';
import type { Unit, UnitNode as UnitNodeData } from '../../../../core/units.api';
import { Button, Tag } from '../../../../shared/ui';

// Un nodo del árbol de unidades con sus hijos (se renderiza a sí mismo). No conoce la API:
// emite qué unidad se quiere modificar, eliminar, restaurar o a cuál agregarle un hijo, y la página decide.
// Una unidad eliminada se ve atenuada y solo ofrece Restaurar.
@Component({
  selector: 'app-unit-node',
  imports: [Button, Tag],
  templateUrl: './unit-node.html',
  styleUrl: './unit-node.scss',
})
export class UnitNode {
  readonly node = input.required<UnitNodeData>();
  readonly depth = input(0);

  readonly add = output<Unit>();
  readonly edit = output<Unit>();
  readonly remove = output<Unit>();
  readonly restore = output<UnitNodeData>();

  protected readonly open = signal(true);
  protected readonly kindLabels = UNIT_KIND_LABELS;
  protected readonly label = unitLabel;
}
