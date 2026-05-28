# Supabase SQL Runbook (MANTIX MVP)

## Objetivo
Aplicar el esquema MVP Fase 1 y Fase 2 de MANTIX de forma segura y ordenada.

## Orden obligatorio de ejecución
1. `supabase/migrations/001_mantix_mvp_schema.sql`
2. `supabase/migrations/002_mantix_mvp_rls.sql`
3. `supabase/migrations/003_mantix_mvp_seed_optional.sql` (opcional)
4. `supabase/migrations/999_cleanup_obsolete_review.sql` (revisión manual, contiene comandos destructivos comentados)

## Qué archivo es opcional
- `003_mantix_mvp_seed_optional.sql`

## Qué archivo requiere revisión por destructivos
- `999_cleanup_obsolete_review.sql`

## Cómo ejecutar en Supabase SQL Editor
Para cada archivo:
1. Abrir el archivo local.
2. Copiar el contenido completo.
3. Pegar en Supabase SQL Editor.
4. Ejecutar y verificar que no haya errores.

## Verificación post ejecución
Ejecutar estas consultas en Supabase:

```sql
-- Tablas núcleo nuevas
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'company_members',
    'company_settings',
    'locations',
    'categories',
    'suppliers',
    'physical_inventory',
    'work_orders',
    'wo_tasks',
    'wo_parts',
    'warehouses',
    'stock_levels',
    'stock_movements'
  )
order by table_name;

-- RLS activado
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'company_members',
    'company_settings',
    'locations',
    'categories',
    'suppliers',
    'physical_inventory',
    'work_orders',
    'wo_tasks',
    'wo_parts',
    'warehouses',
    'stock_levels',
    'stock_movements'
  )
order by tablename;
```

## Advertencia explícita
Los comandos `DROP TABLE` y `DROP FUNCTION` del archivo `999_cleanup_obsolete_review.sql` borran estructuras y datos.
No ejecutar esos comandos en producción sin:
1. Backup validado.
2. Confirmación funcional de que ya no hay código que dependa de esas tablas.
3. Ventana de mantenimiento aprobada.

## Nota de transición
Durante la transición conviven tablas legacy (`assets`, `providers`, `parts`) y tablas nuevas MVP (`physical_inventory`, `suppliers`, `stock_*`).
No eliminar legacy hasta completar migración de código y validación end-to-end.
