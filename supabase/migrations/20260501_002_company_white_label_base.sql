-- Prompt 1 - Company white label base (non destructive)

alter table public.companies
  add column if not exists description text,
  add column if not exists theme_mode text default 'system',
  add column if not exists primary_color text default '#0ea5e9',
  add column if not exists secondary_color text default '#14b8a6',
  add column if not exists font_family text,
  add column if not exists font_size text default 'mediana',
  add column if not exists email_cc_admin boolean default false,
  add column if not exists email_template_header text,
  add column if not exists email_template_footer text;

create index if not exists idx_companies_theme_mode on public.companies(theme_mode);
