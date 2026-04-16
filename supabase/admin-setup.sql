-- ============================================================
-- MANTIX - ADMIN SETUP
-- Ejecutar DESPUÉS de schema.sql en Supabase SQL Editor
-- Habilita el panel de administración del super admin
-- ============================================================

-- ── Paso 1: Agregar campos adicionales ────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_sharing_consent BOOLEAN DEFAULT FALSE;

-- ── Paso 2: Función de seguridad para verificar super admin ──────────────────
-- SECURITY DEFINER evita recursión infinita en las políticas RLS

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()),
    FALSE
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Paso 3: Políticas RLS para super admin ────────────────────────────────────
-- El super admin puede leer y modificar datos de TODAS las empresas

-- companies
DROP POLICY IF EXISTS "Super admin can read all companies" ON companies;
CREATE POLICY "Super admin can read all companies"
  ON companies FOR SELECT
  USING (public.is_super_admin() = TRUE);

DROP POLICY IF EXISTS "Super admin can update all companies" ON companies;
CREATE POLICY "Super admin can update all companies"
  ON companies FOR UPDATE
  USING (public.is_super_admin() = TRUE);

-- profiles
DROP POLICY IF EXISTS "Super admin can read all profiles" ON profiles;
CREATE POLICY "Super admin can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_super_admin() = TRUE);

DROP POLICY IF EXISTS "Super admin can update all profiles" ON profiles;
CREATE POLICY "Super admin can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_super_admin() = TRUE);

-- locations
DROP POLICY IF EXISTS "Super admin can read all locations" ON locations;
CREATE POLICY "Super admin can read all locations"
  ON locations FOR SELECT
  USING (public.is_super_admin() = TRUE);

-- assets
DROP POLICY IF EXISTS "Super admin can read all assets" ON assets;
CREATE POLICY "Super admin can read all assets"
  ON assets FOR SELECT
  USING (public.is_super_admin() = TRUE);

-- providers
DROP POLICY IF EXISTS "Super admin can read all providers" ON providers;
CREATE POLICY "Super admin can read all providers"
  ON providers FOR SELECT
  USING (public.is_super_admin() = TRUE);

-- work_orders
DROP POLICY IF EXISTS "Super admin can read all work_orders" ON work_orders;
CREATE POLICY "Super admin can read all work_orders"
  ON work_orders FOR SELECT
  USING (public.is_super_admin() = TRUE);

-- failure_events
DROP POLICY IF EXISTS "Super admin can read all failure_events" ON failure_events;
CREATE POLICY "Super admin can read all failure_events"
  ON failure_events FOR SELECT
  USING (public.is_super_admin() = TRUE);

-- maintenance_budget
DROP POLICY IF EXISTS "Super admin can read all maintenance_budget" ON maintenance_budget;
CREATE POLICY "Super admin can read all maintenance_budget"
  ON maintenance_budget FOR SELECT
  USING (public.is_super_admin() = TRUE);

-- ── Paso 4: Activar super admin ───────────────────────────────────────────────
-- IMPORTANTE: Ejecutar SOLO DESPUÉS de que el usuario cree su cuenta
-- en /auth/signup con el email rosenblattnicolas@gmail.com

UPDATE profiles
SET is_super_admin = TRUE
WHERE email = 'rosenblattnicolas@gmail.com';

-- Verificar que se aplicó:
-- SELECT id, email, is_super_admin FROM profiles WHERE email = 'rosenblattnicolas@gmail.com';

-- ============================================================
-- FIN DE ADMIN SETUP
-- ============================================================
