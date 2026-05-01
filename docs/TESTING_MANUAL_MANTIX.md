# Checklist de Testing Manual — MANTIX

## Prerequisitos

- [ ] Variables de entorno configuradas en Vercel (ver sección al final)
- [ ] SQL migrations ejecutadas en Supabase (orden: schema.sql → admin-setup.sql → mantix-admin-migration.sql → company-search-fn.sql → migrations/001_email_tables.sql)
- [ ] Build limpio: `npm run build` sin errores
- [ ] Cuenta de super admin creada y `is_super_admin = true` en tabla profiles

---

## 1. Registro de nuevo usuario

### 1a. Crear empresa nueva
- [ ] Ir a `/auth/signup`
- [ ] Completar Step 1: nombre, email, contraseña
- [ ] Seleccionar "Crear nueva empresa", ingresar nombre
- [ ] Submit → debe mostrar mensaje de éxito y redirigir a `/auth/login?registered=1`
- [ ] En login debe aparecer el banner verde "Cuenta creada correctamente"
- [ ] Iniciar sesión con las credenciales recién creadas
- [ ] Debe redirigir al workspace `/`
- [ ] Verificar en Supabase: `auth.users` tiene el usuario, `profiles` tiene perfil con `company_id`, `companies` tiene la empresa

### 1b. Unirse a empresa existente
- [ ] Registrarse con modo "join"
- [ ] Buscar una empresa (mínimo 2 caracteres)
- [ ] Seleccionar empresa de los resultados
- [ ] Submit → éxito y redirect a login
- [ ] Iniciar sesión → debe ir a workspace con la empresa seleccionada

### 1c. Email duplicado
- [ ] Intentar registrarse con email ya existente
- [ ] Debe mostrar error "Este email ya está registrado"

---

## 2. Inicio de sesión

- [ ] Login con credenciales válidas → redirect a `/`
- [ ] Login con contraseña incorrecta → mensaje de error claro
- [ ] Login con super admin → redirect a `/admin`
- [ ] Login con mantix admin → redirect a `/admin`
- [ ] Login con usuario sin empresa → redirect a `/setup`

---

## 3. Navegación (sidebar)

- [ ] No aparece "Mensajes" en el sidebar
- [ ] No aparece "Mensajes" en el dropdown del usuario
- [ ] No hay badges con números hardcodeados ("15", "32", "3")
- [ ] El badge de rol del usuario en el sidebar muestra el rol dinámico (no "Administrador" fijo)

---

## 4. Panel Admin — Empresas

- [ ] `/admin/companies` carga la lista de empresas correctamente
- [ ] Se puede entrar al detalle de una empresa
- [ ] Tabs (Usuarios, Activos, etc.) funcionan

---

## 5. Panel Admin — Usuarios (nuevo)

- [ ] `/admin/users` carga la lista de todos los usuarios
- [ ] Buscador filtra por nombre, email o empresa
- [ ] Filtro por estado funciona (Activo / Inactivo / Sin empresa)
- [ ] Filtro por rol funciona
- [ ] Botón de activar/desactivar usuario actualiza el estado sin recargar
- [ ] Botón de reenviar invitación llama a la API (puede fallar si no hay service_role key)
- [ ] Link "Usuarios" en sidebar admin aparece y está activo en la ruta `/admin/users`

---

## 6. Email (si Resend configurado)

- [ ] Crear nuevo usuario → llega email de bienvenida
- [ ] Verificar en tabla `email_events` que el evento fue registrado

---

## Variables de entorno requeridas (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   ← CRÍTICO para signup y admin
NEXT_PUBLIC_SITE_URL=https://mantixarg.com
RESEND_API_KEY=re_xxxx                         ← Opcional, para emails reales
MANTIX_FROM_EMAIL=avisos@mantixarg.com
MANTIX_FROM_NAME=Mantix
```

---

## Notas

- Si `SUPABASE_SERVICE_ROLE_KEY` no está configurado, el signup fallará con error 500
- Si `RESEND_API_KEY` no está configurado, los emails no se envían pero el registro igual funciona
- El query de `/admin/users` usa el cliente `supabase` (anon) con RLS, por lo que el usuario debe ser `is_super_admin` o `is_mantix_admin` para ver todos los perfiles (requiere política RLS en `profiles` para admins)
