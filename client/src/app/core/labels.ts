import type { ContractType } from './users.api';
import type { UnitKind } from './units.api';

export const UNIT_KIND_LABELS: Record<UnitKind, string> = {
  community: 'Comunidad',
  building: 'Edificio',
  apartment: 'Departamento',
  account: 'Cuenta',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  ownership: 'Propiedad',
  lease: 'Arriendo',
  administration: 'Administración',
  employment: 'Empleo',
};

/** "Torre A" si tiene nombre; si no, el tipo y el código: "Departamento 101". */
export function unitLabel(unit: { kind: UnitKind; code: string; name: string | null }): string {
  return unit.name ?? `${UNIT_KIND_LABELS[unit.kind]} ${unit.code}`;
}

/** Mensaje de error del envoltorio de la API, o uno genérico. */
export function apiErrorMessage(e: { error?: { message?: string | string[] } }, fallback: string): string {
  const message = e.error?.message;
  return Array.isArray(message) ? message.join('. ') : (message ?? fallback);
}
