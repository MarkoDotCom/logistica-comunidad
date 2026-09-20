import type { unit_kind } from './generated/enums.js';

// Espejo de unit_rank() en la base: menor = más arriba en la jerarquía
export const UNIT_RANK: Record<unit_kind, number> = { community: 0, building: 1, apartment: 2, account: 3 };

/** ¿Puede una unidad de tipo `child` colgar de una de tipo `parent`? Solo si el padre es de rango estrictamente menor. */
export function canNest(parent: unit_kind, child: unit_kind): boolean {
  return UNIT_RANK[parent] < UNIT_RANK[child];
}
