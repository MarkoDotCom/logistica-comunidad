import type { ContractType } from './users.api';
import { UNIT_KINDS, type UnitKind } from './units.api';

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

// Espejo de unit_rank() en la base: menor = más arriba. Una unidad solo cuelga de otra de rango menor (se pueden saltar niveles).
export const UNIT_RANK: Record<UnitKind, number> = { community: 0, building: 1, apartment: 2, account: 3 };

export function canNest(parent: UnitKind, child: UnitKind): boolean {
  return UNIT_RANK[parent] < UNIT_RANK[child];
}

/** Tipos que pueden colgar de un padre de tipo `parent`; con null (raíz), solo community. */
export function allowedChildKinds(parent: UnitKind | null): UnitKind[] {
  return parent === null ? ['community'] : UNIT_KINDS.filter((k) => canNest(parent, k));
}

/** Tipos que puede tener una unidad dado el tipo de su padre y los de sus hijos (null = padre desconocido). */
export function allowedKinds(parent: UnitKind | null, children: UnitKind[]): UnitKind[] {
  return UNIT_KINDS.filter((k) => (parent === null ? k !== 'community' : canNest(parent, k)) && children.every((c) => canNest(k, c)));
}

// Tipo de hijo sugerido para cada tipo (el inmediatamente inferior)
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
