# Modelo de datos — gestión logística de comunidad de vivienda

Esquema PostgreSQL (13+). Dos piezas: la **unidad**, anidable a sí misma, y los **usuarios**, vinculados a las unidades mediante **contratos**.

```
community (comunidad)            ← administration, employment
└── building (edificio)          ← employment
    └── apartment (departamento) ← ownership, lease
        └── account (cuenta de cobro)
```

## Archivos

| Archivo      | Contenido                                                             |
|--------------|-----------------------------------------------------------------------|
| `schema.sql` | Esquemas `units` y `users`, enums, tablas, índices y triggers `updated_at` |
| `seed.sql`   | Datos de ejemplo: 1 comunidad, 2 edificios, 4 departamentos, 4 cuentas, 5 usuarios, 7 contratos |
| `modelo.mmd` | Diagrama ER en Mermaid                                                |

Con Docker (desde `proyectos/logistica-comunidad/`, credenciales en `.env`):

```bash
docker compose up -d db
docker compose exec db psql -U comunidad -d comunidad -c '\dt units.*' -c '\dt users.*'
```

Los scripts se ejecutan solos la primera vez que se crea el volumen. Tras cambiar `schema.sql`: `docker compose down -v && docker compose up -d db`.

Con un Postgres propio:

```bash
createdb comunidad
psql -d comunidad -f schema.sql
psql -d comunidad -f seed.sql
```

## Esquemas

| Esquema  | Contenido |
|----------|-----------|
| `units`  | `unit` |
| `users`  | `app_user`, `contract` |
| `public` | Enums `unit_kind`, `contract_type` y la función `set_updated_at()` |

En Prisma el datasource declara `schemas = ["public", "units", "users"]` y cada modelo lleva `@@schema(...)`.

## Diagrama ER

```mermaid
erDiagram
  unit o|--o{ unit : "parent_id"
  unit     ||--o{ contract : "sobre"
  app_user ||--o{ contract : "firma"
  unit {
    uuid id PK
    uuid parent_id FK
    unit_kind kind
    text code
    text name
    boolean is_active
  }
  app_user {
    uuid id PK
    citext email UK
    text external_auth_id UK
    text full_name
    boolean is_active
  }
  contract {
    uuid id PK
    uuid unit_id FK
    uuid user_id FK
    contract_type type
    date starts_at
    date ends_at
  }
```

## Entidades

### Unidades

| Tabla  | Descripción |
|--------|-------------|
| `unit` | Nodo del árbol. `kind` dice qué es; `parent_id` de quién cuelga. `code` es el identificador visible ("A", "101", "GC") y es único entre hermanos. `name` es opcional. `is_active = false` desactiva sin borrar. |

### Usuarios

| Tabla         | Descripción |
|---------------|-------------|
| `app_user`    | Cuenta. La identidad se delega a un proveedor externo (`external_auth_id`); no hay contraseña. |
| `contract`    | Relación entre una persona y una unidad. `type`: `ownership`, `lease`, `administration`, `employment`. Con `starts_at`/`ends_at` (NULL = sin término) y `document_url` opcional. Una persona puede tener varios contratos, con distintas unidades o con la misma a lo largo del tiempo (renovaciones). |

## Reglas

- **Raíz**: `kind = 'community'` ⇔ `parent_id IS NULL` (constraint `unit_root_is_community`). Todo lo demás tiene padre.
- **Jerarquía flexible**: no se valida que el padre sea del tipo inmediatamente superior. Se pueden intercalar niveles o agregar tipos con `ALTER TYPE unit_kind ADD VALUE`.
- **Ciclos**: la base solo impide que una unidad sea su propio padre. Evitar ciclos al reasignar `parent_id` es responsabilidad de la aplicación.
- **Alcance del contrato**: aplica a la unidad y a todo su subárbol (administración de la comunidad ve todo; dueño de un departamento ve su cuenta). La base no restringe qué tipo de contrato va en qué tipo de unidad; lo decide la aplicación.
- **Vigencia**: un contrato está vigente si `starts_at <= hoy` y (`ends_at IS NULL` o `ends_at >= hoy`). La base no impide solapamientos entre contratos de la misma persona y unidad; lo controla la aplicación.
- **Borrado**: `ON DELETE CASCADE` desde el padre y desde `app_user`; borrar una comunidad borra su árbol y los contratos.

## Convenciones

- PK `uuid` con `gen_random_uuid()`; timestamps `timestamptz`; `updated_at` mantenido por trigger.
- `email` es `citext` (único sin distinguir mayúsculas).
- Estados y tipos como `ENUM` de Postgres.

## Consultas típicas

```sql
-- Subárbol completo de una comunidad, con profundidad y ruta de códigos
WITH RECURSIVE tree AS (
  SELECT id, parent_id, kind, code, 0 AS depth, code::text AS path
  FROM units.unit WHERE id = '10000000-0000-4000-8000-000000000001'
  UNION ALL
  SELECT u.id, u.parent_id, u.kind, u.code, t.depth + 1, t.path || ' / ' || u.code
  FROM units.unit u JOIN tree t ON u.parent_id = t.id
)
SELECT depth, kind, path FROM tree ORDER BY path;

-- Unidades a las que un usuario tiene acceso hoy (sus contratos vigentes y todo lo que cuelga de ellos)
WITH RECURSIVE reach AS (
  SELECT c.unit_id AS id, c.type FROM users.contract c
  WHERE c.user_id = '50000000-0000-4000-8000-000000000002'
    AND c.starts_at <= current_date AND (c.ends_at IS NULL OR c.ends_at >= current_date)
  UNION
  SELECT u.id, r.type FROM units.unit u JOIN reach r ON u.parent_id = r.id
)
SELECT r.type, u.kind, u.code FROM reach r JOIN units.unit u ON u.id = r.id ORDER BY 1, 2, 3;

-- Quién vive o es dueño de un departamento hoy
SELECT c.type, a.full_name, a.email, c.starts_at, c.ends_at
FROM users.contract c JOIN users.app_user a ON a.id = c.user_id
WHERE c.unit_id = '30000000-0000-4000-8000-000000000001'
  AND c.starts_at <= current_date AND (c.ends_at IS NULL OR c.ends_at >= current_date);

-- Historial de contratos de una persona con una unidad
SELECT type, starts_at, ends_at FROM users.contract
WHERE user_id = '50000000-0000-4000-8000-000000000004' AND unit_id = '30000000-0000-4000-8000-000000000001'
ORDER BY starts_at;
```
