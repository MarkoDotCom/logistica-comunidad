-- =============================================================================
-- Gestión logística de comunidad de vivienda — esquema PostgreSQL 13+
-- Esquemas: units (árbol de unidades), users (cuentas y contratos), auth (roles y permisos) y public (enums y funciones compartidas)
-- Ejecutar: psql -d <db> -f schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA units;   -- comunidad, edificios, departamentos, cuentas
CREATE SCHEMA users;   -- cuentas de usuario y sus contratos con las unidades
CREATE SCHEMA auth;    -- roles, permisos y su asignación a usuarios

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
-- Para agregar un nivel (torre, piso, estacionamiento...): ALTER TYPE unit_kind ADD VALUE '...';
CREATE TYPE unit_kind AS ENUM ('community', 'building', 'apartment', 'account');
-- Qué vincula a una persona con una unidad: ownership = propietario, lease = arrendatario,
-- administration = administrador de la comunidad, employment = conserje/personal
CREATE TYPE contract_type AS ENUM ('ownership', 'lease', 'administration', 'employment');

-- -----------------------------------------------------------------------------
-- Función compartida para updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. Unidades
-- =============================================================================

-- Árbol de unidades anidables: community > building > apartment > account.
-- Regla de orden: una unidad solo cuelga de otra de rango superior (ver unit_rank y el trigger unit_check_rank).
-- Se pueden saltar niveles (un departamento directo bajo una comunidad), pero no anidar el mismo tipo ni invertir el orden.
-- community es la única raíz y el resto tiene padre.
-- Borrado lógico: deleted_at marca la unidad (y su subárbol, lo hace la aplicación) como eliminada.
-- Nunca se borra físicamente desde la API; los contratos e historial quedan.
CREATE TABLE units.unit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid REFERENCES units.unit(id) ON DELETE CASCADE,
  kind       unit_kind NOT NULL,
  code       text NOT NULL,                     -- identificador visible: "Torre A", "1203", "GC"
  name       text,                              -- nombre descriptivo opcional
  deleted_at timestamptz,                       -- NULL = viva
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_root_is_community CHECK ((kind = 'community') = (parent_id IS NULL)),
  CONSTRAINT unit_not_own_parent    CHECK (parent_id IS DISTINCT FROM id)
);
-- Sin códigos repetidos entre hermanos vivos ni entre comunidades raíz vivas (una eliminada libera su código)
CREATE UNIQUE INDEX unit_sibling_code_uq ON units.unit (parent_id, code) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX unit_root_code_uq    ON units.unit (code)            WHERE parent_id IS NULL     AND deleted_at IS NULL;
CREATE INDEX unit_parent_alive_idx ON units.unit (parent_id) WHERE deleted_at IS NULL;
CREATE INDEX unit_kind_alive_idx   ON units.unit (kind)      WHERE deleted_at IS NULL;

CREATE TRIGGER unit_updated_at BEFORE UPDATE ON units.unit
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Rango de cada tipo en la jerarquía: menor = más arriba
CREATE OR REPLACE FUNCTION unit_rank(k unit_kind) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE k WHEN 'community' THEN 0 WHEN 'building' THEN 1 WHEN 'apartment' THEN 2 WHEN 'account' THEN 3 END
$$;

-- El padre debe ser de rango menor que la unidad, y la unidad de rango menor que todos sus hijos (vivos o eliminados)
CREATE OR REPLACE FUNCTION units.check_unit_rank() RETURNS trigger AS $$
DECLARE
  parent_kind unit_kind;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT kind INTO parent_kind FROM units.unit WHERE id = NEW.parent_id;
    IF unit_rank(parent_kind) >= unit_rank(NEW.kind) THEN
      RAISE EXCEPTION 'una unidad de tipo % no puede colgar de una de tipo %', NEW.kind, parent_kind
        USING ERRCODE = 'check_violation', CONSTRAINT = 'unit_parent_rank';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.kind <> OLD.kind
     AND EXISTS (SELECT 1 FROM units.unit c WHERE c.parent_id = NEW.id AND unit_rank(c.kind) <= unit_rank(NEW.kind)) THEN
    RAISE EXCEPTION 'una unidad de tipo % no puede tener hijos de su mismo tipo o superior', NEW.kind
      USING ERRCODE = 'check_violation', CONSTRAINT = 'unit_children_rank';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unit_check_rank BEFORE INSERT OR UPDATE OF parent_id, kind ON units.unit
  FOR EACH ROW EXECUTE FUNCTION units.check_unit_rank();

-- =============================================================================
-- 2. Usuarios y contratos
-- =============================================================================

CREATE TABLE users.app_user (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            citext NOT NULL UNIQUE,
  external_auth_id text UNIQUE,                 -- id del proveedor de identidad (Clerk, Auth0, ...); no hay contraseña
  full_name        text NOT NULL,
  phone            text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER app_user_updated_at BEFORE UPDATE ON users.app_user
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Contrato: la relación entre una persona y una unidad. Aplica a la unidad y a todo su subárbol
-- (administration sobre la community, ownership/lease sobre un apartment, employment sobre community o building).
-- Una persona puede tener varios contratos con la misma unidad a lo largo del tiempo; el vigente es el que cubre hoy.
CREATE TABLE users.contract (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES units.unit(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users.app_user(id) ON DELETE CASCADE,
  type         contract_type NOT NULL,
  starts_at    date NOT NULL DEFAULT current_date,
  ends_at      date,                            -- NULL = vigente sin término
  document_url text,                            -- contrato firmado (PDF en storage)
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_dates CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX contract_unit_idx ON users.contract (unit_id);
CREATE INDEX contract_user_idx ON users.contract (user_id);

CREATE TRIGGER contract_updated_at BEFORE UPDATE ON users.contract
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 3. Roles y permisos
-- =============================================================================

-- Catálogo fijo de acciones del código, '<recurso>.<acción>'. Se combinan en roles desde el admin; no se inventan ahí.
CREATE TABLE auth.permission (
  key         text PRIMARY KEY,
  resource    text NOT NULL,
  action      text NOT NULL,
  description text NOT NULL,
  CONSTRAINT permission_key_format CHECK (key = resource || '.' || action)
);

INSERT INTO auth.permission (key, resource, action, description) VALUES
  ('summary.read',    'summary',   'read',   'Ver las métricas del inicio'),
  ('units.read',      'units',     'read',   'Ver comunidades, edificios, departamentos y cuentas'),
  ('units.write',     'units',     'write',  'Crear, modificar y mover unidades'),
  ('units.delete',    'units',     'delete', 'Eliminar y restaurar unidades'),
  ('contracts.read',  'contracts', 'read',   'Ver contratos'),
  ('contracts.write', 'contracts', 'write',  'Crear y modificar contratos'),
  ('users.read',      'users',     'read',   'Ver usuarios'),
  ('users.write',     'users',     'write',  'Crear y modificar usuarios y sus roles'),
  ('roles.read',      'roles',     'read',   'Ver roles y permisos'),
  ('roles.write',     'roles',     'write',  'Crear, modificar y eliminar roles y asignarlos');

-- Roles globales de la aplicación. is_system: roles base que no se eliminan ni se renombran (sí cambian de permisos).
CREATE TABLE auth.role (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        citext NOT NULL,
  description text,
  is_system   boolean NOT NULL DEFAULT false,
  deleted_at  timestamptz,                      -- NULL = vivo (borrado lógico)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX role_name_uq ON auth.role (name) WHERE deleted_at IS NULL;

CREATE TRIGGER role_updated_at BEFORE UPDATE ON auth.role
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE auth.role_permission (
  role_id        uuid NOT NULL REFERENCES auth.role(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES auth.permission(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE auth.user_role (
  user_id    uuid NOT NULL REFERENCES users.app_user(id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES auth.role(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX user_role_role_idx ON auth.user_role (role_id);

-- Rol base con todos los permisos; existe siempre
INSERT INTO auth.role (id, name, description, is_system) VALUES
  ('70000000-0000-4000-8000-000000000001', 'admin', 'Acceso completo a la aplicación', true);
INSERT INTO auth.role_permission (role_id, permission_key)
  SELECT '70000000-0000-4000-8000-000000000001', key FROM auth.permission;
