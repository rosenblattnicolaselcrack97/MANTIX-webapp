# USUARIOS EMPRESA ADMIN PROMPT 1

## Ruta
- `/users`

## Permisos
- Visible para `admin`, `manager`, `admin_empresa` o `company_admin`.
- Usuario comun ve estado sin permisos.
- APIs requieren admin empresa y `company_id`; no permiten operar sobre otra empresa.

## APIs
- `GET /api/company/users`
- `POST /api/company/users`
- `PATCH /api/company/users/[userId]`
- `POST /api/company/users/[userId]/resend-invite`

## Funciones
- Ver usuarios de la empresa.
- Invitar usuario.
- Editar nombre.
- Cambiar rol.
- Activar/desactivar.
- Reenviar invitacion.

## Roles permitidos
- `admin`
- `manager`
- `technician`
- `viewer`
- `admin_empresa`
- `supervisor`
- `tecnico`
- `financiero`
- `solo_lectura`

## Pruebas
- Admin empresa lista solo usuarios con su `company_id`.
- Usuario comun no puede acceder por UI ni API.
- Intentar editar usuario de otra empresa devuelve 403.
