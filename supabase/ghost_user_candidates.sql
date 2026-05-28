-- Mantix - Ghost user audit view
--
-- Use this in Supabase SQL Editor to review accounts that should be cleaned up.
-- It only audits; actual deletion of auth.users still needs the server-side debug route
-- or a privileged admin workflow.

create or replace view public.ghost_user_candidates as
with auth_users as (
  select
    id,
    email,
    created_at,
    email_confirmed_at,
    confirmed_at
  from auth.users
),
profile_state as (
  select
    id,
    company_id,
    is_active
  from public.profiles
)
select
  u.id as user_id,
  u.email,
  u.created_at,
  p.company_id,
  p.is_active,
  u.email_confirmed_at,
  u.confirmed_at,
  floor(extract(epoch from (now() - u.created_at)) / 3600)::int as age_hours,
  case
    when p.id is null and u.email_confirmed_at is null and u.confirmed_at is null then 'no_profile_unconfirmed'
    when p.id is not null and p.company_id is null then 'profile_without_company'
    else 'review'
  end as reason
from auth_users u
left join profile_state p on p.id = u.id
where
  (
    p.id is null
    and u.email_confirmed_at is null
    and u.confirmed_at is null
    and u.created_at < now() - interval '48 hours'
  )
  or
  (
    p.id is not null
    and p.company_id is null
    and u.created_at < now() - interval '48 hours'
  )
order by reason, created_at asc;
