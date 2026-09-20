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
    ├── health/
    ├── summary/
    ├── users/
    └── units/
```

`rest → database`, nunca al revés.

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
| GET    | `/summary`             | Métricas del dashboard: unidades activas por tipo, usuarios (total y activos), contratos vigentes y cuántos vencen en 30 días |
| GET    | `/users?search=`       | Lista usuarios; `search` filtra por nombre o email |
| GET    | `/users/:id`           | Usuario con sus contratos y las unidades de cada uno |
| POST   | `/users`               | Crea usuario (`email`, `fullName`, `phone?`, `externalAuthId?`) |
| PATCH  | `/users/:id`           | Modifica lo que venga (`email`, `fullName`, `phone`, `externalAuthId`, `isActive`) |
| GET    | `/units?parentId=`     | Sin `parentId`, las comunidades raíz; con él, los hijos directos. Cada fila trae `childrenCount` (hijos vivos). `?includeDeleted=true` incluye eliminadas |
| GET    | `/units/:id`           | Una unidad |
| GET    | `/units/:id/detail`    | Detalle completo: la unidad, `ancestors` (de la raíz al padre), `children` vivos con `childrenCount` y `contracts` con la persona de cada uno |
| GET    | `/units/:id/tree`      | La unidad con su subárbol anidado (`children`); `?includeDeleted=true` incluye las eliminadas |
| POST   | `/units`               | Crea unidad (`kind`, `code`, `parentId?`, `name?`) |
| PATCH  | `/units/:id`           | Modifica lo que venga; cambiar `parentId` mueve la unidad con su subárbol |
| DELETE | `/units/:id`           | Borrado lógico de la unidad y su subárbol (`deleted_at`); responde `{ deleted: n }` |
| POST   | `/units/:id/restore`   | Revierte el borrado lógico de la unidad y de lo que se eliminó con ella |

Reglas que aplica la API: `community` es la única raíz y el resto necesita `parentId`; el padre debe existir y estar vivo; no se puede mover una unidad bajo sí misma ni bajo su subárbol; el código no se repite entre hermanos vivos (409). Orden de la jerarquía (también en la base, trigger `unit_check_rank`): comunidad > edificio > departamento > cuenta; una unidad solo cuelga de otra de rango superior, se pueden saltar niveles, y no se puede cambiar el tipo de una unidad si le quedan hijos de su mismo rango o superior (400 con el motivo).

Borrado lógico de unidades: nunca se borra físicamente. Una unidad eliminada desaparece de listas, árbol, `GET /units/:id`, `PATCH` y métricas, y libera su código. Restaurar exige que el padre esté vivo (se restaura de arriba hacia abajo) y que el código siga libre; trae consigo las unidades que se eliminaron en la misma operación. Usuarios: no hay borrado, se usa `isActive`.
