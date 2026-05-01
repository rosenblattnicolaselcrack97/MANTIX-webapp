-- ============================================================
-- MANTIX — SCHEMA COMPLETO v3
-- Base de datos multi-tenant para gestión de mantenimiento (CMMS)
--
-- INSTRUCCIONES:
--   Ejecutar en Supabase Dashboard → SQL Editor
--   Este archivo es IDEMPOTENTE (se puede correr múltiples veces)
--   Incluye: schema base + migraciones + admin setup
--
-- SECCIONES:
--   1.  Extensiones
--   2.  Funciones helper (security definer)
--   3.  Tablas core: companies, profiles
--   4.  Tablas operativas: locations, branch_areas, assets, providers
--   5.  Tablas de trabajo: work_orders + historial/materiales/mano de obra
--   6.  Módulos nuevos: categories, automations, parts, part_transactions
--   7.  Módulos de soporte: failure_events, maintenance_budget
--   8.  Email + notificaciones
--   9.  Storage buckets (user-avatars, company-logos, asset-docs)
--  10.  Índices de performance
--  11.  RLS: habilitar en todas las tablas
--  12.  Políticas RLS (user, super_admin, mantix_admin)
--  13.  Triggers updated_at
--  14.  Setup super admin (Nicolas)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- 2. FUNCIONES HELPER (SECURITY DEFINER — sin recursión RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_super_admin FROM profiles WHERE id = auth.uid()), FALSE)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_mantix_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_mantix_admin FROM profiles WHERE id = auth.uid()), FALSE)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_assigned_company_ids()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM admin_company_assignments WHERE admin_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.normalize_company_text(value TEXT)
RETURNS TEXT AS $$
  SELECT NULLIF(
    UPPER(REGEXP_REPLACE(UNACCENT(TRIM(COALESCE(value, ''))), '\s+', ' ', 'g')),
    ''
  );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.set_provider_normalized_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name = public.normalize_company_text(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. TABLAS CORE
-- ============================================================

-- ── companies ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT        NOT NULL,
  industry              TEXT,
  cuit                  TEXT,
  country               TEXT        DEFAULT 'AR',
  city                  TEXT,
  address               TEXT,
  phone                 TEXT,
  email                 TEXT,
  logo_url              TEXT,
  plan                  TEXT        DEFAULT 'trial',
  is_active             BOOLEAN     DEFAULT TRUE,
  description           TEXT,
  theme_mode            TEXT        DEFAULT 'system',
  primary_color         TEXT        DEFAULT '#0ea5e9',
  secondary_color       TEXT        DEFAULT '#14b8a6',
  font_family           TEXT,
  font_size             TEXT        DEFAULT 'mediana',
  email_cc_admin        BOOLEAN     DEFAULT FALSE,
  email_template_header TEXT,
  email_template_footer TEXT,
  data_sharing_consent  BOOLEAN     DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                       UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id               UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name                TEXT        NOT NULL,
  first_name               TEXT,
  last_name                TEXT,
  display_name             TEXT,
  email                    TEXT        NOT NULL,
  role                     TEXT        DEFAULT 'admin',
  phone                    TEXT,
  avatar_url               TEXT,
  is_active                BOOLEAN     DEFAULT TRUE,
  is_super_admin           BOOLEAN     DEFAULT FALSE,
  is_mantix_admin          BOOLEAN     DEFAULT FALSE,
  last_login               TIMESTAMPTZ,
  theme_preference         TEXT        DEFAULT 'system',
  notification_preferences JSONB       DEFAULT '{"web": true}'::jsonb,
  email_preferences        JSONB       DEFAULT '{"enabled": true}'::jsonb,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── admin_company_assignments ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_company_assignments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (admin_id, company_id)
);

-- ============================================================
-- 4. TABLAS OPERATIVAS
-- ============================================================

-- ── locations (sucursales) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.locations (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  address     TEXT,
  city        TEXT,
  description TEXT,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── branch_areas (áreas dentro de una sucursal) ───────────────
CREATE TABLE IF NOT EXISTS public.branch_areas (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id   UUID        NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  status      TEXT        NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT branch_areas_status_check CHECK (status IN ('active', 'inactive'))
);

-- ── categories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL,   -- 'asset', 'work_order', 'part'
  color       TEXT        DEFAULT '#1e7aff',
  description TEXT,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT categories_type_check CHECK (type IN ('asset', 'work_order', 'part'))
);

-- ── assets ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
  id                           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                   UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id                  UUID        REFERENCES public.locations(id) ON DELETE SET NULL,
  area_id                      UUID        REFERENCES public.branch_areas(id) ON DELETE SET NULL,
  category_id                  UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  responsible_profile_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  name                         TEXT        NOT NULL,
  internal_code                TEXT,
  category                     TEXT,
  subcategory                  TEXT,
  manufacturer                 TEXT,
  model                        TEXT,
  serial_number                TEXT,
  manufacturing_year           INT,
  acquisition_value            NUMERIC(12,2),
  acquisition_currency         TEXT,
  status                       TEXT        DEFAULT 'operative',
  status_detail                TEXT,
  criticality                  TEXT        DEFAULT 'medium',
  last_maintenance_at          TIMESTAMPTZ,
  next_maintenance_at          TIMESTAMPTZ,
  pm_frequency_days            INT,
  maintenance_frequency_number INT,
  maintenance_frequency_unit   TEXT,
  responsible_name             TEXT,
  user_manual_url              TEXT,
  maintenance_pdf_url          TEXT,
  external_document_url        TEXT,
  notes                        TEXT,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT assets_frequency_unit_check CHECK (
    maintenance_frequency_unit IS NULL OR
    maintenance_frequency_unit IN ('days', 'months', 'years')
  )
);

-- ── asset_documents ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_documents (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id       UUID        NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  document_type  TEXT        NOT NULL DEFAULT 'document',
  file_name      TEXT,
  storage_bucket TEXT,
  storage_path   TEXT,
  external_url   TEXT,
  notes          TEXT,
  created_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── providers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.providers (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  normalized_name     TEXT,
  category            TEXT,
  supplier_type       TEXT,
  specialty           TEXT,
  contact_name        TEXT,
  main_contact_name   TEXT,
  phone               TEXT,
  main_phone          TEXT,
  secondary_phone     TEXT,
  whatsapp            TEXT,
  email               TEXT,
  main_email          TEXT,
  secondary_email     TEXT,
  website             TEXT,
  tax_id              TEXT,
  address             TEXT,
  city                TEXT,
  state               TEXT,
  country             TEXT,
  payment_terms       TEXT,
  currency            TEXT,
  rating              NUMERIC(3,2) DEFAULT 0,
  total_jobs          INT         DEFAULT 0,
  notes               TEXT,
  is_active           BOOLEAN     DEFAULT TRUE,
  status              TEXT        NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT providers_status_check CHECK (status IN ('active', 'inactive', 'pending', 'blocked'))
);

-- ── supplier_contacts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID        NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  role        TEXT,
  email       TEXT,
  phone       TEXT,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── asset_suppliers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_suppliers (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id          UUID        NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  supplier_id       UUID        NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  relationship_type TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, asset_id, supplier_id)
);

-- ============================================================
-- 5. TABLAS DE TRABAJO (WORK ORDERS)
-- ============================================================

-- ── work_orders ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.work_orders (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id        UUID        REFERENCES public.assets(id) ON DELETE SET NULL,
  location_id     UUID        REFERENCES public.locations(id) ON DELETE SET NULL,
  area_id         UUID        REFERENCES public.branch_areas(id) ON DELETE SET NULL,
  provider_id     UUID        REFERENCES public.providers(id) ON DELETE SET NULL,
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id     UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  wo_number       TEXT,
  title           TEXT        NOT NULL,
  description     TEXT,
  type            TEXT        DEFAULT 'corrective',
  origin          TEXT        DEFAULT 'manual',
  priority        TEXT        DEFAULT 'medium',
  status          TEXT        DEFAULT 'pending',
  resolution_type TEXT,
  estimated_cost  NUMERIC(12,2),
  actual_cost     NUMERIC(12,2),
  planned_start   TIMESTAMPTZ,
  planned_end     TIMESTAMPTZ,
  actual_start    TIMESTAMPTZ,
  actual_end      TIMESTAMPTZ,
  due_date        TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── work_order_suppliers ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.work_order_suppliers (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_order_id UUID        NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  supplier_id   UUID        NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  role          TEXT,
  quote_status  TEXT,
  selected      BOOLEAN     NOT NULL DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, work_order_id, supplier_id)
);

-- ── asset_status_history ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_status_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id    UUID        NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT        NOT NULL,
  changed_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── wo_status_history ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wo_status_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id       UUID        NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT        NOT NULL,
  changed_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── wo_labor ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wo_labor (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id       UUID        NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_id UUID        REFERENCES public.providers(id) ON DELETE SET NULL,
  technician  TEXT,
  hours       NUMERIC(6,2) NOT NULL,
  hourly_rate NUMERIC(10,2),
  work_date   DATE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── wo_materials ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wo_materials (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id       UUID        NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  part_id     UUID,                   -- FK added after parts table is created (see below)
  description TEXT        NOT NULL,
  quantity    NUMERIC(10,3) DEFAULT 1,
  unit_cost   NUMERIC(10,2),
  total_cost  NUMERIC(12,2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. MÓDULOS NUEVOS
-- ============================================================

-- ── automations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  trigger_type    TEXT        NOT NULL,
  action_type     TEXT        NOT NULL,
  trigger_config  JSONB       DEFAULT '{}'::jsonb,
  action_config   JSONB       DEFAULT '{}'::jsonb,
  is_active       BOOLEAN     DEFAULT TRUE,
  last_triggered  TIMESTAMPTZ,
  trigger_count   INT         DEFAULT 0,
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── parts (inventario de repuestos) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.parts (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID         NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id   UUID         REFERENCES public.locations(id) ON DELETE SET NULL,
  supplier_id   UUID         REFERENCES public.providers(id) ON DELETE SET NULL,
  category_id   UUID         REFERENCES public.categories(id) ON DELETE SET NULL,
  name          TEXT         NOT NULL,
  sku           TEXT,
  category      TEXT,
  unit          TEXT         DEFAULT 'unidad',
  stock_current NUMERIC(12,3) NOT NULL DEFAULT 0,
  stock_min     NUMERIC(12,3) NOT NULL DEFAULT 0,
  stock_max     NUMERIC(12,3),
  unit_cost     NUMERIC(12,2),
  notes         TEXT,
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── part_transactions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.part_transactions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  part_id        UUID        NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  wo_id          UUID        REFERENCES public.work_orders(id) ON DELETE SET NULL,
  type           TEXT        NOT NULL,   -- 'in', 'out', 'adjustment'
  quantity       NUMERIC(12,3) NOT NULL,
  unit_cost      NUMERIC(12,2),
  notes          TEXT,
  created_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from wo_materials.part_id → parts (deferred to after parts is created)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wo_materials_part_id_fkey'
  ) THEN
    ALTER TABLE public.wo_materials
      ADD CONSTRAINT wo_materials_part_id_fkey
      FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 7. MÓDULOS DE SOPORTE
-- ============================================================

-- ── failure_events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.failure_events (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id          UUID        NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  company_id        UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wo_id             UUID        REFERENCES public.work_orders(id) ON DELETE SET NULL,
  failure_type      TEXT,
  description       TEXT,
  detected_at       TIMESTAMPTZ NOT NULL,
  repaired_at       TIMESTAMPTZ,
  downtime_hours    NUMERIC(8,2),
  repair_cost       NUMERIC(12,2),
  root_cause        TEXT,
  corrective_action TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── maintenance_budget ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_budget (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id    UUID        REFERENCES public.locations(id) ON DELETE SET NULL,
  fiscal_year    INT         NOT NULL,
  month          INT,
  budget_type    TEXT        DEFAULT 'opex',
  category       TEXT,
  planned_amount NUMERIC(12,2) NOT NULL,
  actual_amount  NUMERIC(12,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. EMAIL + NOTIFICACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  entity_type   TEXT,
  entity_id     UUID,
  event_type    TEXT,
  direction     TEXT        NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  from_email    TEXT,
  to_email      TEXT        NOT NULL,
  subject       TEXT,
  provider      TEXT,
  provider_id   TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened')),
  error_message TEXT,
  metadata      JSONB,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_threads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type     TEXT        NOT NULL,
  entity_id       UUID        NOT NULL,
  thread_key      TEXT        UNIQUE NOT NULL,
  reply_to_email  TEXT,
  subject_prefix  TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id           UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type       TEXT,
  entity_id         UUID,
  notification_type TEXT        NOT NULL,
  title             TEXT,
  body              TEXT,
  email_event_id    UUID        REFERENCES public.email_events(id) ON DELETE SET NULL,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars',  'user-avatars',  true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('asset-docs',    'asset-docs',    false) ON CONFLICT (id) DO NOTHING;

-- Storage policies: user avatars
DROP POLICY IF EXISTS "Public read user avatars"  ON storage.objects;
DROP POLICY IF EXISTS "User avatar owner insert"  ON storage.objects;
DROP POLICY IF EXISTS "User avatar owner update"  ON storage.objects;
DROP POLICY IF EXISTS "User avatar owner delete"  ON storage.objects;

CREATE POLICY "Public read user avatars" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "User avatar owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "User avatar owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "User avatar owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies: company logos
DROP POLICY IF EXISTS "Public read company logos"   ON storage.objects;
DROP POLICY IF EXISTS "Company admin logo insert"   ON storage.objects;
DROP POLICY IF EXISTS "Company admin logo update"   ON storage.objects;
DROP POLICY IF EXISTS "Company admin logo delete"   ON storage.objects;

CREATE POLICY "Public read company logos" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
CREATE POLICY "Company admin logo insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true
      AND p.company_id::text = (storage.foldername(name))[1]
      AND lower(coalesce(p.role, '')) IN ('admin', 'manager')
  ));
CREATE POLICY "Company admin logo update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true
      AND p.company_id::text = (storage.foldername(name))[1]
      AND lower(coalesce(p.role, '')) IN ('admin', 'manager')
  ))
  WITH CHECK (bucket_id = 'company-logos' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true
      AND p.company_id::text = (storage.foldername(name))[1]
      AND lower(coalesce(p.role, '')) IN ('admin', 'manager')
  ));
CREATE POLICY "Company admin logo delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true
      AND p.company_id::text = (storage.foldername(name))[1]
      AND lower(coalesce(p.role, '')) IN ('admin', 'manager')
  ));

-- ============================================================
-- 10. ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_companies_theme_mode              ON public.companies(theme_mode);
CREATE INDEX IF NOT EXISTS idx_profiles_company                  ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_theme_preference         ON public.profiles(theme_preference);
CREATE INDEX IF NOT EXISTS idx_aca_admin_id                      ON public.admin_company_assignments(admin_id);
CREATE INDEX IF NOT EXISTS idx_aca_company_id                    ON public.admin_company_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_locations_company                 ON public.locations(company_id);
CREATE INDEX IF NOT EXISTS idx_branch_areas_company              ON public.branch_areas(company_id);
CREATE INDEX IF NOT EXISTS idx_branch_areas_branch               ON public.branch_areas(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_areas_status               ON public.branch_areas(company_id, status);
CREATE INDEX IF NOT EXISTS idx_categories_company_type           ON public.categories(company_id, type);
CREATE INDEX IF NOT EXISTS idx_assets_company                    ON public.assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_location                   ON public.assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_status                     ON public.assets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_area                       ON public.assets(area_id);
CREATE INDEX IF NOT EXISTS idx_assets_responsible_profile        ON public.assets(company_id, responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset             ON public.asset_documents(company_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_providers_company                 ON public.providers(company_id);
CREATE INDEX IF NOT EXISTS idx_providers_normalized_name         ON public.providers(company_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_providers_status                  ON public.providers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier        ON public.supplier_contacts(company_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_asset_suppliers_supplier          ON public.asset_suppliers(company_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_asset_suppliers_asset             ON public.asset_suppliers(company_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_work_order_suppliers_order        ON public.work_order_suppliers(company_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company               ON public.work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status                ON public.work_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset                 ON public.work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_due                   ON public.work_orders(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_automations_company               ON public.automations(company_id);
CREATE INDEX IF NOT EXISTS idx_automations_active                ON public.automations(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_parts_company                     ON public.parts(company_id);
CREATE INDEX IF NOT EXISTS idx_parts_stock                       ON public.parts(company_id, stock_current, stock_min);
CREATE INDEX IF NOT EXISTS idx_part_transactions_part            ON public.part_transactions(company_id, part_id);
CREATE INDEX IF NOT EXISTS idx_failure_events_asset              ON public.failure_events(asset_id, detected_at);
CREATE INDEX IF NOT EXISTS idx_email_events_company              ON public.email_events(company_id);
CREATE INDEX IF NOT EXISTS idx_email_events_entity               ON public.email_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_user             ON public.notification_log(user_id);

-- ============================================================
-- 11. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE public.companies                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_company_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_areas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_suppliers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_status_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_status_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_labor                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_materials             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failure_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_budget       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. POLÍTICAS RLS
-- Patrón: SuperAdmin → MantixAdmin → User (multi-tenant)
-- ============================================================

-- ── Helper macro: drop + recreate por tabla ───────────────────

-- admin_company_assignments
DROP POLICY IF EXISTS "SuperAdmin manages all assignments"  ON public.admin_company_assignments;
DROP POLICY IF EXISTS "MantixAdmin views own assignments"   ON public.admin_company_assignments;
CREATE POLICY "SuperAdmin manages all assignments"  ON public.admin_company_assignments FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin views own assignments"   ON public.admin_company_assignments FOR SELECT USING (admin_id = auth.uid());

-- companies
DROP POLICY IF EXISTS "SuperAdmin full access companies"        ON public.companies;
DROP POLICY IF EXISTS "MantixAdmin view assigned companies"     ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company"        ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company"      ON public.companies;
CREATE POLICY "SuperAdmin full access companies"       ON public.companies FOR ALL    USING (public.is_super_admin());
CREATE POLICY "MantixAdmin view assigned companies"    ON public.companies FOR SELECT USING (public.is_mantix_admin() AND id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users can view their own company"       ON public.companies FOR SELECT USING (id = public.get_my_company_id());
CREATE POLICY "Users can update their own company"     ON public.companies FOR UPDATE USING (id = public.get_my_company_id());

-- profiles
DROP POLICY IF EXISTS "SuperAdmin full access profiles"                        ON public.profiles;
DROP POLICY IF EXISTS "MantixAdmin view profiles in assigned companies"        ON public.profiles;
DROP POLICY IF EXISTS "MantixAdmin view other Mantix admins"                   ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company"               ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"                           ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"                           ON public.profiles;
CREATE POLICY "SuperAdmin full access profiles"                        ON public.profiles FOR ALL    USING (public.is_super_admin());
CREATE POLICY "MantixAdmin view profiles in assigned companies"        ON public.profiles FOR SELECT USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "MantixAdmin view other Mantix admins"                   ON public.profiles FOR SELECT USING (public.is_mantix_admin() AND is_mantix_admin = TRUE);
CREATE POLICY "Users can view profiles in their company"               ON public.profiles FOR SELECT USING (company_id = public.get_my_company_id() OR id = auth.uid());
CREATE POLICY "Users can update own profile"                           ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile"                           ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- locations
DROP POLICY IF EXISTS "SuperAdmin full access locations"      ON public.locations;
DROP POLICY IF EXISTS "MantixAdmin access assigned locations" ON public.locations;
DROP POLICY IF EXISTS "Users access own company locations"    ON public.locations;
CREATE POLICY "SuperAdmin full access locations"      ON public.locations FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned locations" ON public.locations FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company locations"    ON public.locations FOR ALL USING (company_id = public.get_my_company_id());

-- branch_areas
DROP POLICY IF EXISTS "Users access own company branch_areas" ON public.branch_areas;
CREATE POLICY "Users access own company branch_areas" ON public.branch_areas FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- categories
DROP POLICY IF EXISTS "Users access own company categories" ON public.categories;
CREATE POLICY "Users access own company categories" ON public.categories FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- assets
DROP POLICY IF EXISTS "SuperAdmin full access assets"      ON public.assets;
DROP POLICY IF EXISTS "MantixAdmin access assigned assets" ON public.assets;
DROP POLICY IF EXISTS "Users access own company assets"    ON public.assets;
CREATE POLICY "SuperAdmin full access assets"      ON public.assets FOR ALL    USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned assets" ON public.assets FOR ALL    USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company assets"    ON public.assets FOR ALL    USING (company_id = public.get_my_company_id());

-- asset_documents
DROP POLICY IF EXISTS "Users access own company asset_documents" ON public.asset_documents;
CREATE POLICY "Users access own company asset_documents" ON public.asset_documents FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- providers
DROP POLICY IF EXISTS "SuperAdmin full access providers"      ON public.providers;
DROP POLICY IF EXISTS "MantixAdmin access assigned providers" ON public.providers;
DROP POLICY IF EXISTS "Users access own company providers"    ON public.providers;
CREATE POLICY "SuperAdmin full access providers"      ON public.providers FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned providers" ON public.providers FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company providers"    ON public.providers FOR ALL USING (company_id = public.get_my_company_id());

-- supplier_contacts
DROP POLICY IF EXISTS "Users access own company supplier_contacts" ON public.supplier_contacts;
CREATE POLICY "Users access own company supplier_contacts" ON public.supplier_contacts FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- asset_suppliers
DROP POLICY IF EXISTS "Users access own company asset_suppliers" ON public.asset_suppliers;
CREATE POLICY "Users access own company asset_suppliers" ON public.asset_suppliers FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- work_orders
DROP POLICY IF EXISTS "SuperAdmin full access work_orders"      ON public.work_orders;
DROP POLICY IF EXISTS "MantixAdmin access assigned work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users access own company work_orders"    ON public.work_orders;
CREATE POLICY "SuperAdmin full access work_orders"      ON public.work_orders FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned work_orders" ON public.work_orders FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company work_orders"    ON public.work_orders FOR ALL USING (company_id = public.get_my_company_id());

-- work_order_suppliers
DROP POLICY IF EXISTS "Users access own company work_order_suppliers" ON public.work_order_suppliers;
CREATE POLICY "Users access own company work_order_suppliers" ON public.work_order_suppliers FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- asset_status_history
DROP POLICY IF EXISTS "SuperAdmin full access asset_status_history"       ON public.asset_status_history;
DROP POLICY IF EXISTS "MantixAdmin access assigned asset_status_history"  ON public.asset_status_history;
DROP POLICY IF EXISTS "Users access own company asset_status_history"     ON public.asset_status_history;
CREATE POLICY "SuperAdmin full access asset_status_history"       ON public.asset_status_history FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned asset_status_history"  ON public.asset_status_history FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company asset_status_history"     ON public.asset_status_history FOR ALL USING (company_id = public.get_my_company_id());

-- wo_status_history
DROP POLICY IF EXISTS "SuperAdmin full access wo_status_history"       ON public.wo_status_history;
DROP POLICY IF EXISTS "MantixAdmin access assigned wo_status_history"  ON public.wo_status_history;
DROP POLICY IF EXISTS "Users access own company wo_status_history"     ON public.wo_status_history;
CREATE POLICY "SuperAdmin full access wo_status_history"       ON public.wo_status_history FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned wo_status_history"  ON public.wo_status_history FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company wo_status_history"     ON public.wo_status_history FOR ALL USING (company_id = public.get_my_company_id());

-- wo_labor
DROP POLICY IF EXISTS "SuperAdmin full access wo_labor"       ON public.wo_labor;
DROP POLICY IF EXISTS "MantixAdmin access assigned wo_labor"  ON public.wo_labor;
DROP POLICY IF EXISTS "Users access own company wo_labor"     ON public.wo_labor;
CREATE POLICY "SuperAdmin full access wo_labor"       ON public.wo_labor FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned wo_labor"  ON public.wo_labor FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company wo_labor"     ON public.wo_labor FOR ALL USING (company_id = public.get_my_company_id());

-- wo_materials
DROP POLICY IF EXISTS "SuperAdmin full access wo_materials"       ON public.wo_materials;
DROP POLICY IF EXISTS "MantixAdmin access assigned wo_materials"  ON public.wo_materials;
DROP POLICY IF EXISTS "Users access own company wo_materials"     ON public.wo_materials;
CREATE POLICY "SuperAdmin full access wo_materials"       ON public.wo_materials FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned wo_materials"  ON public.wo_materials FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company wo_materials"     ON public.wo_materials FOR ALL USING (company_id = public.get_my_company_id());

-- automations
DROP POLICY IF EXISTS "Users access own company automations" ON public.automations;
CREATE POLICY "Users access own company automations" ON public.automations FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- parts
DROP POLICY IF EXISTS "Users access own company parts" ON public.parts;
CREATE POLICY "Users access own company parts" ON public.parts FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- part_transactions
DROP POLICY IF EXISTS "Users access own company part_transactions" ON public.part_transactions;
CREATE POLICY "Users access own company part_transactions" ON public.part_transactions FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- failure_events
DROP POLICY IF EXISTS "SuperAdmin full access failure_events"       ON public.failure_events;
DROP POLICY IF EXISTS "MantixAdmin access assigned failure_events"  ON public.failure_events;
DROP POLICY IF EXISTS "Users access own company failure_events"     ON public.failure_events;
CREATE POLICY "SuperAdmin full access failure_events"       ON public.failure_events FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned failure_events"  ON public.failure_events FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company failure_events"     ON public.failure_events FOR ALL USING (company_id = public.get_my_company_id());

-- maintenance_budget
DROP POLICY IF EXISTS "SuperAdmin full access maintenance_budget"       ON public.maintenance_budget;
DROP POLICY IF EXISTS "MantixAdmin access assigned maintenance_budget"  ON public.maintenance_budget;
DROP POLICY IF EXISTS "Users access own company maintenance_budget"     ON public.maintenance_budget;
CREATE POLICY "SuperAdmin full access maintenance_budget"       ON public.maintenance_budget FOR ALL USING (public.is_super_admin());
CREATE POLICY "MantixAdmin access assigned maintenance_budget"  ON public.maintenance_budget FOR ALL USING (public.is_mantix_admin() AND company_id IN (SELECT public.get_assigned_company_ids()));
CREATE POLICY "Users access own company maintenance_budget"     ON public.maintenance_budget FOR ALL USING (company_id = public.get_my_company_id());

-- email tables: service_role only
DROP POLICY IF EXISTS "service_role only - email_events"   ON public.email_events;
DROP POLICY IF EXISTS "service_role only - email_threads"  ON public.email_threads;
CREATE POLICY "service_role only - email_events"   ON public.email_events  FOR ALL USING (FALSE);
CREATE POLICY "service_role only - email_threads"  ON public.email_threads FOR ALL USING (FALSE);

-- notification_log: user reads own
DROP POLICY IF EXISTS "user reads own notifications" ON public.notification_log;
CREATE POLICY "user reads own notifications" ON public.notification_log FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 13. TRIGGERS updated_at
-- ============================================================

DROP TRIGGER IF EXISTS trg_companies_updated_at              ON public.companies;
DROP TRIGGER IF EXISTS trg_profiles_updated_at               ON public.profiles;
DROP TRIGGER IF EXISTS trg_locations_updated_at              ON public.locations;
DROP TRIGGER IF EXISTS trg_branch_areas_updated_at           ON public.branch_areas;
DROP TRIGGER IF EXISTS trg_categories_updated_at             ON public.categories;
DROP TRIGGER IF EXISTS trg_assets_updated_at                 ON public.assets;
DROP TRIGGER IF EXISTS trg_asset_documents_updated_at        ON public.asset_documents;
DROP TRIGGER IF EXISTS trg_providers_updated_at              ON public.providers;
DROP TRIGGER IF EXISTS trg_supplier_contacts_updated_at      ON public.supplier_contacts;
DROP TRIGGER IF EXISTS trg_work_orders_updated_at            ON public.work_orders;
DROP TRIGGER IF EXISTS trg_automations_updated_at            ON public.automations;
DROP TRIGGER IF EXISTS trg_parts_updated_at                  ON public.parts;
DROP TRIGGER IF EXISTS trg_maintenance_budget_updated_at     ON public.maintenance_budget;
DROP TRIGGER IF EXISTS trg_email_threads_updated_at          ON public.email_threads;
DROP TRIGGER IF EXISTS trg_admin_company_assignments_updated_at ON public.admin_company_assignments;

CREATE TRIGGER trg_companies_updated_at              BEFORE UPDATE ON public.companies              FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at               BEFORE UPDATE ON public.profiles               FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_locations_updated_at              BEFORE UPDATE ON public.locations              FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_branch_areas_updated_at           BEFORE UPDATE ON public.branch_areas           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_categories_updated_at             BEFORE UPDATE ON public.categories             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assets_updated_at                 BEFORE UPDATE ON public.assets                 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_asset_documents_updated_at        BEFORE UPDATE ON public.asset_documents        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_providers_updated_at              BEFORE UPDATE ON public.providers              FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_supplier_contacts_updated_at      BEFORE UPDATE ON public.supplier_contacts      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_work_orders_updated_at            BEFORE UPDATE ON public.work_orders            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_automations_updated_at            BEFORE UPDATE ON public.automations            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_parts_updated_at                  BEFORE UPDATE ON public.parts                  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_maintenance_budget_updated_at     BEFORE UPDATE ON public.maintenance_budget     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_email_threads_updated_at          BEFORE UPDATE ON public.email_threads          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_admin_company_assignments_updated_at BEFORE UPDATE ON public.admin_company_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: auto-normalizar nombre de proveedor
DROP TRIGGER IF EXISTS trg_provider_normalized_name ON public.providers;
CREATE TRIGGER trg_provider_normalized_name
  BEFORE INSERT OR UPDATE OF name ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.set_provider_normalized_name();

-- ============================================================
-- 14. SETUP SUPER ADMIN
-- Reemplazar el email si cambia. Idempotente.
-- ============================================================

INSERT INTO public.profiles (id, email, full_name, role, is_super_admin)
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

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_super_admin": true}'::jsonb
WHERE email = 'rosenblattnicolas@gmail.com';

-- Empresa interna Mantix (para el super admin)
INSERT INTO public.companies (name, plan, is_active, industry, country)
VALUES ('Mantix', 'enterprise', true, 'SaaS CMMS', 'AR')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN DEL SCHEMA COMPLETO
-- Verificación: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================
