-- ============================================================
-- MANTIX MVP - SCHEMA SQL
-- Base de datos multi-tenant para gestión de mantenimiento
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: companies
-- Empresas clientes de Mantix (multi-tenant)
-- Cada empresa tiene sus propios activos, OTs y proveedores
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  industry      TEXT,                          -- retail, gastronomia, construccion, etc.
  cuit          TEXT,                          -- identificador fiscal Argentina
  country       TEXT DEFAULT 'AR',
  city          TEXT,
  logo_url      TEXT,
  plan          TEXT DEFAULT 'trial',          -- trial, starter, pro, enterprise
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: profiles
-- Perfil extendido de usuarios (vinculado a auth.users de Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT DEFAULT 'admin',          -- admin, manager, technician, viewer
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: locations
-- Sucursales o ubicaciones físicas de la empresa
-- Ejemplo: Local Palermo, Depósito Zona Sur, Oficina Central
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: assets
-- Activos físicos que requieren mantenimiento
-- Ejemplo: Aire acondicionado, Heladera industrial, Generador
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  internal_code       TEXT,                    -- código interno de la empresa
  category            TEXT,                    -- climatizacion, electrica, mecanica, etc.
  subcategory         TEXT,
  manufacturer        TEXT,
  model               TEXT,
  serial_number       TEXT,
  status              TEXT DEFAULT 'operative', -- operative, critical, review, inactive
  criticality         TEXT DEFAULT 'medium',    -- low, medium, high, critical
  last_maintenance_at TIMESTAMPTZ,
  next_maintenance_at TIMESTAMPTZ,
  pm_frequency_days   INT,                     -- frecuencia de mantenimiento preventivo en días
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: providers
-- Proveedores de mantenimiento de la empresa
-- Base de datos privada - no se comparte entre empresas
-- ============================================================
CREATE TABLE IF NOT EXISTS providers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT,                          -- electrica, mecanica, HVAC, plomeria, etc.
  contact_name  TEXT,
  phone         TEXT,
  whatsapp      TEXT,
  email         TEXT,
  rating        NUMERIC(3,2) DEFAULT 0,        -- rating interno 0-5
  total_jobs    INT DEFAULT 0,
  notes         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: work_orders
-- Órdenes de trabajo: correctivas, preventivas o predictivas
-- Son el core del sistema CMMS
-- ============================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id        UUID REFERENCES assets(id) ON DELETE SET NULL,
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  provider_id     UUID REFERENCES providers(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  wo_number       TEXT,                        -- número correlativo generado automáticamente
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'corrective',   -- corrective, preventive, predictive, emergency
  origin          TEXT DEFAULT 'manual',       -- manual, automatic, hybrid
  priority        TEXT DEFAULT 'normal',       -- low, normal, high, urgent
  status          TEXT DEFAULT 'pending',      -- pending, in_progress, scheduled, completed, blocked, cancelled
  resolution_type TEXT,                        -- internal, external
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

-- ============================================================
-- TABLA: asset_status_history
-- Historial de cambios de estado de activos
-- Trazabilidad completa de cada activo
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: wo_status_history
-- Historial de cambios de estado de órdenes de trabajo
-- Auditoría completa del ciclo de vida de cada OT
-- ============================================================
CREATE TABLE IF NOT EXISTS wo_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id       UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: wo_labor
-- Registro de horas trabajadas en cada OT
-- Base para cálculo de costos de mano de obra
-- ============================================================
CREATE TABLE IF NOT EXISTS wo_labor (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id         UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id   UUID REFERENCES providers(id) ON DELETE SET NULL,
  technician    TEXT,                          -- nombre del técnico
  hours         NUMERIC(6,2) NOT NULL,
  hourly_rate   NUMERIC(10,2),
  work_date     DATE,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: wo_materials
-- Materiales y repuestos usados en cada OT
-- Control de costos de materiales por orden
-- ============================================================
CREATE TABLE IF NOT EXISTS wo_materials (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id         UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  quantity      NUMERIC(10,3) DEFAULT 1,
  unit_cost     NUMERIC(10,2),
  total_cost    NUMERIC(12,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: failure_events
-- Registro de fallas para análisis de confiabilidad
-- Permite calcular MTBF, MTTR y patrones de falla
-- ============================================================
CREATE TABLE IF NOT EXISTS failure_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id            UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  wo_id               UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  failure_type        TEXT,                    -- mechanical, electrical, wear, operator_error, etc.
  description         TEXT,
  detected_at         TIMESTAMPTZ NOT NULL,
  repaired_at         TIMESTAMPTZ,
  downtime_hours      NUMERIC(8,2),
  repair_cost         NUMERIC(12,2),
  root_cause          TEXT,
  corrective_action   TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: maintenance_budget
-- Presupuesto de mantenimiento por empresa y período
-- Base para detección de sobrecostos
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_budget (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  fiscal_year     INT NOT NULL,
  month           INT,                         -- NULL = presupuesto anual
  budget_type     TEXT DEFAULT 'opex',         -- capex, opex
  category        TEXT,                        -- por categoría de activo/rubro
  planned_amount  NUMERIC(12,2) NOT NULL,
  actual_amount   NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- Optimizan las consultas más frecuentes del dashboard
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assets_company        ON assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_location       ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_status         ON assets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_company   ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status    ON work_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset     ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_due       ON work_orders(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_providers_company     ON providers(company_id);
CREATE INDEX IF NOT EXISTS idx_locations_company     ON locations(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company      ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_failure_events_asset  ON failure_events(asset_id, detected_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Aislamiento multi-tenant: cada empresa solo ve sus datos
-- ============================================================
ALTER TABLE companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wo_status_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wo_labor             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wo_materials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE failure_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_budget   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS
-- Los usuarios solo acceden a los datos de su empresa
-- ============================================================

-- companies: el user ve solo su empresa
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- profiles: cada user ve su perfil y los de su empresa
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
         OR id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- locations: solo datos de la misma empresa
CREATE POLICY "Users access own company locations"
  ON locations FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- assets: solo datos de la misma empresa
CREATE POLICY "Users access own company assets"
  ON assets FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- providers: solo datos de la misma empresa (no se comparten)
CREATE POLICY "Users access own company providers"
  ON providers FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- work_orders: solo datos de la misma empresa
CREATE POLICY "Users access own company work_orders"
  ON work_orders FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- asset_status_history
CREATE POLICY "Users access own company asset_status_history"
  ON asset_status_history FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- wo_status_history
CREATE POLICY "Users access own company wo_status_history"
  ON wo_status_history FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- wo_labor
CREATE POLICY "Users access own company wo_labor"
  ON wo_labor FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- wo_materials
CREATE POLICY "Users access own company wo_materials"
  ON wo_materials FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- failure_events
CREATE POLICY "Users access own company failure_events"
  ON failure_events FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- maintenance_budget
CREATE POLICY "Users access own company maintenance_budget"
  ON maintenance_budget FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- FUNCIÓN: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FIN DEL SCHEMA
-- Ejecutar este archivo completo en Supabase SQL Editor
-- ============================================================
