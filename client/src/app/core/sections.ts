// Secciones del dashboard y el permiso que exige cada una. Ordenadas: la primera permitida es la página de entrada.
export interface Section {
  path: string;
  label: string;
  permission: string;
  exact?: boolean;
}

export const SECTIONS: Section[] = [
  { path: '/admin', label: 'Inicio', permission: 'summary.read', exact: true },
  { path: '/admin/comunidades', label: 'Comunidades', permission: 'units.read' },
  { path: '/admin/unidades', label: 'Árbol', permission: 'units.read' },
  { path: '/admin/usuarios', label: 'Usuarios', permission: 'users.read' },
  { path: '/admin/roles', label: 'Roles', permission: 'roles.read' },
];
