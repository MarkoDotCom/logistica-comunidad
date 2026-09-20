-- =============================================================================
-- Datos de ejemplo — ejecutar después de schema.sql
--   psql -d <db> -f seed.sql
-- UUIDs fijos para poder consultarlos a mano:
--   1... comunidad | 2... edificios | 3... departamentos | 4... cuentas | 5... usuarios
-- =============================================================================
BEGIN;

-- Comunidad ------------------------------------------------------------------
INSERT INTO units.unit (id, parent_id, kind, code, name) VALUES
  ('10000000-0000-4000-8000-000000000001', NULL, 'community', 'los-alamos', 'Condominio Los Álamos');

-- Edificios ------------------------------------------------------------------
INSERT INTO units.unit (id, parent_id, kind, code, name) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'building', 'A', 'Torre A'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'building', 'B', 'Torre B');

-- Departamentos --------------------------------------------------------------
INSERT INTO units.unit (id, parent_id, kind, code, name) VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'apartment', '101', NULL),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'apartment', '102', NULL),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'apartment', '101', NULL),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'apartment', '201', NULL);

-- Cuentas de cobro (una por departamento) ------------------------------------
INSERT INTO units.unit (id, parent_id, kind, code, name) VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'account', 'GC', 'Gastos comunes A-101'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'account', 'GC', 'Gastos comunes A-102'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'account', 'GC', 'Gastos comunes B-101'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'account', 'GC', 'Gastos comunes B-201');

-- Usuarios -------------------------------------------------------------------
INSERT INTO users.app_user (id, email, external_auth_id, full_name, phone) VALUES
  ('50000000-0000-4000-8000-000000000001', 'admin@losalamos.example.com', 'auth|admin',  'Marcela Soto',  '+56 9 1111 1111'),
  ('50000000-0000-4000-8000-000000000002', 'ana.rojas@example.com',       'auth|ana',    'Ana Rojas',     '+56 9 2222 2222'),
  ('50000000-0000-4000-8000-000000000003', 'bruno.diaz@example.com',      'auth|bruno',  'Bruno Díaz',    NULL),
  ('50000000-0000-4000-8000-000000000004', 'carla.munoz@example.com',     'auth|carla',  'Carla Muñoz',   '+56 9 4444 4444'),
  ('50000000-0000-4000-8000-000000000005', 'conserje@losalamos.example.com', 'auth|conserje', 'Diego Pérez', NULL);

-- Membresías -----------------------------------------------------------------
-- Marcela administra la comunidad; Ana es dueña de A-101 y B-201; Bruno dueño de A-102;
-- Carla arrienda A-101; Diego es conserje de la Torre A.
INSERT INTO users.unit_member (unit_id, user_id, role) VALUES
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'admin'),
  ('30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'owner'),
  ('30000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', 'owner'),
  ('30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', 'owner'),
  ('30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000004', 'tenant'),
  ('20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000005', 'staff');

COMMIT;
