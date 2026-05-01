# SUPABASE PROMPT 1 CAMBIOS

## Migraciones creadas
1. `supabase/migrations/20260501_001_user_profile_settings.sql`
2. `supabase/migrations/20260501_002_company_white_label_base.sql`
3. `supabase/migrations/20260501_003_storage_buckets_base.sql`

## Orden de ejecucion
1. Ejecutar `20260501_001_user_profile_settings.sql`.
2. Ejecutar `20260501_002_company_white_label_base.sql`.
3. Ejecutar `20260501_003_storage_buckets_base.sql`.

## Cambios
- `profiles`: `first_name`, `last_name`, `display_name`, `theme_preference`, `notification_preferences`, `email_preferences`.
- `companies`: `description`, `theme_mode`, `primary_color`, `secondary_color`, `font_family`, `font_size`, `email_cc_admin`, `email_template_header`, `email_template_footer`.
- Storage: buckets `user-avatars` y `company-logos` con lectura publica y escrituras restringidas.

## Seguridad
- No se borran tablas ni columnas.
- No se ejecuta SQL automaticamente.
- La migracion de Storage reemplaza politicas amplias anteriores por politicas scoped; no borra datos.
- `SUPABASE_SERVICE_ROLE_KEY` queda solo en API routes/server-side.
