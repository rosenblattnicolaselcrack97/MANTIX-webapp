# MANTIX MVP1 + MVP2 Implementation Plan

## Alcance exacto
Implementar MVP operativo multiempresa con Supabase real para:
- Auth + empresa + usuarios/roles base
- Datos maestros: ubicaciones, categorías, proveedores, inventario físico
- Operación: órdenes de trabajo + stock/repuestos + integración de consumo de repuestos al cierre de OT

## Módulos en alcance
- Dashboard simple con KPIs reales
- Sucursales (locations jerárquico)
- Proveedores
- Inventario Físico
- Órdenes de Trabajo
- Stock y Repuestos
- Categorías
- Configuración general
- Usuarios

## Módulos fuera de alcance (MVP actual)
- Email/comunicaciones externas/inbound
- WhatsApp/Telegram
- IA y automatizaciones avanzadas
- Reporting avanzado
- Billing real y pasarelas de pago
- Preventivo avanzado
- Gantt/calendario avanzados
- Planos/canvas, OCR, webhooks externos

## Modelo de datos objetivo
1. Tenant y seguridad
- `companies`
- `profiles`
- `company_members`
- `company_settings`

2. Maestros
- `locations` (jerárquico con `parent_id` + `level_type`)
- `categories` (+ opcional `category_custom_fields`)
- `suppliers`, `supplier_contacts`, `supplier_documents`
- `physical_inventory` + relaciones (`inventory_locations`, `spare_compatibility`, `tool_associations`, `inventory_documents`, `inventory_readings`, `installation_responsibles`, `installation_inspections`)

3. Operación
- `work_orders`, `wo_tasks`, `wo_parts`, `wo_labor`, `wo_attachments`
- `warehouses`, `stock_levels`, `stock_movements`, `stock_lots`, `purchase_orders`, `po_items`

## Plan SQL
1. `001_mantix_mvp_schema.sql`
- Crea tablas nuevas faltantes y amplía columnas necesarias en tablas existentes.
- Incluye constraints, índices y funciones helper de negocio (ej. stock).

2. `002_mantix_mvp_rls.sql`
- Activa RLS en tablas MVP y crea políticas por membresía activa (`company_members`).
- Control básico por rol (owner/admin/gerente/supervisor con privilegios amplios).

3. `003_mantix_mvp_seed_optional.sql` (opcional)
- Datos mínimos de ejemplo claramente marcados como no productivos.

4. `999_cleanup_obsolete_review.sql`
- Script de limpieza/revisión manual de estructuras obsoletas.
- Incluye advertencias explícitas para comandos destructivos.

## Riesgos principales
- Migración progresiva de tablas legacy (`assets/providers/parts`) a tablas MVP nuevas.
- Roles legacy heterogéneos; requiere normalización gradual.
- Componentes antiguos que importan servicios mock no usados por rutas principales.

## Orden de implementación
1. Auditoría y plan (documentación).
2. SQL schema + RLS + runbook.
3. Auth/empresa/usuarios con roles objetivo.
4. Maestros (locations, categories, suppliers, physical_inventory).
5. Operación (work_orders + stock + integración cierre OT).
6. Cleanup de mocks y módulos fuera de alcance.
7. Validación final (`lint`, `build`, rutas y env).

## Decisiones técnicas
- No migrar framework ni reescribir la app desde cero.
- Priorizar compatibilidad progresiva entre legado y MVP para acelerar salida a producción.
- Implementar seguridad real en DB (RLS) y no solo filtrado frontend.
