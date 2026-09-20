-- =============================================================================
-- Gestión logística de comunidad de vivienda — esquema PostgreSQL 13+
-- Esquemas: units (árbol de unidades), users (cuentas y membresías) y public (enums y función compartida)
-- Ejecutar: psql -d <db> -f schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA units;   -- comunidad, edificios, departamentos, cuentas
CREATE SCHEMA users;   -- cuentas de usuario y su rol sobre las unidades

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
-- Para agregar un nivel (torre, piso, estacionamiento...): ALTER TYPE unit_kind ADD VALUE '...';
CREATE TYPE unit_kind AS ENUM ('community', 'building', 'apartment', 'account');
-- admin = administrador de la comunidad, owner = propietario, tenant = arrendatario, staff = conserje/personal
CREATE TYPE unit_role AS ENUM ('admin', 'owner', 'tenant', 'staff');

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
CREATE TABLE units.unit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid REFERENCES units.unit(id) ON DELETE CASCADE,
  kind       unit_kind NOT NULL,
  code       text NOT NULL,                     -- identificador visible: "Torre A", "1203", "GC"
  name       text,                              -- nombre descriptivo opcional
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_root_is_community CHECK ((kind = 'community') = (parent_id IS NULL)),
  CONSTRAINT unit_not_own_parent    CHECK (parent_id IS DISTINCT FROM id)
);
-- Sin códigos repetidos entre hermanos ni entre comunidades raíz
CREATE UNIQUE INDEX unit_sibling_code_uq ON units.unit (parent_id, code) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX unit_root_code_uq    ON units.unit (code)            WHERE parent_id IS NULL;
CREATE INDEX unit_kind_idx ON units.unit (kind);

CREATE TRIGGER unit_updated_at BEFORE UPDATE ON units.unit
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 2. Usuarios y membresías
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

-- Rol de un usuario sobre una unidad. El rol aplica a la unidad y a todo su subárbol:
-- admin sobre la community, owner/tenant sobre un apartment, staff sobre community o building.
CREATE TABLE users.unit_member (
  unit_id    uuid NOT NULL REFERENCES units.unit(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users.app_user(id) ON DELETE CASCADE,
  role       unit_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unit_id, user_id, role)
);
CREATE INDEX unit_member_user_idx ON users.unit_member (user_id);
