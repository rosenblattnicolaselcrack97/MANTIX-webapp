CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.branch_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT branch_areas_status_check CHECK (status IN ('active', 'inactive'))
);

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.branch_areas(id) ON DELETE SET NULL;

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.branch_areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_branch_areas_company ON public.branch_areas(company_id);
CREATE INDEX IF NOT EXISTS idx_branch_areas_branch ON public.branch_areas(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_areas_status ON public.branch_areas(company_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_area ON public.assets(area_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_area ON public.work_orders(area_id);

ALTER TABLE public.branch_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own company branch_areas" ON public.branch_areas;
CREATE POLICY "Users access own company branch_areas"
  ON public.branch_areas FOR ALL
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS update_branch_areas_updated_at ON public.branch_areas;
CREATE TRIGGER update_branch_areas_updated_at
  BEFORE UPDATE ON public.branch_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();