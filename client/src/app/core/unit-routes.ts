import { unitLabel } from './labels';
import type { Unit, UnitDetail } from './units.api';
import type { BreadcrumbItem } from '../shared/ui';

/** Ruta de la página de una unidad según su tipo; null si no tiene página propia (cuentas). */
export function unitRoute(unit: Unit, ancestors: Unit[]): unknown[] | null {
  switch (unit.kind) {
    case 'community':
      return ['/admin/comunidades', unit.id];
    case 'building':
      return ancestors[0] ? ['/admin/comunidades', ancestors[0].id, 'edificios', unit.id] : null;
    case 'apartment':
      return ['/admin/departamentos', unit.id];
    default:
      return null;
  }
}

/** Comunidades › comunidad › … › la unidad (sin enlace en la última). */
export function unitBreadcrumb(detail: UnitDetail): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: 'Comunidades', link: ['/admin/comunidades'] }];
  detail.ancestors.forEach((a, i) => items.push({ label: unitLabel(a), link: unitRoute(a, detail.ancestors.slice(0, i)) ?? undefined }));
  items.push({ label: unitLabel(detail) });
  return items;
}
