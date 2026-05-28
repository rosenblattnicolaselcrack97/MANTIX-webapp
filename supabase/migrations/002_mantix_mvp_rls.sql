-- MANTIX MVP - Migration 002
-- RLS policies based on active membership per company.

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  );
$$;

create or replace function public.has_company_role(target_company_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and lower(cm.role) = any(allowed_roles)
  );
$$;

-- Helper to apply member policies safely.
create or replace function public.apply_member_rls(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('alter table public.%I enable row level security', table_name);

  execute format('drop policy if exists "member_select" on public.%I', table_name);
  execute format('drop policy if exists "member_insert" on public.%I', table_name);
  execute format('drop policy if exists "member_update" on public.%I', table_name);
  execute format('drop policy if exists "member_delete" on public.%I', table_name);

  execute format(
    'create policy "member_select" on public.%I for select using (public.is_company_member(company_id))',
    table_name
  );

  execute format(
    'create policy "member_insert" on public.%I for insert with check (public.is_company_member(company_id))',
    table_name
  );

  execute format(
    'create policy "member_update" on public.%I for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))',
    table_name
  );

  execute format(
    'create policy "member_delete" on public.%I for delete using (public.has_company_role(company_id, array[''owner'',''admin'',''gerente'',''supervisor'']))',
    table_name
  );
end;
$$;

-- company_members
alter table public.company_members enable row level security;
drop policy if exists "member_select" on public.company_members;
drop policy if exists "member_insert" on public.company_members;
drop policy if exists "member_update" on public.company_members;
drop policy if exists "member_delete" on public.company_members;

create policy "member_select"
on public.company_members
for select
using (
  user_id = auth.uid()
  or public.has_company_role(company_id, array['owner','admin','gerente','supervisor'])
);

create policy "member_insert"
on public.company_members
for insert
with check (
  public.has_company_role(company_id, array['owner','admin'])
);

create policy "member_update"
on public.company_members
for update
using (
  public.has_company_role(company_id, array['owner','admin'])
)
with check (
  public.has_company_role(company_id, array['owner','admin'])
);

create policy "member_delete"
on public.company_members
for delete
using (
  public.has_company_role(company_id, array['owner','admin'])
);

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "profile_self_or_company" on public.profiles;
create policy "profile_self_or_company"
on public.profiles
for select
using (
  id = auth.uid()
  or (
    company_id is not null
    and public.is_company_member(company_id)
  )
);

drop policy if exists "profile_self_update" on public.profiles;
create policy "profile_self_update"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- company_settings
alter table public.company_settings enable row level security;
drop policy if exists "company_settings_select" on public.company_settings;
drop policy if exists "company_settings_change" on public.company_settings;

create policy "company_settings_select"
on public.company_settings
for select
using (public.is_company_member(company_id));

create policy "company_settings_change"
on public.company_settings
for all
using (public.has_company_role(company_id, array['owner','admin','gerente','supervisor']))
with check (public.has_company_role(company_id, array['owner','admin','gerente','supervisor']));

-- Main operational tables
select public.apply_member_rls('locations');
select public.apply_member_rls('categories');
select public.apply_member_rls('category_custom_fields');
select public.apply_member_rls('suppliers');
select public.apply_member_rls('supplier_contacts');
select public.apply_member_rls('supplier_documents');
select public.apply_member_rls('physical_inventory');
select public.apply_member_rls('inventory_locations');
select public.apply_member_rls('spare_compatibility');
select public.apply_member_rls('tool_associations');
select public.apply_member_rls('inventory_documents');
select public.apply_member_rls('inventory_readings');
select public.apply_member_rls('work_orders');
select public.apply_member_rls('wo_tasks');
select public.apply_member_rls('wo_parts');
select public.apply_member_rls('wo_labor');
select public.apply_member_rls('wo_attachments');
select public.apply_member_rls('warehouses');
select public.apply_member_rls('stock_levels');
select public.apply_member_rls('stock_movements');
select public.apply_member_rls('stock_lots');
select public.apply_member_rls('purchase_orders');
select public.apply_member_rls('po_items');

-- Keep legacy tables aligned while migration is in progress.
select public.apply_member_rls('assets');
select public.apply_member_rls('providers');
select public.apply_member_rls('parts');

-- Cleanup helper
-- drop function public.apply_member_rls(text); -- optional once policies are fixed.
