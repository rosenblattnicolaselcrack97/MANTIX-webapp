# STORAGE PROMPT 1

## Buckets
- `user-avatars`
- `company-logos`

## Donde se usan
- `user-avatars`: avatar desde Configuracion -> Usuario.
- `company-logos`: logo desde Configuracion -> Empresa.

## Politicas incluidas
- Lectura publica para ambos buckets.
- Avatar insert/update/delete solo cuando la primera carpeta del path coincide con `auth.uid()`.
- Logo insert/update/delete solo si el usuario autenticado esta activo, pertenece a la empresa del path y tiene rol admin empresa.

## Path esperado
- Avatar: `{userId}/{timestamp}.ext`
- Logo empresa: `{companyId}/{timestamp}.ext`

## Pendiente manual
- Ejecutar `supabase/migrations/20260501_003_storage_buckets_base.sql`.
- Confirmar en Supabase que Storage RLS esta activo.
- Definir limites de tamano/tipo MIME si se quiere endurecer mas.
