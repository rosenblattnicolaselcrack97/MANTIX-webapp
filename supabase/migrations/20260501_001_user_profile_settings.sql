-- Prompt 1 - User profile settings (non destructive)

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text,
  add column if not exists theme_preference text default 'system',
  add column if not exists notification_preferences jsonb default '{"web": true}'::jsonb,
  add column if not exists email_preferences jsonb default '{"enabled": true}'::jsonb;

create index if not exists idx_profiles_theme_preference on public.profiles(theme_preference);
