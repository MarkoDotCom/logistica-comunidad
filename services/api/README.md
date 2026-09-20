# API — logistica-comunidad

NestJS 12 (ESM) + Prisma 7 sobre PostgreSQL. Lee el `.env` de la raíz del repo (`DATABASE_URL`, `API_PORT`).

```bash
npm install
npx prisma generate     # cliente Prisma en src/database/generated (no se versiona)
npm run start:dev       # http://localhost:3001 (o docker compose up desde la raíz)
npm test                # unitarios
npm run test:e2e        # contra la base del compose (docker compose up -d db)
npm run lint
```

## Capas

```
src/
├── database/            # único acceso a la base: PrismaService + una clase por tabla (tables/*.table.ts)
│   └── prisma/schema.prisma   # se regenera desde la base con `npx prisma db pull`
└── rest/                # endpoints HTTP; inyecta las tablas, nunca Prisma
    ├── api-response.*   # envoltorio único de respuestas (éxito y error)
    ├── auth/            # login, refresh, logout, me; guards globales JwtAuthGuard y PermissionGuard
    ├── contracts/
    ├── health/
    ├── roles/
    ├── summary/
    ├── users/
    └── units/
```

`rest → database`, nunca al revés.

## Identidad y permisos

Todos los endpoints exigen `Authorization: Bearer <access token>` salvo `/health` y `/auth/*`. El access token dura `JWT_ACCESS_TTL` (15 min) y se firma con `JWT_SECRET`; el refresh token (`REFRESH_TTL_DAYS`, 30 días) viaja solo en una cookie `httpOnly` con `Path=/auth` y rota en cada uso. Variables en el `.env` de la raíz.

| Método | Ruta            | Descripción |
|--------|-----------------|-------------|
| POST   | `/auth/login`   | `email` + `password` → `{ accessToken, user }` y cookie `refresh_token`. Todos los usuarios del seed: `Comunidad2026!` |
| POST   | `/auth/refresh` | Con la cookie: access token nuevo y cookie rotada; el refresh usado queda revocado |
| POST   | `/auth/logout`  | Revoca el refresh token de la cookie y la borra (204) |
| GET    | `/auth/me`      | La cuenta de la sesión con roles y `permissions` |

Cada endpoint declara el permiso que exige con `@RequirePermission('units.write')`; sin token 401, sin el permiso 403 con el permiso que falta en `message`. Los permisos se leen de la base en cada petición, así un cambio de rol surte efecto de inmediato. Las contraseñas se guardan con scrypt (`src/database/password.ts`).

| Recurso | `read` | `write` | `delete` |
|---|---|---|---|
| `summary` | `GET /summary` | | |
| `units` | `GET /units*` | `POST /units`, `PATCH /units/:id` | `DELETE /units/:id`, `POST /units/:id/restore` |
| `contracts` | `GET /contracts/:id` | `POST /units/:id/contracts`, `PATCH /contracts/:id` | |
| `users` | `GET /users*` | `POST /users`, `PATCH /users/:id` | |
| `roles` | `GET /permissions`, `GET /roles*` | `POST/PATCH/DELETE /roles*`, `PUT/DELETE /roles/:id/users/:userId` | |

## Respuestas

Toda respuesta sale con el mismo envoltorio. El cliente puede enviar `x-request-id` para correlacionar; siempre se devuelve.

```json
{ "success": true,  "status": 200, "message": "OK", "traceId": "…", "timestamp": "…", "data": … }
{ "success": false, "status": 400, "message": "…", "code": "BAD_REQUEST", "traceId": "…", "timestamp": "…", "errors": ["…"] }
```

## Endpoints

| Método | Ruta                   | Descripción |
|--------|------------------------|-------------|
| GET    | `/health`              | Estado de la API y la base |
| GET    | `/permissions`         | Catálogo fijo de permisos (`key` = `recurso.accion`) |
| GET    | `/roles`               | Roles vivos con nº de permisos y de usuarios |
| GET    | `/roles/:id`           | Rol con sus permisos y sus usuarios |
| POST   | `/roles`               | Crea rol (`name`, `description?`, `permissions`) |
| PATCH  | `/roles/:id`           | Modifica lo que venga; `permissions` reemplaza el conjunto |
| DELETE | `/roles/:id`           | Borrado lógico (204); no en roles del sistema |
| PUT    | `/roles/:id/users/:userId` | Asigna el rol a la persona (idempotente) |
| DELETE | `/roles/:id/users/:userId` | Quita el rol a la persona |
| GET    | `/summary`             | Métricas del dashboard: unidades activas por tipo, usuarios (total y activos), contratos vigentes y cuántos vencen en 30 días |
| GET    | `/users?search=`       | Lista usuarios; `search` filtra por nombre o email |
| GET    | `/users/:id`           | Usuario con sus contratos y las unidades de cada uno |
| POST   | `/users`               | Crea usuario (`email`, `fullName`, `phone?`, `externalAuthId?`) |
| PATCH  | `/users/:id`           | Modifica lo que venga (`email`, `fullName`, `phone`, `externalAuthId`, `isActive`, `roleIds` reemplaza sus roles) |
| GET    | `/units?parentId=`     | Sin `parentId`, las comunidades raíz; con él, los hijos directos. Cada fila trae `childrenCount` (hijos vivos). `?includeDeleted=true` incluye eliminadas |
| GET    | `/units/:id`           | Una unidad |
| GET    | `/units/:id/detail`    | Detalle completo: la unidad, `ancestors` (de la raíz al padre), `children` vivos con `childrenCount` y `contracts` con la persona de cada uno |
| GET    | `/units/:id/tree`      | La unidad con su subárbol anidado (`children`); `?includeDeleted=true` incluye las eliminadas |
| POST   | `/units`               | Crea unidad (`kind`, `code`, `parentId?`, `name?`) |
| PATCH  | `/units/:id`           | Modifica lo que venga; cambiar `parentId` mueve la unidad con su subárbol |
| DELETE | `/units/:id`           | Borrado lógico de la unidad y su subárbol (`deleted_at`); responde `{ deleted: n }` |
| POST   | `/units/:id/restore`   | Revierte el borrado lógico de la unidad y de lo que se eliminó con ella |
| POST   | `/units/:id/contracts` | Crea un contrato sobre la unidad (`userId`, `type`, `startsAt`, `endsAt?`, `documentUrl?`, `notes?`) |
| GET    | `/contracts/:id`       | Un contrato con su persona |
| PATCH  | `/contracts/:id`       | Modifica lo que venga; `endsAt: null` deja el contrato sin término |

Reglas que aplica la API: `community` es la única raíz y el resto necesita `parentId`; el padre debe existir y estar vivo; no se puede mover una unidad bajo sí misma ni bajo su subárbol; el código no se repite entre hermanos vivos (409). Orden de la jerarquía (también en la base, trigger `unit_check_rank`): comunidad > edificio > departamento > cuenta; una unidad solo cuelga de otra de rango superior, se pueden saltar niveles, y no se puede cambiar el tipo de una unidad si le quedan hijos de su mismo rango o superior (400 con el motivo).

Borrado lógico de unidades: nunca se borra físicamente. Una unidad eliminada desaparece de listas, árbol, `GET /units/:id`, `PATCH` y métricas, y libera su código. Restaurar exige que el padre esté vivo (se restaura de arriba hacia abajo) y que el código siga libre; trae consigo las unidades que se eliminaron en la misma operación. Usuarios: no hay borrado, se usa `isActive`.

Contratos: el tipo debe corresponder al tipo de unidad (comunidad: administración y empleo; edificio: empleo; departamento: propiedad y arriendo; cuenta: ninguno), la persona debe existir y el término no puede ser anterior al inicio. No hay borrado de contratos.

Roles: globales, nombre único entre vivos (409), permisos del catálogo (400 si alguno no existe). Los roles del sistema (`isSystem`, `admin`) cambian de permisos y descripción pero no se renombran ni eliminan. Los permisos se aplican en cada endpoint (ver Identidad y permisos).
