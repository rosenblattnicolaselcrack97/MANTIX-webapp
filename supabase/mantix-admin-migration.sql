-- ============================================================
-- MANTIX - Admin System Migration v1
-- Sistema de SuperAdmin + Admin de Mantix
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ejecutar ESTE ARCHIVO completo en Supabase → SQL Editor
-- 2. Luego ejecutar el bloque "PASO FINAL" al final de este archivo
--    (requiere editar tu email y el ID de la empresa Mantix)
-- ============================================================

-- ── PASO 1: Columnas nuevas en profiles ──────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_mantix_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login      TIMESTAMPTZ;

-- ── PASO 2: Columnas nuevas en companies ─────────────────────────────────────

ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone   TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email   TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;

-- ── PASO 3: Tabla admin_company_assignments ───────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_company_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (admin_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_aca_admin_id   ON admin_company_assignments(admin_id);
CREATE INDEX IF NOT EXISTS idx_aca_company_id ON admin_company_assignments(company_id);

ALTER TABLE admin_company_assignments ENABLE ROW LEVEL SECURITY;

-- ── PASO 4: Funciones helper SECURITY DEFINER ─────────────────────────────────

-- Verificar si el usuario actual es MantixAdmin
CREATE OR REPLACE FUNCTION public.is_mantix_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_mantix_admin FROM profiles WHERE id = auth.uid()),
    FALSE
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Obtener IDs de empresas asignadas al MantixAdmin actual
CREATE OR REPLACE FUNCTION public.get_assigned_company_ids()
RETURNS SETOF UUID AS $$
  SELECT company_id
  FROM admin_company_assignments
  WHERE admin_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PASO 5: RLS - admin_company_assignments ───────────────────────────────────

DROP POLICY IF EXISTS "SuperAdmin manages all assignments"   ON admin_company_assignments;
DROP POLICY IF EXISTS "MantixAdmin views own assignments"    ON admin_company_assignments;

CREATE POLICY "SuperAdmin manages all assignments"
  ON admin_company_assignments FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin views own assignments"
  ON admin_company_assignments FOR SELECT
  USING (admin_id = auth.uid());

-- ── PASO 6: Actualizar políticas RLS existentes con bypass SuperAdmin ─────────

-- companies
DROP POLICY IF EXISTS "Users can view their own company"   ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "SuperAdmin full access companies"   ON companies;
DROP POLICY IF EXISTS "MantixAdmin view assigned companies" ON companies;

CREATE POLICY "SuperAdmin full access companies"
  ON companies FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin view assigned companies"
  ON companies FOR SELECT
  USING (
    public.is_mantix_admin() AND
    id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = public.get_my_company_id());

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (id = public.get_my_company_id());

-- profiles
DROP POLICY IF EXISTS "Users can view profiles in their company"            ON profiles;
DROP POLICY IF EXISTS "SuperAdmin full access profiles"                     ON profiles;
DROP POLICY IF EXISTS "MantixAdmin view profiles in assigned companies"     ON profiles;
DROP POLICY IF EXISTS "MantixAdmin view other Mantix admins"                ON profiles;

CREATE POLICY "SuperAdmin full access profiles"
  ON profiles FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin view profiles in assigned companies"
  ON profiles FOR SELECT
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "MantixAdmin view other Mantix admins"
  ON profiles FOR SELECT
  USING (
    public.is_mantix_admin() AND
    is_mantix_admin = TRUE
  );

CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    OR id = auth.uid()
  );

-- locations
DROP POLICY IF EXISTS "Users access own company locations"        ON locations;
DROP POLICY IF EXISTS "SuperAdmin full access locations"          ON locations;
DROP POLICY IF EXISTS "MantixAdmin access assigned locations"     ON locations;

CREATE POLICY "SuperAdmin full access locations"
  ON locations FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned locations"
  ON locations FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company locations"
  ON locations FOR ALL
  USING (company_id = public.get_my_company_id());

-- assets
DROP POLICY IF EXISTS "Users access own company assets"        ON assets;
DROP POLICY IF EXISTS "SuperAdmin full access assets"          ON assets;
DROP POLICY IF EXISTS "MantixAdmin access assigned assets"     ON assets;

CREATE POLICY "SuperAdmin full access assets"
  ON assets FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned assets"
  ON assets FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company assets"
  ON assets FOR ALL
  USING (company_id = public.get_my_company_id());

-- providers
DROP POLICY IF EXISTS "Users access own company providers"        ON providers;
DROP POLICY IF EXISTS "SuperAdmin full access providers"          ON providers;
DROP POLICY IF EXISTS "MantixAdmin access assigned providers"     ON providers;

CREATE POLICY "SuperAdmin full access providers"
  ON providers FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned providers"
  ON providers FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company providers"
  ON providers FOR ALL
  USING (company_id = public.get_my_company_id());

-- work_orders
DROP POLICY IF EXISTS "Users access own company work_orders"        ON work_orders;
DROP POLICY IF EXISTS "SuperAdmin full access work_orders"          ON work_orders;
DROP POLICY IF EXISTS "MantixAdmin access assigned work_orders"     ON work_orders;

CREATE POLICY "SuperAdmin full access work_orders"
  ON work_orders FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned work_orders"
  ON work_orders FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company work_orders"
  ON work_orders FOR ALL
  USING (company_id = public.get_my_company_id());

-- asset_status_history
DROP POLICY IF EXISTS "Users access own company asset_status_history"     ON asset_status_history;
DROP POLICY IF EXISTS "SuperAdmin full access asset_status_history"       ON asset_status_history;
DROP POLICY IF EXISTS "MantixAdmin access assigned asset_status_history"  ON asset_status_history;

CREATE POLICY "SuperAdmin full access asset_status_history"
  ON asset_status_history FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned asset_status_history"
  ON asset_status_history FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company asset_status_history"
  ON asset_status_history FOR ALL
  USING (company_id = public.get_my_company_id());

-- wo_status_history
DROP POLICY IF EXISTS "Users access own company wo_status_history"     ON wo_status_history;
DROP POLICY IF EXISTS "SuperAdmin full access wo_status_history"       ON wo_status_history;
DROP POLICY IF EXISTS "MantixAdmin access assigned wo_status_history"  ON wo_status_history;

CREATE POLICY "SuperAdmin full access wo_status_history"
  ON wo_status_history FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned wo_status_history"
  ON wo_status_history FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company wo_status_history"
  ON wo_status_history FOR ALL
  USING (company_id = public.get_my_company_id());

-- wo_labor
DROP POLICY IF EXISTS "Users access own company wo_labor"     ON wo_labor;
DROP POLICY IF EXISTS "SuperAdmin full access wo_labor"       ON wo_labor;
DROP POLICY IF EXISTS "MantixAdmin access assigned wo_labor"  ON wo_labor;

CREATE POLICY "SuperAdmin full access wo_labor"
  ON wo_labor FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned wo_labor"
  ON wo_labor FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company wo_labor"
  ON wo_labor FOR ALL
  USING (company_id = public.get_my_company_id());

-- wo_materials
DROP POLICY IF EXISTS "Users access own company wo_materials"     ON wo_materials;
DROP POLICY IF EXISTS "SuperAdmin full access wo_materials"       ON wo_materials;
DROP POLICY IF EXISTS "MantixAdmin access assigned wo_materials"  ON wo_materials;

CREATE POLICY "SuperAdmin full access wo_materials"
  ON wo_materials FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned wo_materials"
  ON wo_materials FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company wo_materials"
  ON wo_materials FOR ALL
  USING (company_id = public.get_my_company_id());

-- failure_events
DROP POLICY IF EXISTS "Users access own company failure_events"     ON failure_events;
DROP POLICY IF EXISTS "SuperAdmin full access failure_events"       ON failure_events;
DROP POLICY IF EXISTS "MantixAdmin access assigned failure_events"  ON failure_events;

CREATE POLICY "SuperAdmin full access failure_events"
  ON failure_events FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned failure_events"
  ON failure_events FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company failure_events"
  ON failure_events FOR ALL
  USING (company_id = public.get_my_company_id());

-- maintenance_budget
DROP POLICY IF EXISTS "Users access own company maintenance_budget"     ON maintenance_budget;
DROP POLICY IF EXISTS "SuperAdmin full access maintenance_budget"       ON maintenance_budget;
DROP POLICY IF EXISTS "MantixAdmin access assigned maintenance_budget"  ON maintenance_budget;

CREATE POLICY "SuperAdmin full access maintenance_budget"
  ON maintenance_budget FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "MantixAdmin access assigned maintenance_budget"
  ON maintenance_budget FOR ALL
  USING (
    public.is_mantix_admin() AND
    company_id IN (SELECT public.get_assigned_company_ids())
  );

CREATE POLICY "Users access own company maintenance_budget"
  ON maintenance_budget FOR ALL
  USING (company_id = public.get_my_company_id());


-- ============================================================
-- PASO FINAL (ejecutar DESPUÉS del bloque anterior)
-- ============================================================
-- 1. Crear empresa interna "Mantix"
INSERT INTO companies (name, plan, is_active, industry, country)
VALUES ('Mantix', 'enterprise', true, 'SaaS CMMS', 'AR')
ON CONFLICT DO NOTHING;

-- 2. Ver el ID de la empresa Mantix:
-- SELECT id, name FROM companies WHERE name = 'Mantix' AND industry = 'SaaS CMMS';

-- 3. Actualizar el perfil del SuperAdmin (Nicolas).
--    Reemplazar YOUR_EMAIL por tu email real y MANTIX_COMPANY_ID por el id del paso 2:
-- UPDATE profiles
-- SET is_super_admin = TRUE,
--     company_id = 'MANTIX_COMPANY_ID'
-- WHERE email = 'YOUR_EMAIL';

-- 4. Verificar:
-- SELECT id, email, is_super_admin, is_mantix_admin, company_id FROM profiles WHERE email = 'YOUR_EMAIL';
-- ============================================================
