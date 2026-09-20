# Reglas de diseño del cliente — complemento del proyecto

La guía general está en la raíz del repo: [`docs/design-rules.md`](../../docs/design-rules.md) (tokens, tipografía, librería `shared/ui`, formularios, accesibilidad) y [`docs/modales-y-wizards.md`](../../docs/modales-y-wizards.md) (modal de tamaño fijo con wizard por pasos). Este archivo solo recoge lo específico de esta app. Si algo cambia en `src/styles.scss` o en `src/app/shared/ui/`, actualiza la guía general en el mismo commit.

## Qué hay de la librería `shared/ui`

| Componente | Notas de uso aquí |
|---|---|
| `ui-button` | `primary`, `secondary` (Anterior), `ghost` (Crear otro, Eliminar en tablas), `danger` (solo Finalizar de `app-remove-unit`) |
| `ui-card` | Wizards con `steps`, `[(step)]`, `canAdvance`, `finishVariant`, `(finish)`; tarjetas de resultado con `actions` (la primaria última) |
| `ui-dialog` | Tamaño fijo 40rem × 40rem; el contenido se crea al abrir (`@if`) y la página recarga al cerrar |
| `ui-stepper`, `ui-tag`, `ui-section-header`, `ui-theme-toggle` | Sin particularidades |
| `ui-breadcrumb` | `items: BreadcrumbItem[]` (`label`, `link?`); último ítem sin enlace con `aria-current="page"`. Lo arma `core/unit-routes.ts` |

No hay página `/ux`; el punto 6 del checklist de la guía general no aplica.

## Sesión y permisos

- `Session` (`core/session.ts`) guarda la cuenta y el access token en memoria (signals). `restore()` recupera la sesión con la cookie de refresh; `authInterceptor` añade el Bearer y, ante un 401, refresca una vez y repite. `sessionGuard` protege `/admin`; `permissionGuard('x.y')` cada sección (`core/sections.ts`).
- Las acciones se **ocultan** sin permiso (`session.can('units.write')`): no se muestran deshabilitadas. Lectura: `units.read`, `users.read`, `roles.read`, `summary.read`; escritura: `units.write`, `units.delete`, `contracts.write`, `users.write`, `roles.write`.
- Los specs de páginas usan `provideSessionWith(permissions)` de `core/session.testing.ts`.
- `/login` es la única página pública: header mínimo con marca y `ui-theme-toggle`, y un `ui-card` con el formulario.

## Patrones de página

- **Dashboard**: todo bajo `pages/admin/`, con el layout `Admin` (las secciones permitidas de Inicio · Comunidades · Árbol · Usuarios · Roles, la persona, Salir y `ui-theme-toggle`). Cada página empieza con `<main class="page">` y un `ui-section-header`; las de detalle llevan antes un `ui-breadcrumb` y sus secciones usan `pages/admin/detail.scss` (3rem entre secciones).
- **Navegación por niveles**: Comunidades → comunidad (edificios) → edificio (departamentos) → departamento (detalle). Cada nivel es un `app-unit-level` (tabla con alta, edición, eliminación lógica y restauración) parametrizado con el padre, el tipo hijo y la ruta de cada fila. Mover unidades solo se ofrece en el Árbol.
- **Orden de la jerarquía** (comunidad > edificio > departamento > cuenta, con saltos permitidos): los wizards solo ofrecen tipos válidos (`allowedChildKinds`, `allowedKinds` en `core/labels.ts`), el Árbol solo ofrece como destino unidades de rango superior y las cuentas no muestran "+ Hijo". La API y la base aplican la misma regla; su mensaje se muestra tal cual si algo se escapa.
- **Etiquetas**: enums de la API traducidos con `core/labels.ts` (`UNIT_KIND_LABELS`, `CONTRACT_TYPE_LABELS`, `CONTRACT_STATUS_LABELS`). `unitLabel()` da "Torre A" si hay nombre o "Departamento 101" si no.

## Wizards de esta app

Un wizard por funcionalidad, todos con la anatomía de la guía (`pages/admin/wizard.scss` da `wizard__intro`, `wizard__summary`, `wizard__stepper`, `wizard__result-name`, `wizard__list`):

| Wizard | Pasos | Particularidades |
|---|---|---|
| `app-new-user`, `app-new-unit` | Presentación, Datos, Confirmar | Resultado con *Crear otro* (ghost) y *Cerrar* |
| `app-edit-user`, `app-edit-unit` | Presentación, Datos, Confirmar | Cargan el actual; Finalizar solo si hay un cambio real |
| `app-remove-unit` | Presentación, Confirmar | `finishVariant="danger"`; dice cuántas unidades se van con ella |
| `app-restore-unit` | Presentación, Confirmar | Dice cuántas vuelven (mismo `deleted_at`) y los requisitos |
| `app-contract-wizard` | Presentación, Persona, Datos, Confirmar | Alta y edición; buscador de usuarios; tipos limitados por unidad (`allowedContractTypes`) |
| `app-role-wizard` | Presentación, Datos, Permisos, Confirmar | Alta y edición; permisos del catálogo agrupados por recurso (`groupPermissions`); un rol del sistema no cambia de nombre |
| `app-remove-role`, `app-remove-role-user` | Presentación, Confirmar | `finishVariant="danger"` |
| `app-add-role-user` | Presentación, Persona, Confirmar | Buscador de usuarios; resultado con *Agregar otra* y *Cerrar* |

Las tablas (`app-unit-level`, `app-unit-contracts`, `app-user-list`, `app-role-list`, `app-role-detail`) solo abren los wizards y recargan al cerrar. `app-edit-user` tiene un paso Roles con casillas; `roleIds` reemplaza el conjunto. `app-unit-level` y el Árbol piden el subárbol antes de abrir eliminar o restaurar, para que el wizard pueda contar.
