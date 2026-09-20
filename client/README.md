# Client — logistica-comunidad

Angular 21 (standalone, signals, zoneless) con SCSS propio, sin librería de componentes. Dashboard del administrador en `/admin`, con inicio de sesión en `/login` (usuarios del seed: contraseña `Comunidad2026!`).

La sesión vive en memoria: el access token nunca se guarda en el navegador y se recupera al recargar con la cookie httpOnly del refresh token. Cada sección exige un permiso (`core/sections.ts`) y las acciones se ocultan según los permisos de la persona.

```bash
npm install
npm start                # http://localhost:4201 con docker compose; ng serve solo, en :4200
npx ng test --watch=false
npm run build
```

La URL de la API está en `src/environments/environment.ts` (`http://localhost:3001`).

## Estructura

```
src/app/
├── core/          # sesión (Session, auth.api, interceptor con refresh, guards, sections), interceptor del envoltorio,
│                # users.api, units.api, contracts.api, roles.api, summary.api, labels (español)
├── shared/ui/     # componentes base ui-* (button, card, dialog, stepper, tag, section-header, theme-toggle)
├── pages/login/      # inicio de sesión (público)
└── pages/admin/      # layout Admin (menú por permisos, persona y Salir) + páginas
    ├── home/         # métricas (GET /summary) y accesos
    ├── communities/  # /admin/comunidades (lista), /:id (edificios), /:id/edificios/:id (departamentos)
    ├── apartments/   # /admin/departamentos/:id: detalle completo (ruta, ocupantes, cuentas, contratos)
    ├── units/        # árbol global (unit-tree), gestor de nivel (unit-level), contratos de una unidad
    │                 # (unit-contracts + contract-wizard), wizards new-unit, edit-unit, restore-unit
    ├── roles/        # /admin/roles (lista) y /:id (permisos y personas); wizards role-wizard, remove-role,
    │                 # add-role-user, remove-role-user
    └── users/        # tabla con buscador y roles, wizards new-user y edit-user (paso Roles)
```

Las reglas de diseño (tokens, tipografía, patrones de página y checklist para componentes nuevos) están en `docs/design-rules.md`.
