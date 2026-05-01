# Auditoría Mantix — Estado Actual del Proyecto

> Generado: 2026-04-30  
> Auditor: Tech Lead Senior  
> Alcance: `MANTIX_WEBAPP/` — revisión completa pre-modificación

---

## 1. Stack Real

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | ^16.2.4 |
| Runtime | React | 19.2.3 |
| Lenguaje | TypeScript | ^5 |
| Estilos | Tailwind CSS | ^4 |
| UI components | Radix UI + shadcn-style | varios |
| Backend/DB | Supabase (Postgres + Auth + RLS) | ^2.103.2 |
| Deploy | Vercel | — |
| Dominio productivo | https://mantixarg.com | — |
| Iconos | lucide-react | ^0.577.0 |

**NO hay**: Vite, React Router, Express, tRPC, Prisma, Redux.  
El único backend son las **Next.js API Routes** (`/src/app/api/`).

---

## 2. Estructura de Carpetas (relevante)

```
src/
├── app/
│   ├── (workspace)/          ← Área usuario normal (protegida con ProtectedRoute)
│   │   ├── page.tsx          ← Dashboard (usa Supabase real, no mock)
│   │   ├── layout.tsx        ← ProtectedRoute + WorkspaceShell
│   │   ├── assets/
│   │   ├── messages/         ← Placeholder de mensajería (empty state)
│   │   ├── parts/
│   │   ├── preventive/
│   │   ├── providers/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── work-orders/
│   ├── admin/                ← Panel SuperAdmin / MantixAdmin
│   │   ├── page.tsx          ← Dashboard de admin (usa Supabase real)
│   │   ├── layout.tsx        ← AdminRoute + sidebar colapsable
│   │   ├── companies/        ← Gestión de empresas (CRUD con service_role)
│   │   ├── users/            ← BUG: solo redirige a /admin/companies
│   │   ├── assets/
│   │   ├── locations/
│   │   ├── admin-settings/
│   │   └── work-orders/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── create-company/route.ts        ← service_role
│   │   │   ├── create-company-user/route.ts   ← inviteUserByEmail
│   │   │   ├── create-mantix-admin/route.ts   ← inviteUserByEmail (admin rol)
│   │   │   └── reset-admin-password/route.ts
│   │   ├── setup/
│   │   │   └── create-company/route.ts        ← para onboarding post-auth
│   │   └── csv/
│   ├── auth/
│   │   ├── login/page.tsx    ← Animación de logo + form
│   │   ├── signup/page.tsx   ← Form 2 pasos: credenciales + empresa
│   │   └── confirm/page.tsx  ← PKCE callback → redirige según perfil
│   └── setup/page.tsx        ← Onboarding empresa para nuevos usuarios
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx  ← Guarda workspace, redirige a /setup si sin empresa
│   │   └── AdminRoute.tsx      ← Guarda panel admin
│   └── layout/
│       ├── app-shell.tsx       ← Layout principal del workspace
│       ├── app-sidebar.tsx     ← Sidebar con nav + dropdown usuario
│       └── workspace-shell.tsx ← Carga company de Supabase, buildea props
├── contexts/
│   ├── AuthContext.tsx         ← Gestión de sesión, perfil, signUp/signIn/signOut
│   └── SelectedCompanyContext.tsx ← Empresa seleccionada en panel admin
├── data/
│   └── mock/                  ← ⚠️ MOCK DATA — ver sección de bugs
│       ├── dashboard.ts
│       ├── platform.ts
│       └── parts.ts
├── features/
│   ├── messages/
│   │   ├── components/messages-workspace.tsx  ← ⚠️ TODO MOCK — debe eliminarse
│   │   └── services/get-messages-overview.ts  ← ⚠️ TODO MOCK
│   └── ...otros features
├── lib/
│   ├── supabase.ts             ← Cliente anon (browser)
│   ├── supabase-admin.ts       ← Cliente service_role (solo server-side)
│   ├── navigation.ts           ← ⚠️ Badges hardcodeados
│   └── auth-utils.ts           ← Helpers de auth
└── types/
    └── entities.ts             ← Tipos de dominio
supabase/
├── schema.sql                  ← Schema completo con RLS
├── admin-setup.sql             ← Configura funciones SECURITY DEFINER + superadmin
├── mantix-admin-migration.sql  ← Agrega is_mantix_admin, admin_company_assignments
└── company-search-fn.sql       ← RPC search_companies_by_name (SECURITY DEFINER)
```

---

## 3. Flujo de Login

1. Usuario visita `/` → `ProtectedRoute` chequea sesión → redirige a `/auth/login` si no hay sesión.
2. Formulario en `/auth/login` llama `AuthContext.signIn()` → `supabase.auth.signInWithPassword()`.
3. `onAuthStateChange` dispara → `loadProfile(user.id)` → fetch de `profiles` tabla.
4. `ProtectedRoute` re-evalúa:
   - Si `isAdminLevel` (super_admin | mantix_admin): redirect `/admin`.
   - Si no tiene `profile.company_id`: redirect `/setup`.
   - Si tiene perfil + empresa: accede workspace.

**Problema**: Si el perfil no existe en la tabla `profiles` pero el usuario existe en `auth.users`, `loadProfile` retorna `null`, el contexto tiene `profile=null`, y `ProtectedRoute` manda a `/setup`. El setup intenta crear empresa pero si ya hay empresa asignada en algún estado inconsistente, puede fallar.

---

## 4. Flujo de Registro — **BUG CRÍTICO**

**Código actual** (`AuthContext.signUp()`):
```typescript
// 1. Crear usuario en Supabase Auth
const { data, error } = await supabase.auth.signUp({ email, password });
// 2. Si companyMode==='create': insertar empresa con cliente anon
const { data: company, error: companyError } = await supabase
  .from("companies")
  .insert({ name: companySetup.name.trim() })
  .select("id")
  .single();
// 3. Upsert perfil con cliente anon
await supabase.from("profiles").upsert({...});
```

**Por qué falla**:
- La política RLS de `companies INSERT` solo permite `super_admin` o `is_super_admin()`.
- El usuario recién creado NO tiene sesión establecida si Supabase requiere confirmación de email.
- Incluso con auto-confirm, `auth.uid()` en RLS retorna `null` hasta que el token se propague.
- Resultado: `companyError` no null → se muestra error genérico → usuario queda en Supabase Auth sin perfil.

**Caso donde funciona**: cuando `companyMode === 'join'` (empresa existente). En ese caso se saltea el insert de empresa, pero el upsert de profile aún puede fallar.

**Estado de la empresa al registro fallido**: El usuario queda en `auth.users` sin entrada en `profiles`, sin empresa. Al intentar loguear:
- `loadProfile()` retorna null.
- `ProtectedRoute` redirige a `/setup`.
- `/setup` funciona correctamente usando `/api/setup/create-company`.
- **Conclusión**: El bug no deja al usuario completamente bloqueado, pero la experiencia es mala.

---

## 5. Creación de Empresas

| Ruta | Quién la usa | Mecanismo |
|------|-------------|-----------|
| `/api/admin/create-company` | Panel admin (superadmin) | service_role |
| `/api/setup/create-company` | `/setup` page post-login | service_role + verifica JWT usuario |
| `supabase.from("companies").insert()` directo | `AuthContext.signUp()` — **INCORRECTO** | anon key → falla por RLS |

La forma correcta está implementada en `/api/setup/create-company`. El bug es que `signUp()` en AuthContext no usa esa ruta.

---

## 6. Asignación de Usuarios a Empresas

- Columna `company_id` en tabla `profiles`.
- Se asigna durante signup (roto) o en /setup (funciona).
- Desde superadmin: panel de empresa → tab usuarios → crear/editar usuario.
- No hay tabla `company_memberships` separada; es solo `profiles.company_id`.

---

## 7. SuperAdmin

- Detección: `profiles.is_super_admin = TRUE` **O** `user.user_metadata.is_super_admin = true` (fallback).
- Email hardcodeado en `admin-setup.sql`: `rosenblattnicolas@gmail.com`.
- Acceso a: todas las empresas, todos los activos, todos los usuarios.
- RLS: políticas especiales usando `is_super_admin()` SECURITY DEFINER function.
- **MantixAdmin**: rol especial `is_mantix_admin=true` + tabla `admin_company_assignments` para ver solo empresas asignadas.

---

## 8. Tablas de Supabase Esperadas

| Tabla | Descripción |
|-------|-------------|
| `companies` | Empresas cliente |
| `profiles` | Usuarios extendidos (vinculados a auth.users) |
| `locations` | Sucursales por empresa |
| `assets` | Activos físicos |
| `providers` | Proveedores por empresa |
| `work_orders` | Órdenes de trabajo |
| `asset_status_history` | Historial de cambios de activos |
| `wo_status_history` | Historial de cambios de OTs |
| `wo_labor` | Horas trabajadas por OT |
| `wo_materials` | Materiales por OT |
| `failure_events` | Registro de fallas |
| `maintenance_budget` | Presupuesto de mantenimiento |
| `admin_company_assignments` | Asignaciones de MantixAdmin a empresas |

**Tablas FALTANTES** (aún no creadas):
- `email_events` — Log de emails enviados/recibidos
- `email_threads` — Hilos de email por entidad
- `notification_log` — Registro de notificaciones

---

## 9. Cosas Mockeadas o Hardcodeadas

### ⚠️ CRÍTICO — datos fake visibles en UI

| Archivo | Qué mockea | Dónde se usa |
|---------|-----------|--------------|
| `src/data/mock/platform.ts` | Empresa "Acero Sur SRL", usuario "Juan Perez", providers, messages, notifications | `features/messages/components/messages-workspace.tsx`, `features/messages/services/get-messages-overview.ts` |
| `src/data/mock/dashboard.ts` | KPIs, órdenes de trabajo, activos, alertas | Usado en features de dashboard (legacy, el dashboard nuevo ya usa Supabase) |
| `src/data/mock/parts.ts` | Repuestos inventados | Features de parts/stock |
| `src/lib/navigation.ts` | Badge "15" en work-orders, "32" en assets, "3" en messages; pageMeta "Buenos dias, Juan", "15 activas", "32 equipos", etc. | Sidebar y TopBar de todos los usuarios |
| `src/components/layout/app-sidebar.tsx` | "Administrador" hardcodeado en badge de usuario | Sidebar visible para todos |

### ⚠️ Hardcoded en código

- `navigation.ts` línea `/": { subtitle: "Buenos dias, Juan" }` — nombre hardcodeado.
- `navigation.ts` badges numéricos en work-orders, assets, messages.
- `supabase/admin-setup.sql` línea con `email = 'rosenblattnicolas@gmail.com'` — esperado, es SQL de setup.

---

## 10. Bugs Detectados

### BUG-001 🔴 CRÍTICO: Signup no puede crear empresa nueva
**Causa**: `AuthContext.signUp()` usa cliente anon para INSERT en `companies`, bloqueado por RLS.  
**Fix**: Cambiar signUp() para usar la API route `/api/setup/create-company` que usa service_role.  
**Archivos**: `src/contexts/AuthContext.tsx`, `src/app/auth/signup/page.tsx`

### BUG-002 🔴 CRÍTICO: Usuario creado sin perfil queda en estado zombie
**Causa**: Si la creación de company/profile falla post-signUp(), el usuario existe en Auth sin datos.  
**Fix**: Manejo robusto de errores en signUp + flujo de reparación en /setup.  
**Archivos**: `src/contexts/AuthContext.tsx`

### BUG-003 🟡 MEDIO: Admin Users page redirige a Companies
**Causa**: `src/app/admin/users/page.tsx` solo tiene un redirect.  
**Fix**: Implementar página de gestión de usuarios.  
**Archivos**: `src/app/admin/users/page.tsx`

### BUG-004 🟡 MEDIO: Navigation badges hardcodeados
**Causa**: `src/lib/navigation.ts` tiene badges numéricos estáticos.  
**Fix**: Eliminar badges o cargarlos dinámicamente.  
**Archivos**: `src/lib/navigation.ts`

### BUG-005 🟡 MEDIO: Greeting "Buenos dias, Juan" hardcodeado
**Causa**: `navigation.ts` pageMeta hardcodea nombre.  
**Fix**: Actualizar pageMeta para ser dinámico o genérico.  
**Archivos**: `src/lib/navigation.ts`, potencialmente `TopBar`

### BUG-006 🟠 BAJO: Mensajería en sidebar con badge "3"
**Causa**: Link "Mensajes" en sidebar con badge "3" lleva a empty state.  
**Fix**: Remover o desactivar visualmente.  
**Archivos**: `src/lib/navigation.ts`, `src/components/layout/app-sidebar.tsx`

### BUG-007 🟡 MEDIO: messages-workspace.tsx usa datos mock de plataforma
**Causa**: Importa `providers`, `dashboardWorkOrders`, `currentUser` de `data/mock/`.  
**Fix**: No se renderiza porque el `/messages` page ya tiene empty state, pero el componente existe.  
**Archivos**: `src/features/messages/components/messages-workspace.tsx`

### BUG-008 🟠 BAJO: isActive hardcodeado en sidebar
**Causa**: `app-sidebar.tsx` muestra "Administrador" fijo sin leer el rol real.  
**Fix**: Leer `currentUser.team` o `currentUser.role` del perfil real.  
**Archivos**: `src/components/layout/app-sidebar.tsx`

---

## 11. Rutas Rotas o Problemáticas

| Ruta | Estado | Problema |
|------|--------|---------|
| `/admin/users` | 🔴 Rota | Redirige a `/admin/companies` — no hay gestión de usuarios |
| `/auth/signup` con empresa nueva | 🔴 Bug | Falla en RLS al crear empresa |
| `/messages` | 🟡 Vacía | Muestra empty state correcto pero está en nav con badge "3" |
| `/providers` | 🟡 Desconocido | No auditado en profundidad |
| `/parts` | 🟡 Desconocido | Posiblemente usa mock data |
| `/reports` | 🟡 Desconocido | Posiblemente usa mock data |

---

## 12. Componentes que Sobran o Deben Modificarse

### Sobran / deben desconectarse:
- `src/features/messages/components/messages-workspace.tsx` — usa 100% mock data, no se renderiza actualmente
- `src/features/messages/services/get-messages-overview.ts` — usa mock data
- `src/data/mock/platform.ts` — mock data de providers, messages, notifications
- `src/data/mock/dashboard.ts` — mock KPIs y OTs (el dashboard real ya usa Supabase)

### Deben modificarse:
- `src/contexts/AuthContext.tsx` — fix signUp() para usar API route
- `src/lib/navigation.ts` — eliminar badges hardcodeados, fix greeting
- `src/components/layout/app-sidebar.tsx` — fix rol hardcodeado, remover link mensajes
- `src/app/admin/users/page.tsx` — implementar gestión de usuarios

---

## 13. Archivos que Tocaría y Por Qué

| Archivo | Acción | Motivo |
|---------|--------|-------|
| `src/contexts/AuthContext.tsx` | Modificar `signUp()` | Fix bug creación empresa |
| `src/app/auth/signup/page.tsx` | Modificar flujo post-signup | Adaptarse al nuevo signUp() |
| `src/lib/navigation.ts` | Remover badges hardcodeados, fix pageMeta | Eliminar datos falsos |
| `src/components/layout/app-sidebar.tsx` | Remover enlace Mensajes, fix rol | UX y mensajería |
| `src/app/admin/users/page.tsx` | Implementar desde cero | Gestión de usuarios |
| `src/app/api/auth/signup/route.ts` | Crear nuevo | API route para signup seguro |
| `src/lib/email-service.ts` | Crear nuevo | Abstracción para envío de emails |
| `src/lib/email-templates.ts` | Crear nuevo | Templates HTML de emails |
| `supabase/migrations/` | Crear SQLs nuevos | Tablas de emails + log |

---

## 14. Riesgos Antes de Avanzar

1. **RLS recursiva en profiles**: La función `get_my_company_id()` usa SECURITY DEFINER para evitar recursión. Si no está ejecutada en Supabase, las queries van a fallar o dar resultados vacíos. → **Ejecutar `admin-setup.sql` ANTES de cualquier prueba**.

2. **SUPABASE_SERVICE_ROLE_KEY no configurada**: Si no está en variables de Vercel/local, las API routes del admin retornarán HTTP 501. El signup via API route también fallará. → **Verificar `.env.local`**.

3. **NEXT_PUBLIC_SITE_URL no configurada**: Las invitaciones por email tendrán `redirectTo` vacío → links rotos. → **Agregar `NEXT_PUBLIC_SITE_URL=https://mantixarg.com` en Vercel**.

4. **Email confirmation en Supabase**: Si está habilitada, el usuario no puede crear su empresa en el mismo flujo de signup. El nuevo fix resuelve esto pero debe verificarse con la configuración real del proyecto.

5. **`search_companies_by_name` RPC**: Si no está ejecutado en Supabase, el buscador de empresas en signup/setup no funciona. → **Ejecutar `company-search-fn.sql`**.

6. **`admin_company_assignments` tabla**: Si no está creada, los MantixAdmin no pueden operar. → **Ejecutar `mantix-admin-migration.sql`**.

---

## 15. Comandos para Probar

```bash
# Instalar dependencias
cd "C:\Users\nicolas\Desktop\PROYECTOS APPS\MANTIX_WEBAPP"
npm install

# Lint
npm run lint

# Build (incluye typecheck en vercel-build)
npm run build

# Dev local
npm run dev
# → http://localhost:3000
```

**Variables de entorno necesarias en `.env.local`**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 16. Resumen Ejecutivo

| Área | Estado |
|------|--------|
| Auth / Login | ✅ Funciona si perfil existe y es_active=true |
| Auth / Signup empresa nueva | 🔴 Bug RLS — necesita fix |
| Auth / Signup empresa existente | 🟡 Parcialmente funciona |
| Workspace / Dashboard | ✅ Usa Supabase real |
| Workspace / Mensajería | 🟡 Placeholder — mock sin renderizar |
| Admin / Empresas | ✅ Funciona (usa service_role) |
| Admin / Usuarios | 🔴 Sin implementar (solo redirect) |
| SQL / Schema | ✅ Bien documentado, necesita verificar ejecución |
| Emails | 🔴 Sin implementar |
| Mock data | 🟡 Existe pero parcialmente desconectado |
