-- MANTIX MVP - Migration 003 (OPTIONAL)
-- Optional seed for development or QA environments only.
-- Do NOT run in production with real data unless intentionally required.

-- Example: populate global category scopes per company when no categories exist.
insert into public.categories (company_id, scope, code, name, color, is_active)
select c.id, 'maintainable', 'MT-BASE', 'Mantenibles', '#1e7aff', true
from public.companies c
where not exists (
  select 1
  from public.categories cat
  where cat.company_id = c.id
    and cat.scope = 'maintainable'
)
on conflict do nothing;

insert into public.categories (company_id, scope, code, name, color, is_active)
select c.id, 'spare', 'SP-BASE', 'Repuestos', '#ffb800', true
from public.companies c
where not exists (
  select 1
  from public.categories cat
  where cat.company_id = c.id
    and cat.scope = 'spare'
)
on conflict do nothing;

insert into public.categories (company_id, scope, code, name, color, is_active)
select c.id, 'work_order', 'OT-BASE', 'OT General', '#00c6ff', true
from public.companies c
where not exists (
  select 1
  from public.categories cat
  where cat.company_id = c.id
    and cat.scope = 'work_order'
)
on conflict do nothing;

-- Default warehouse per company.
insert into public.warehouses (company_id, name, type, notes)
select c.id, 'Deposito Central', 'main', 'Generado por seed opcional'
from public.companies c
where not exists (
  select 1 from public.warehouses w where w.company_id = c.id
)
on conflict do nothing;
