-- =============================================================================
-- Gestión logística de comunidad de vivienda — esquema PostgreSQL 13+
-- Esquemas: units (árbol de unidades) y public (enums y función compartida)
-- Ejecutar: psql -d <db> -f schema.sql
-- =============================================================================

CREATE SCHEMA units;   -- comunidad, edificios, departamentos, cuentas

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
-- Para agregar un nivel (torre, piso, estacionamiento...): ALTER TYPE unit_kind ADD VALUE '...';
CREATE TYPE unit_kind AS ENUM ('community', 'building', 'apartment', 'account');

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
