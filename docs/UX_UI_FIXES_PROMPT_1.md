# UX UI FIXES PROMPT 1

## Cambios aplicados
- Estados claros para cuenta pendiente, sin empresa e inconsistencia.
- `/auth/user-approved` profesional con CTA, loading y empty/error state.
- Sidebar sin numeros falsos y con modo colapsado.
- Settings separado en Usuario y Empresa.
- Tabla de usuarios de empresa con acciones reales y loading en acciones.
- Pantallas coming soon para modulos no incluidos en Prompt 1.

## Correcciones de datos falsos
- Se elimino el subtitulo hardcodeado `Orden #2847`.
- La navegacion no tiene badges numericos.
- Los modulos grandes no conectados quedan como coming soon o documentados como deuda legacy.

## Riesgos pendientes
- Hay modulos legacy con mocks en `src/features/**` y `src/data/mock/**`.
- `npm run lint` puede seguir fallando por deuda previa con `@ts-nocheck`, `any` y reglas React Compiler en admin/CSV.
- No se eliminaron esos archivos para no romper funcionalidades fuera del alcance Prompt 1.

## Prueba visual
- Revisar auth en mobile/desktop.
- Revisar settings en mobile/desktop.
- Revisar tabla `/users` con scroll horizontal.
- Revisar coming soon sin datos inventados.
