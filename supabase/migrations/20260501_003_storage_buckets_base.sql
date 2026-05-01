-- Prompt 1 - Storage buckets for avatars and logos (non destructive)
-- This script must be run manually in Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- Replace early broad upload policies with scoped policies.
drop policy if exists "Public read user avatars" on storage.objects;
drop policy if exists "Public read company logos" on storage.objects;
drop policy if exists "Authenticated upload user avatars" on storage.objects;
drop policy if exists "Authenticated upload company logos" on storage.objects;
drop policy if exists "User avatar owner insert" on storage.objects;
drop policy if exists "User avatar owner update" on storage.objects;
drop policy if exists "User avatar owner delete" on storage.objects;
drop policy if exists "Company admin logo insert" on storage.objects;
drop policy if exists "Company admin logo update" on storage.objects;
drop policy if exists "Company admin logo delete" on storage.objects;

create policy "Public read user avatars"
  on storage.objects for select
  using (bucket_id = 'user-avatars');

create policy "Public read company logos"
  on storage.objects for select
  using (bucket_id = 'company-logos');

create policy "User avatar owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "User avatar owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "User avatar owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Company admin logo insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'company-logos'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.company_id::text = (storage.foldername(name))[1]
        and lower(coalesce(p.role, '')) in ('admin', 'manager', 'admin_empresa', 'company_admin')
    )
  );

create policy "Company admin logo update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.company_id::text = (storage.foldername(name))[1]
        and lower(coalesce(p.role, '')) in ('admin', 'manager', 'admin_empresa', 'company_admin')
    )
  )
  with check (
    bucket_id = 'company-logos'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.company_id::text = (storage.foldername(name))[1]
        and lower(coalesce(p.role, '')) in ('admin', 'manager', 'admin_empresa', 'company_admin')
    )
  );

create policy "Company admin logo delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.company_id::text = (storage.foldername(name))[1]
        and lower(coalesce(p.role, '')) in ('admin', 'manager', 'admin_empresa', 'company_admin')
    )
  );
