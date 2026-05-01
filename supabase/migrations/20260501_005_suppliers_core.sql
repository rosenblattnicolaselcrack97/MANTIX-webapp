CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.normalize_company_text(value TEXT)
RETURNS TEXT AS $$
  SELECT NULLIF(
    UPPER(
      REGEXP_REPLACE(
        UNACCENT(TRIM(COALESCE(value, ''))),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS normalized_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS supplier_type TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS main_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS main_email TEXT,
  ADD COLUMN IF NOT EXISTS main_phone TEXT,
  ADD COLUMN IF NOT EXISTS secondary_email TEXT,
  ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

UPDATE public.providers
SET
  normalized_name = COALESCE(normalized_name, public.normalize_company_text(name)),
  main_contact_name = COALESCE(main_contact_name, contact_name),
  main_email = COALESCE(main_email, email),
  main_phone = COALESCE(main_phone, phone),
  status = COALESCE(status, CASE WHEN is_active THEN 'active' ELSE 'inactive' END);

ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_status_check;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'blocked'));

CREATE OR REPLACE FUNCTION public.set_provider_normalized_name()
RETURNS trigger AS $$
BEGIN
  NEW.normalized_name = public.normalize_company_text(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_provider_normalized_name_trigger ON public.providers;
CREATE TRIGGER set_provider_normalized_name_trigger
  BEFORE INSERT OR UPDATE OF name ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.set_provider_normalized_name();

CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.asset_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  relationship_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT asset_suppliers_company_asset_supplier_unique UNIQUE (company_id, asset_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.work_order_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  role TEXT,
  quote_status TEXT,
  selected BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT work_order_suppliers_company_work_order_supplier_unique UNIQUE (company_id, work_order_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_providers_normalized_name ON public.providers(company_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_providers_tax_id ON public.providers(company_id, tax_id);
CREATE INDEX IF NOT EXISTS idx_providers_status ON public.providers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON public.supplier_contacts(company_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_asset_suppliers_supplier ON public.asset_suppliers(company_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_asset_suppliers_asset ON public.asset_suppliers(company_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_work_order_suppliers_supplier ON public.work_order_suppliers(company_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_work_order_suppliers_order ON public.work_order_suppliers(company_id, work_order_id);

ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own company supplier_contacts" ON public.supplier_contacts;
CREATE POLICY "Users access own company supplier_contacts"
  ON public.supplier_contacts FOR ALL
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users access own company asset_suppliers" ON public.asset_suppliers;
CREATE POLICY "Users access own company asset_suppliers"
  ON public.asset_suppliers FOR ALL
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users access own company work_order_suppliers" ON public.work_order_suppliers;
CREATE POLICY "Users access own company work_order_suppliers"
  ON public.work_order_suppliers FOR ALL
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_supplier_contacts_updated_at ON public.supplier_contacts;
CREATE TRIGGER update_supplier_contacts_updated_at
  BEFORE UPDATE ON public.supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();