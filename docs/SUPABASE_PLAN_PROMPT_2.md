# SUPABASE PLAN PROMPT 2

Fecha: 2026-05-01
Scope: solo `MANTIX_WEBAPP`

## Tablas actuales
- `companies`
- `profiles`
- `locations`
- `assets`
- `providers`
- `work_orders`
- `asset_status_history`
- `wo_status_history`
- `wo_labor`
- `wo_materials`
- `failure_events`
- `maintenance_budget`
- `email_events`
- `email_threads`
- `notification_log`
- `admin_company_assignments`

## Tablas nuevas propuestas
- `branch_areas`
- `supplier_contacts`
- `asset_suppliers`
- `work_order_suppliers`
- `asset_documents`
- `maintenance_plans`
- `maintenance_plan_occurrences`
- `work_order_visits`
- `work_order_costs`
- `supplier_documents`
- `email_messages`
- `email_entity_links`
- `email_processing_logs`
- `maintenance_finance_events`
- `dashboard_widgets`
- `dashboard_user_layouts`
- `saved_reports`

## Campos faltantes en tablas existentes

### `locations`
- Se mantiene como tabla de sucursales.
- Campos suficientes para Prompt 2 inicial: `name`, `address`, `city`, `description`, `is_active`.

### `assets`
- `area_id`
- `manufacturing_year`
- `user_manual_url`
- `maintenance_pdf_url`
- `acquisition_value`
- `acquisition_currency`
- `responsible_profile_id`
- `responsible_name`
- `external_document_url`
- `maintenance_frequency_number`
- `maintenance_frequency_unit`

### `providers`
- `normalized_name`
- `tax_id`
- `supplier_type`
- `specialty`
- `main_contact_name`
- `main_email`
- `main_phone`
- `secondary_email`
- `secondary_phone`
- `website`
- `address`
- `city`
- `state`
- `country`
- `payment_terms`
- `currency`
- `status`

### `work_orders`
- `area_id`
- En siguientes iteraciones: `is_preventive`, `is_auto_generated`, `maintenance_plan_id`, `recurrence_group_id`, `scheduled_start`, `scheduled_end`, `responsible_profile_id`, `responsible_name`.

## Relaciones
- `locations.id -> branch_areas.branch_id`
- `locations.id -> assets.location_id`
- `branch_areas.id -> assets.area_id`
- `locations.id -> work_orders.location_id`
- `branch_areas.id -> work_orders.area_id`
- `providers.id -> supplier_contacts.supplier_id`
- `assets.id <-> providers.id` via `asset_suppliers`
- `work_orders.id <-> providers.id` via `work_order_suppliers`
- `assets.id -> maintenance_plans.asset_id`
- `maintenance_plans.id -> maintenance_plan_occurrences.maintenance_plan_id`
- `maintenance_plan_occurrences.work_order_id -> work_orders.id`

## Indices recomendados
- `branch_areas(company_id, branch_id, status)`
- `providers(company_id, normalized_name)`
- `providers(company_id, tax_id)`
- `providers(company_id, status)`
- `asset_suppliers(company_id, asset_id)`
- `asset_suppliers(company_id, supplier_id)`
- `work_order_suppliers(company_id, work_order_id)`
- `work_order_suppliers(company_id, supplier_id)`
- `assets(company_id, area_id)`
- `assets(company_id, maintenance_frequency_unit, maintenance_frequency_number)`

## RLS recomendado
- Toda tabla nueva con `company_id NOT NULL`.
- Politicas `FOR ALL` con `company_id = (select company_id from profiles where id = auth.uid())`.
- Superadmin / Mantix admin: mantener extension en scripts administrativos actuales, no abrir tablas nuevas sin criterios de alcance.
- Import/export: validar `company_id` en backend aunque el frontend lo envíe.

## Orden de ejecucion SQL
1. `20260501_001_user_profile_settings.sql`
2. `20260501_002_company_white_label_base.sql`
3. `20260501_003_storage_buckets_base.sql`
4. `20260501_004_branches_areas.sql`
5. `20260501_005_suppliers_core.sql`
6. `20260501_006_assets_core.sql`
7. Siguientes iteraciones: preventivo, calendario OT, finanzas, email links, dashboard reportes.

## Obligatorio
- `branch_areas`
- `assets.area_id`
- `work_orders.area_id`
- proveedores core extendidos (`providers` + `supplier_contacts`)
- relaciones `asset_suppliers` y `work_order_suppliers`
- `asset_documents`

## Opcional en esta iteracion
- `supplier_documents`
- `email_messages`, `email_entity_links`, `email_processing_logs`
- `dashboard_widgets`, `dashboard_user_layouts`, `saved_reports`
- `maintenance_finance_events`

## Riesgos
- Crear tablas paralelas `branches`, `suppliers` o `orders` duplicaria el modelo existente y romperia compatibilidad.
- Hay datos legacy en `providers.contact_name`, `providers.phone` y `providers.email`; deben mantenerse o migrarse sin borrar datos.
- El frontend debe tolerar schema parcial mientras el SQL no se ejecute, para no romper ambientes ya desplegados.