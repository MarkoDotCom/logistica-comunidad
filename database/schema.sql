-- =============================================================================
-- Gestión logística de comunidad de vivienda — esquema PostgreSQL 13+
-- Esquemas: units (árbol de unidades), users (cuentas y contratos) y public (enums y función compartida)
-- Ejecutar: psql -d <db> -f schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA units;   -- comunidad, edificios, departamentos, cuentas
CREATE SCHEMA users;   -- cuentas de usuario y sus contratos con las unidades

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
-- La jerarquía es flexible: cualquier unidad puede colgar de cualquier otra;
-- solo se exige que community sea raíz y que el resto tenga padre.
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
