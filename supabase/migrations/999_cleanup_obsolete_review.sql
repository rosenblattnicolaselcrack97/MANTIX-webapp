-- MANTIX MVP - Migration 999
-- Cleanup / obsolete review script.
-- IMPORTANT: This file contains optional destructive statements. Review manually.

-- 1) Non-destructive inspection
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'email_events',
    'email_threads',
    'notification_log',
    'asset_suppliers',
    'work_order_suppliers',
    'branch_areas'
  )
order by table_name;

-- 2) Suggested archival targets (legacy, out of current MVP scope)
-- - email_events
-- - email_threads
-- - notification_log
-- - inbound email related functions/triggers
--
-- Keep until business confirms permanent removal.

-- 3) Optional destructive cleanup (DO NOT RUN WITHOUT BACKUP)
-- WARNING: These commands remove tables and data.
--
-- drop table if exists public.notification_log cascade;
-- drop table if exists public.email_threads cascade;
-- drop table if exists public.email_events cascade;
--
-- drop function if exists public.search_companies_by_name(text);

-- 4) Optional compatibility cleanup after full migration to MVP tables
-- WARNING: run only when no code uses legacy entities.
--
-- drop table if exists public.asset_suppliers cascade;
-- drop table if exists public.work_order_suppliers cascade;
-- drop table if exists public.branch_areas cascade;
--
-- drop table if exists public.assets cascade;
-- drop table if exists public.providers cascade;
-- drop table if exists public.parts cascade;
