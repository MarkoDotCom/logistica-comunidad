# Client — logistica-comunidad

Angular 21 (standalone, signals, zoneless) con SCSS propio, sin librería de componentes. Dashboard del administrador en `/admin`.

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
├── core/          # HTTP: interceptor que desenvuelve `data`, users.api, units.api, summary.api, labels (español)
├── shared/ui/     # componentes base ui-* (button, card, dialog, stepper, tag, section-header, theme-toggle)
└── pages/admin/      # layout Admin + páginas
    ├── home/         # métricas (GET /summary) y accesos
    ├── communities/  # /admin/comunidades (lista), /:id (edificios), /:id/edificios/:id (departamentos)
    ├── apartments/   # /admin/departamentos/:id: detalle completo (ruta, ocupantes, cuentas, contratos)
    ├── units/        # árbol global (unit-tree), gestor de nivel (unit-level), contratos de una unidad,
    │                 # wizards new-unit, edit-unit, restore-unit
    └── users/        # tabla con buscador, wizards new-user y edit-user
```

Las reglas de diseño (tokens, tipografía, patrones de página y checklist para componentes nuevos) están en `docs/design-rules.md`.
