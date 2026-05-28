# Vercel Deploy Checklist (MANTIX MVP)

## 1) Variables de entorno en Vercel
Configurar en Project Settings -> Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Valores recomendados:

- `NEXT_PUBLIC_SITE_URL`: URL publica del deployment (por ejemplo `https://mantix-webapp.vercel.app`).
- `SUPABASE_SERVICE_ROLE_KEY`: solo en servidor, nunca exponer en frontend.

## 2) Build settings
- Framework preset: `Next.js`
- Build command: `npm run build`
- Install command: `npm install`
- Node version: `20.x`

## 3) SQL previo obligatorio
Ejecutar en este orden segun [SUPABASE_SQL_RUNBOOK.md](SUPABASE_SQL_RUNBOOK.md):

1. `supabase/migrations/001_mantix_mvp_schema.sql`
2. `supabase/migrations/002_mantix_mvp_rls.sql`
3. `supabase/migrations/003_mantix_mvp_seed_optional.sql` (opcional)

No ejecutar comandos destructivos de `999_cleanup_obsolete_review.sql` sin backup validado.

## 4) Smoke test post-deploy
Validar en produccion:

1. Login y signup crean perfil + company membership.
2. Dashboard carga KPIs sin errores de permisos.
3. Inventario fisico lista datos (o estado vacio sin crash).
4. Ordenes de trabajo permite crear y listar.
5. Usuarios de empresa permiten ver/editar roles MVP.
6. Navegacion no muestra modulos fuera de alcance MVP activo.

## 5) Monitoreo inicial (primeras 24h)
- Revisar logs de Vercel (API routes con 4xx/5xx).
- Revisar logs de Supabase (Auth, PostgREST, RLS denials).
- Confirmar que no haya consultas anonimas rechazadas por RLS en rutas autenticadas.

## 6) Rollback rapido
Si hay regresion critica:

1. Promover deployment previo estable desde Vercel.
2. Mantener SQL ya aplicado (evitar rollback manual de DB salvo plan explicitamente probado).
3. Abrir hotfix sobre rutas afectadas y redeploy.
