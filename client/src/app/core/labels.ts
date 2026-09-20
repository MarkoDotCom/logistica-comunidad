import type { ContractType } from './users.api';
import type { UnitKind } from './units.api';

export const UNIT_KIND_LABELS: Record<UnitKind, string> = {
  community: 'Comunidad',
  building: 'Edificio',
  apartment: 'Departamento',
  account: 'Cuenta',
};

export const UNIT_KIND_PLURALS: Record<UnitKind, string> = {
  community: 'Comunidades',
  building: 'Edificios',
  apartment: 'Departamentos',
  account: 'Cuentas',
};

// Etiqueta del botón de alta según el tipo que se crea
export const NEW_UNIT_LABELS: Record<UnitKind, string> = {
  community: 'Nueva comunidad',
  building: 'Nuevo edificio',
  apartment: 'Nuevo departamento',
  account: 'Nueva cuenta',
};

// Tipo de hijo habitual de cada tipo (la jerarquía es flexible; esto solo guía la interfaz)
export const CHILD_KIND: Record<UnitKind, UnitKind> = {
  community: 'building',
  building: 'apartment',
  apartment: 'account',
  account: 'account',
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

export type ContractStatus = 'current' | 'expired' | 'upcoming';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  current: 'Vigente',
  expired: 'Vencido',
  upcoming: 'Futuro',
};

/** Estado de un contrato respecto a `today` (YYYY-MM-DD). */
export function contractStatus(c: { startsAt: string; endsAt: string | null }, today = new Date().toISOString().slice(0, 10)): ContractStatus {
  if (c.startsAt > today) return 'upcoming';
  if (c.endsAt !== null && c.endsAt < today) return 'expired';
  return 'current';
}
