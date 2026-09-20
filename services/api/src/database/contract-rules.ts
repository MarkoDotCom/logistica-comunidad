import type { contract_type, unit_kind } from './generated/enums.js';

// Qué tipos de contrato admite cada tipo de unidad (espejo en client/core/labels.ts)
export const CONTRACT_TYPES_BY_KIND: Record<unit_kind, contract_type[]> = {
  community: ['administration', 'employment'],
  building: ['employment'],
  apartment: ['ownership', 'lease'],
  account: [],
};
