# TESTING PROMPT 1

## Resultado tecnico
- `npm run typecheck`: OK.
- `npm run build`: OK. Primer intento corto por timeout de 3 minutos; segundo intento con mas margen compilo correctamente.
- `npm run lint`: falla por deuda legacy fuera del alcance inmediato.
- `npm run dev`: en sandbox falla con `spawn EPERM`; se pidio ejecutar fuera del sandbox pero la aprobacion automatica fue rechazada por limite de uso. No quedo servidor escuchando en 3000-3003.

## AUTH
- [ ] Crear usuario nuevo.
- [ ] Aprobar/verificar por email.
- [ ] Confirmar que el link llega a `/auth/confirm`.
- [ ] Confirmar que `/auth/confirm` termina en `/auth/user-approved`.
- [ ] Confirmar redireccion automatica a `/auth/login`.
- [ ] Loguear usuario aprobado con empresa.
- [ ] Confirmar que NO pregunta empresa nuevamente.
- [ ] Confirmar ingreso al dashboard.
- [ ] Probar usuario sin empresa: `/auth/account-status?state=no_company`.
- [ ] Probar usuario pendiente: `/auth/account-status?state=pending`.

## EMAIL
- [ ] Revisar `docs/email-templates/account-approved.html`.
- [ ] Revisar `docs/email-templates/account-approved.txt`.
- [ ] Confirmar badge cuenta aprobada.
- [ ] Confirmar boton con `{{ .ConfirmationURL }}`.
- [ ] Confirmar Redirect URL Supabase: `https://mantixarg.com/auth/confirm`.

## CONFIG USUARIO
- [ ] Cambiar nombre/apellido/display name.
- [ ] Subir avatar en `user-avatars`.
- [ ] Cambiar tema.
- [ ] Guardar preferencias web/email.
- [ ] Pedir reset password.
- [ ] Actualizar password.

## CONFIG EMPRESA
- [ ] Ejecutar migraciones SQL.
- [ ] Entrar con admin empresa.
- [ ] Cargar settings reales desde `/api/company/settings`.
- [ ] Cambiar nombre, descripcion, logo, colores, tema, tamano de letra y preferencias de email.
- [ ] Confirmar que usuario comun no puede editar empresa.

## USUARIOS EMPRESA
- [ ] Ver usuarios de la propia empresa.
- [ ] Invitar usuario.
- [ ] Editar nombre.
- [ ] Cambiar rol.
- [ ] Desactivar/activar.
- [ ] Reenviar invitacion.
- [ ] Confirmar que no ve ni edita usuarios de otra empresa.

## SIDEBAR
- [ ] Colapsar/expandir en desktop.
- [ ] Confirmar persistencia local.
- [ ] Confirmar que no hay numeros falsos.
- [ ] Confirmar `Usuarios` solo para admin empresa.
- [ ] Confirmar `Stock y repuestos` como coming soon.

## UX/UI
- [ ] Revisar textos de auth y account status.
- [ ] Revisar settings en desktop/mobile.
- [ ] Revisar tabla de usuarios con scroll horizontal.
- [ ] Revisar loading/error states.

## Si algun comando falla
- Error exacto: `npm run lint` reporta 85 problemas, 70 errores y 15 warnings.
- Causa probable: deuda previa en modulos admin/CSV/hooks con `@ts-nocheck`, `any`, `react-hooks/set-state-in-effect`, `react-hooks/preserve-manual-memoization` y un orden incorrecto de `buildFinalRows` en `CSVImportExport`.
- Archivo relacionado: principalmente `src/app/admin/**`, `src/components/admin/**`, `src/hooks/**`, `src/lib/csv*.ts`, `src/lib/duplicateDetection.ts`.
- Solucion propuesta: abrir una pasada tecnica separada para tipar admin/CSV, remover `@ts-nocheck`, mover helpers antes de uso y ajustar efectos para React Compiler.
- Error exacto dev: `Error: spawn EPERM`.
- Causa probable dev: restriccion del sandbox para que Next.js dev pueda spawnear procesos worker.
- Solucion propuesta dev: ejecutar localmente `npm run dev` desde la terminal del proyecto o aprobar ejecucion fuera del sandbox cuando vuelva a estar disponible.
