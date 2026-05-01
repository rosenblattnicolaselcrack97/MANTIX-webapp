CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS manufacturing_year INT,
  ADD COLUMN IF NOT EXISTS user_manual_url TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS acquisition_currency TEXT,
  ADD COLUMN IF NOT EXISTS responsible_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsible_name TEXT,
  ADD COLUMN IF NOT EXISTS external_document_url TEXT,
  ADD COLUMN IF NOT EXISTS status_detail TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_frequency_number INT,
  ADD COLUMN IF NOT EXISTS maintenance_frequency_unit TEXT;

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_maintenance_frequency_unit_check;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_maintenance_frequency_unit_check
  CHECK (
    maintenance_frequency_unit IS NULL
    OR maintenance_frequency_unit IN ('days', 'months', 'years')
  );

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_maintenance_frequency_number_check;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_maintenance_frequency_number_check
  CHECK (
    maintenance_frequency_number IS NULL
    OR (
      maintenance_frequency_unit = 'days' AND maintenance_frequency_number BETWEEN 1 AND 90
    )
    OR (
      maintenance_frequency_unit = 'months' AND maintenance_frequency_number BETWEEN 1 AND 12
    )
    OR (
      maintenance_frequency_unit = 'years' AND maintenance_frequency_number BETWEEN 1 AND 10
    )
  );

CREATE TABLE IF NOT EXISTS public.asset_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'document',
  file_name TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  external_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_company_status_detail ON public.assets(company_id, status_detail);
CREATE INDEX IF NOT EXISTS idx_assets_frequency ON public.assets(company_id, maintenance_frequency_unit, maintenance_frequency_number);
CREATE INDEX IF NOT EXISTS idx_assets_responsible_profile ON public.assets(company_id, responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset ON public.asset_documents(company_id, asset_id);

ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own company asset_documents" ON public.asset_documents;
CREATE POLICY "Users access own company asset_documents"
  ON public.asset_documents FOR ALL
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_asset_documents_updated_at ON public.asset_documents;
CREATE TRIGGER update_asset_documents_updated_at
  BEFORE UPDATE ON public.asset_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();