# SUCURSALES Y AREAS - PROMPT 2

## Decision de modelo
- Mantix ya usa `locations` como tabla de sucursales.
- Prompt 2 no crea una tabla `branches` paralela.
- Las areas se agregan en `branch_areas` y se relacionan con `assets` y `work_orders` via `area_id`.

## Lo implementado en frontend
- Ruta workspace `/locations` convertida a gestion real.
- Alta y edicion de sucursal usando `locations`.
- Desactivacion / reactivacion de sucursal usando `is_active`.
- Alta y edicion de area usando `branch_areas` cuando la migracion ya existe.
- Desactivacion / reactivacion de area usando `status`.
- Filtros por sucursal y area.
- Contadores reales de activos y ordenes asociados por sucursal.
- Contadores por area cuando `branch_areas` y `area_id` ya estan disponibles.
- Empty state profesional y warning claro cuando falta correr SQL.

## SQL requerido
- Ejecutar `supabase/migrations/20260501_004_branches_areas.sql`.

## Comportamiento si no se ejecuto SQL
- La pantalla sigue funcionando con sucursales (`locations`).
- La creacion de areas queda bloqueada y muestra warning explicito.
- No se inventan contadores ni datos.

## Campos usados

### Sucursales (`locations`)
- `id`
- `company_id`
- `name`
- `description`
- `address`
- `city`
- `is_active`
- `created_at`
- `updated_at`

### Areas (`branch_areas`)
- `id`
- `company_id`
- `branch_id`
- `name`
- `description`
- `status`
- `created_at`
- `updated_at`

## Seguridad
- Toda consulta filtra por `profile.company_id`.
- La migracion agrega RLS por `company_id` para `branch_areas`.
- No se exponen sucursales de otras empresas.

## Como probar rapido
1. Abrir `/locations` con un usuario de empresa.
2. Crear una sucursal.
3. Editar la sucursal.
4. Desactivarla y reactivarla.
5. Ejecutar SQL `20260501_004_branches_areas.sql`.
6. Crear areas para una sucursal.
7. Filtrar por sucursal y por area.