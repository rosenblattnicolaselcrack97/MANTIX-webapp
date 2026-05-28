-- MANTIX MVP - Migration 001
-- Safe main schema migration (non-destructive).

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- Multi-company core
-- ------------------------------------------------------------------
create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'tecnico',
  is_active boolean not null default true,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  legal_name text,
  tax_id text,
  logo_url text,
  address text,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  base_currency text not null default 'ARS',
  asset_prefix text not null default 'AF',
  work_order_prefix text not null default 'OT',
  supplier_prefix text not null default 'PRV',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text,
  add column if not exists is_active boolean default true;

-- ------------------------------------------------------------------
-- Locations (hierarchical)
-- ------------------------------------------------------------------
alter table public.locations
  add column if not exists parent_id uuid references public.locations(id) on delete set null,
  add column if not exists level_type text,
  add column if not exists code text,
  add column if not exists area_m2 numeric(12,2),
  add column if not exists capacity numeric(12,2),
  add column if not exists responsible_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists gps_lat numeric(10,7),
  add column if not exists gps_lng numeric(10,7),
  add column if not exists notes text;

alter table public.locations
  alter column level_type set default 'sucursal';

create index if not exists idx_locations_company_parent on public.locations(company_id, parent_id);
create index if not exists idx_locations_company_level on public.locations(company_id, level_type);
create unique index if not exists uq_locations_company_code on public.locations(company_id, code) where code is not null;

-- ------------------------------------------------------------------
-- Categories (scope based)
-- ------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  scope text not null default 'general',
  parent_id uuid references public.categories(id) on delete set null,
  code text,
  name text not null,
  color text,
  icon text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists scope text,
  add column if not exists parent_id uuid references public.categories(id) on delete set null,
  add column if not exists code text,
  add column if not exists icon text,
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz default now();

update public.categories
set scope = case
  when scope is not null then scope
  when type = 'asset' then 'maintainable'
  when type = 'part' then 'spare'
  when type = 'work_order' then 'work_order'
  else 'general'
end;

create unique index if not exists uq_categories_company_scope_code on public.categories(company_id, scope, code) where code is not null;
create index if not exists idx_categories_company_scope on public.categories(company_id, scope);
create index if not exists idx_categories_company_parent on public.categories(company_id, parent_id);

create table if not exists public.category_custom_fields (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  field_key text not null,
  field_label text not null,
  field_type text not null,
  options_json jsonb,
  required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, category_id, field_key)
);

-- ------------------------------------------------------------------
-- Suppliers
-- ------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  legal_name text not null,
  display_name text,
  tax_id text,
  type_tags text[] not null default '{}'::text[],
  email text,
  phone text,
  website text,
  address text,
  payment_terms text,
  currency text,
  lead_time_days integer,
  rating numeric(3,2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_company_name on public.suppliers(company_id, legal_name);
create index if not exists idx_suppliers_company_tax_id on public.suppliers(company_id, tax_id);

create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  whatsapp text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  doc_type text not null,
  file_url text not null,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Physical inventory (unified)
-- ------------------------------------------------------------------
create table if not exists public.physical_inventory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  parent_asset_id uuid references public.physical_inventory(id) on delete set null,
  parent_description text,
  code text,
  name text not null,
  description text,
  brand text,
  model text,
  serial_number text,
  manufacturer_id uuid references public.suppliers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  primary_location_id uuid references public.locations(id) on delete set null,
  status text not null default 'active',
  criticality text not null default 'medium',
  purchase_date date,
  purchase_cost numeric(14,2),
  useful_life_years integer,
  residual_value numeric(14,2),
  current_book_value numeric(14,2),
  warranty_until date,
  warranty_supplier_id uuid references public.suppliers(id) on delete set null,
  is_consumable boolean not null default false,
  is_generic boolean not null default false,
  requires_calibration boolean not null default false,
  calibration_frequency_days integer,
  last_calibration_date date,
  next_calibration_date date,
  unit_of_measure text,
  min_stock numeric(14,3),
  max_stock numeric(14,3),
  reorder_point numeric(14,3),
  safety_stock numeric(14,3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_physical_inventory_type check (type in ('maintainable','component','spare','tool','installation'))
);

create index if not exists idx_physical_inventory_company_type on public.physical_inventory(company_id, type);
create index if not exists idx_physical_inventory_company_location on public.physical_inventory(company_id, primary_location_id);
create unique index if not exists uq_physical_inventory_company_code on public.physical_inventory(company_id, code) where code is not null;

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inventory_id uuid not null references public.physical_inventory(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  coverage_type text,
  created_at timestamptz not null default now(),
  unique (company_id, inventory_id, location_id)
);

create table if not exists public.spare_compatibility (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  spare_id uuid not null references public.physical_inventory(id) on delete cascade,
  target_inventory_id uuid not null references public.physical_inventory(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, spare_id, target_inventory_id)
);

create table if not exists public.tool_associations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tool_id uuid not null references public.physical_inventory(id) on delete cascade,
  target_inventory_id uuid not null references public.physical_inventory(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, tool_id, target_inventory_id)
);

create table if not exists public.inventory_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inventory_id uuid not null references public.physical_inventory(id) on delete cascade,
  doc_type text not null,
  file_url text not null,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_readings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inventory_id uuid not null references public.physical_inventory(id) on delete cascade,
  reading_type text not null,
  value numeric(16,4) not null,
  unit text,
  taken_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.installation_responsibles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  installation_id uuid not null references public.physical_inventory(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  technician_name text,
  license_number text,
  license_expires_at date,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installation_inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  installation_id uuid not null references public.physical_inventory(id) on delete cascade,
  inspection_type text not null,
  performed_at timestamptz not null,
  next_due_at timestamptz,
  result text,
  observations text,
  certificate_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Work orders (phase 2)
-- ------------------------------------------------------------------
alter table public.work_orders
  add column if not exists code text,
  add column if not exists requester_id uuid references public.profiles(id) on delete set null,
  add column if not exists assignee_id uuid references public.profiles(id) on delete set null,
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists planned_start timestamptz,
  add column if not exists planned_end timestamptz,
  add column if not exists actual_start timestamptz,
  add column if not exists actual_end timestamptz,
  add column if not exists estimated_duration_min integer,
  add column if not exists actual_duration_min integer,
  add column if not exists root_cause text,
  add column if not exists solution text,
  add column if not exists close_notes text;

create table if not exists public.wo_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  wo_id uuid not null references public.work_orders(id) on delete cascade,
  description text not null,
  completed boolean not null default false,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wo_parts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  wo_id uuid not null references public.work_orders(id) on delete cascade,
  spare_id uuid not null references public.physical_inventory(id) on delete restrict,
  qty_planned numeric(14,3) not null default 0,
  qty_used numeric(14,3) not null default 0,
  unit_cost numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wo_labor (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  wo_id uuid not null references public.work_orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  hours numeric(10,2) not null default 0,
  hourly_rate numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wo_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  wo_id uuid not null references public.work_orders(id) on delete cascade,
  file_url text not null,
  type text,
  taken_at timestamptz,
  uploaded_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Stock + warehouses
-- ------------------------------------------------------------------
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  name text not null,
  type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inventory_id uuid not null references public.physical_inventory(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  qty_on_hand numeric(14,3) not null default 0,
  qty_reserved numeric(14,3) not null default 0,
  qty_in_transit numeric(14,3) not null default 0,
  min_qty numeric(14,3),
  max_qty numeric(14,3),
  reorder_point numeric(14,3),
  safety_stock numeric(14,3),
  updated_at timestamptz not null default now(),
  unique (company_id, inventory_id, warehouse_id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inventory_id uuid not null references public.physical_inventory(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  type text not null,
  qty numeric(14,3) not null,
  unit_cost numeric(14,2),
  wo_id uuid references public.work_orders(id) on delete set null,
  lot_id uuid,
  performed_by uuid references public.profiles(id) on delete set null,
  performed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  constraint chk_stock_movement_type check (type in ('in','out','transfer','adjustment','return','reserved','unreserved'))
);

create table if not exists public.stock_lots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inventory_id uuid not null references public.physical_inventory(id) on delete cascade,
  lot_code text not null,
  qty numeric(14,3) not null,
  manufactured_at timestamptz,
  expires_at timestamptz,
  certificate_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, inventory_id, lot_code)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'draft',
  total numeric(14,2) not null default 0,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.po_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  inventory_id uuid not null references public.physical_inventory(id) on delete restrict,
  qty numeric(14,3) not null,
  unit_cost numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Work order close -> stock output automation
-- ------------------------------------------------------------------
create or replace function public.apply_wo_parts_stock_on_close()
returns trigger
language plpgsql
as $$
declare
  row_part record;
  target_stock_id uuid;
  target_warehouse_id uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status is distinct from new.status and new.status = 'closed' then
    for row_part in
      select wp.id, wp.company_id, wp.wo_id, wp.spare_id, wp.qty_used, wp.unit_cost
      from public.wo_parts wp
      where wp.wo_id = new.id
        and coalesce(wp.qty_used, 0) > 0
    loop
      select sl.id, sl.warehouse_id
      into target_stock_id, target_warehouse_id
      from public.stock_levels sl
      where sl.company_id = row_part.company_id
        and sl.inventory_id = row_part.spare_id
      order by sl.qty_on_hand desc, sl.updated_at asc
      limit 1;

      if target_stock_id is not null then
        update public.stock_levels
        set qty_on_hand = greatest(0, qty_on_hand - row_part.qty_used),
            updated_at = now()
        where id = target_stock_id;
      end if;

      insert into public.stock_movements (
        company_id,
        inventory_id,
        warehouse_id,
        type,
        qty,
        unit_cost,
        wo_id,
        performed_by,
        performed_at,
        notes
      ) values (
        row_part.company_id,
        row_part.spare_id,
        target_warehouse_id,
        'out',
        row_part.qty_used,
        row_part.unit_cost,
        row_part.wo_id,
        new.assignee_id,
        now(),
        'Salida automatica por cierre de OT'
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_wo_parts_stock_on_close on public.work_orders;
create trigger trg_apply_wo_parts_stock_on_close
after update of status on public.work_orders
for each row
execute function public.apply_wo_parts_stock_on_close();

-- ------------------------------------------------------------------
-- Updated-at triggers
-- ------------------------------------------------------------------
drop trigger if exists trg_company_members_updated_at on public.company_members;
create trigger trg_company_members_updated_at before update on public.company_members for each row execute function public.set_updated_at();

drop trigger if exists trg_company_settings_updated_at on public.company_settings;
create trigger trg_company_settings_updated_at before update on public.company_settings for each row execute function public.set_updated_at();

drop trigger if exists trg_locations_updated_at_mvp on public.locations;
create trigger trg_locations_updated_at_mvp before update on public.locations for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at_mvp on public.categories;
create trigger trg_categories_updated_at_mvp before update on public.categories for each row execute function public.set_updated_at();

drop trigger if exists trg_category_custom_fields_updated_at on public.category_custom_fields;
create trigger trg_category_custom_fields_updated_at before update on public.category_custom_fields for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();

drop trigger if exists trg_supplier_contacts_updated_at_mvp on public.supplier_contacts;
create trigger trg_supplier_contacts_updated_at_mvp before update on public.supplier_contacts for each row execute function public.set_updated_at();

drop trigger if exists trg_supplier_documents_updated_at on public.supplier_documents;
create trigger trg_supplier_documents_updated_at before update on public.supplier_documents for each row execute function public.set_updated_at();

drop trigger if exists trg_physical_inventory_updated_at on public.physical_inventory;
create trigger trg_physical_inventory_updated_at before update on public.physical_inventory for each row execute function public.set_updated_at();

drop trigger if exists trg_installation_responsibles_updated_at on public.installation_responsibles;
create trigger trg_installation_responsibles_updated_at before update on public.installation_responsibles for each row execute function public.set_updated_at();

drop trigger if exists trg_installation_inspections_updated_at on public.installation_inspections;
create trigger trg_installation_inspections_updated_at before update on public.installation_inspections for each row execute function public.set_updated_at();

drop trigger if exists trg_wo_tasks_updated_at on public.wo_tasks;
create trigger trg_wo_tasks_updated_at before update on public.wo_tasks for each row execute function public.set_updated_at();

drop trigger if exists trg_wo_parts_updated_at on public.wo_parts;
create trigger trg_wo_parts_updated_at before update on public.wo_parts for each row execute function public.set_updated_at();

drop trigger if exists trg_wo_labor_updated_at_mvp on public.wo_labor;
create trigger trg_wo_labor_updated_at_mvp before update on public.wo_labor for each row execute function public.set_updated_at();

drop trigger if exists trg_warehouses_updated_at on public.warehouses;
create trigger trg_warehouses_updated_at before update on public.warehouses for each row execute function public.set_updated_at();

drop trigger if exists trg_stock_levels_updated_at on public.stock_levels;
create trigger trg_stock_levels_updated_at before update on public.stock_levels for each row execute function public.set_updated_at();

drop trigger if exists trg_stock_lots_updated_at on public.stock_lots;
create trigger trg_stock_lots_updated_at before update on public.stock_lots for each row execute function public.set_updated_at();

drop trigger if exists trg_purchase_orders_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_updated_at before update on public.purchase_orders for each row execute function public.set_updated_at();

drop trigger if exists trg_po_items_updated_at on public.po_items;
create trigger trg_po_items_updated_at before update on public.po_items for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Baseline company membership sync for legacy profiles
-- ------------------------------------------------------------------
insert into public.company_members (company_id, user_id, role, is_active)
select p.company_id,
       p.id,
       case
         when coalesce(lower(p.role), '') in ('owner','admin','gerente','supervisor','tecnico','solo_lectura','externo') then lower(p.role)
         when coalesce(lower(p.role), '') in ('manager','admin_empresa','company_admin') then 'admin'
         when coalesce(lower(p.role), '') in ('viewer') then 'solo_lectura'
         else 'tecnico'
       end,
       coalesce(p.is_active, true)
from public.profiles p
where p.company_id is not null
on conflict (company_id, user_id) do update
set role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.company_settings (company_id, legal_name, tax_id, logo_url, address)
select c.id, c.name, c.cuit, c.logo_url, c.address
from public.companies c
on conflict (company_id) do nothing;
