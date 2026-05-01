-- ============================================================
-- MANTIX - ADMIN SETUP  (v2 — idempotente, re-ejecutable)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Funciona tanto para primera instalación como actualizaciones.
-- ============================================================

-- ── 1. Columnas adicionales ───────────────────────────────────────────────────

ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS is_super_admin       BOOLEAN     DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_sharing_consent  BOOLEAN     DEFAULT FALSE;

-- ── 2. Función auxiliar: get_my_company_id (SECURITY DEFINER) ─────────────────
-- Evita recursión infinita en las políticas RLS de profiles.
-- Las policies de otras tablas usan esta función en lugar de
-- una sub-query directa sobre profiles.

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 3. Función auxiliar: is_super_admin (SECURITY DEFINER) ───────────────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()),
    FALSE
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 4. Reparar política self-referencial en profiles ─────────────────────────
-- La versión original hace SELECT sobre profiles dentro de la policy de profiles,
-- lo que puede causar problemas en algunas versiones de PostgreSQL.
-- Usamos la función SECURITY DEFINER para evitarlo.

DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR id = auth.uid()
  );

-- Reparar las mismas políticas en las demás tablas (también usan sub-query directa)
DROP POLICY IF EXISTS "Users can view their own company"      ON companies;
DROP POLICY IF EXISTS "Users can update their own company"    ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = public.get_my_company_id());
CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company locations"    ON locations;
CREATE POLICY "Users access own company locations"
  ON locations FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company assets"       ON assets;
CREATE POLICY "Users access own company assets"
  ON assets FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company providers"    ON providers;
CREATE POLICY "Users access own company providers"
  ON providers FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company work_orders"  ON work_orders;
CREATE POLICY "Users access own company work_orders"
  ON work_orders FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company asset_status_history" ON asset_status_history;
CREATE POLICY "Users access own company asset_status_history"
  ON asset_status_history FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company wo_status_history" ON wo_status_history;
CREATE POLICY "Users access own company wo_status_history"
  ON wo_status_history FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company wo_labor"     ON wo_labor;
CREATE POLICY "Users access own company wo_labor"
  ON wo_labor FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company wo_materials" ON wo_materials;
CREATE POLICY "Users access own company wo_materials"
  ON wo_materials FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company failure_events" ON failure_events;
CREATE POLICY "Users access own company failure_events"
  ON failure_events FOR ALL
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users access own company maintenance_budget" ON maintenance_budget;
CREATE POLICY "Users access own company maintenance_budget"
  ON maintenance_budget FOR ALL
  USING (company_id = public.get_my_company_id());

-- ── 5. Políticas RLS para super admin ────────────────────────────────────────

DROP POLICY IF EXISTS "Super admin can read all companies"    ON companies;
CREATE POLICY "Super admin can read all companies"
  ON companies FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update all companies"  ON companies;
CREATE POLICY "Super admin can update all companies"
  ON companies FOR UPDATE USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can insert companies"      ON companies;
CREATE POLICY "Super admin can insert companies"
  ON companies FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can read all profiles"     ON profiles;
CREATE POLICY "Super admin can read all profiles"
  ON profiles FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update all profiles"   ON profiles;
CREATE POLICY "Super admin can update all profiles"
  ON profiles FOR UPDATE USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can insert profiles"       ON profiles;
CREATE POLICY "Super admin can insert profiles"
  ON profiles FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can read all locations"    ON locations;
CREATE POLICY "Super admin can read all locations"
  ON locations FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can read all assets"       ON assets;
CREATE POLICY "Super admin can read all assets"
  ON assets FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can read all providers"    ON providers;
CREATE POLICY "Super admin can read all providers"
  ON providers FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can read all work_orders"  ON work_orders;
CREATE POLICY "Super admin can read all work_orders"
  ON work_orders FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can read all failure_events" ON failure_events;
CREATE POLICY "Super admin can read all failure_events"
  ON failure_events FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can read all maintenance_budget" ON maintenance_budget;
CREATE POLICY "Super admin can read all maintenance_budget"
  ON maintenance_budget FOR SELECT USING (public.is_super_admin());

-- ── 6. Crear / actualizar perfil del super admin ─────────────────────────────
-- Ejecutar DESPUÉS de que el usuario haya creado su cuenta (existe en auth.users).

INSERT INTO profiles (id, email, full_name, role, is_super_admin)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) AS full_name,
  'admin',
  TRUE
FROM auth.users
WHERE email = 'rosenblattnicolas@gmail.com'
ON CONFLICT (id) DO UPDATE
  SET is_super_admin = TRUE,
      updated_at = NOW();

-- Inyectar is_super_admin en user_metadata (fallback en la app si el profile no carga)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                        || '{"is_super_admin": true}'::jsonb
WHERE email = 'rosenblattnicolas@gmail.com';

-- ── 7. Verificación (descomentar para chequear) ────────────────────────────
-- SELECT id, email, is_super_admin, company_id FROM profiles WHERE email = 'rosenblattnicolas@gmail.com';
-- SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'rosenblattnicolas@gmail.com';
-- SELECT public.is_super_admin();   -- ejecutar como el super admin vía RPC o SQL editor mientras logueado

-- ============================================================
-- FIN DE ADMIN SETUP
-- ============================================================
