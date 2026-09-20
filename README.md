# Logística Comunidad

Solución de gestión logística para una comunidad de vivienda. Misma estructura que `bolsa-laboral`.

| Directorio       | Descripción                              | Stack previsto            |
|------------------|------------------------------------------|---------------------------|
| `client/`        | Aplicación web                           | Angular 21                |
| `services/api/`  | API                                      | NestJS + Prisma           |
| `database/`      | Esquema SQL, seed y diagrama ER          | PostgreSQL 16             |
| `landing/`       | Landing pública                          | Vite                      |
| `docs/`          | Documentación                            |                           |

```bash
cp .env.example .env       # incluye JWT_SECRET; cámbialo fuera de desarrollo
docker compose up -d db    # base de datos en localhost:5434
docker compose up          # api :3001, client :4201, landing :4301
```

## Estado

Apps generadas (Angular 21 zoneless + SCSS, NestJS 12 + Prisma 7 con adaptador pg, Vite 8 + Sass). Modelo de datos en `database/` (árbol de unidades, usuarios y contratos). API con CRUD de usuarios y unidades y métricas (ver `services/api/README.md`). Dashboard del administrador en `client/` con navegación por niveles (comunidades → edificios → departamentos → detalle) y árbol global (ver `client/README.md`). Las unidades se eliminan de forma lógica (`deleted_at`) y se pueden restaurar. Roles y permisos en el esquema `auth`; identidad propia con login por email y contraseña, JWT corto y refresh token rotativo en cookie httpOnly; la API exige el permiso de cada endpoint y el client oculta lo que la persona no puede hacer. Usuarios del seed: contraseña `Comunidad2026!`. Requiere `npm install` en `client/`, `services/api/` y `landing/`.
