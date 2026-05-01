# PROVEEDORES CORE - PROMPT 2

## Decision de modelo
- Mantix ya usa `providers` como tabla base.
- Prompt 2 extiende `providers` en lugar de crear `suppliers` paralelo.
- Se agregan tablas auxiliares `supplier_contacts`, `asset_suppliers` y `work_order_suppliers`.

## Lo implementado en frontend
- Ruta workspace `/providers` convertida a gestion real.
- Busqueda por nombre, email, telefono, CUIT, categoria, especialidad y notas.
- Filtro por estado y categoria.
- Alta y edicion manual de proveedor.
- Desactivacion / reactivacion sin borrar datos.
- Contadores reales de activos y ordenes asociados si las tablas de relacion ya existen.
- Contadores de comunicaciones si existe `email_entity_links`.
- Alta de contactos multiples cuando `supplier_contacts` ya esta disponible.
- Fallback al schema viejo si todavia no corriste la migracion.

## SQL requerido
- Ejecutar `supabase/migrations/20260501_005_suppliers_core.sql`.

## Campos principales esperados en `providers`
- `name`
- `normalized_name`
- `tax_id`
- `supplier_type`
- `category`
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
- `notes`
- `status`

## Normalizacion
- La migracion agrega `normalize_company_text`.
- `normalized_name` queda en mayusculas, sin tildes, trim y con espacios compactados.
- Sirve para detectar duplicados futuros y para importaciones masivas.

## Relaciones
- `supplier_contacts.supplier_id -> providers.id`
- `asset_suppliers.supplier_id -> providers.id`
- `work_order_suppliers.supplier_id -> providers.id`

## Seguridad
- Todas las tablas nuevas llevan `company_id`.
- Las politicas RLS quedan limitadas a la empresa del usuario.
- La UI no asume que ocultar botones es suficiente; el filtro por empresa sigue estando en Supabase.

## Como probar rapido
1. Abrir `/providers` con usuario de empresa.
2. Crear proveedor nuevo.
3. Editarlo.
4. Desactivarlo y reactivarlo.
5. Correr `20260501_005_suppliers_core.sql`.
6. Agregar contacto adicional.
7. Verificar filtros y busqueda.