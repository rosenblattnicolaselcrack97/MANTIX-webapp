# Remoción de Mensajería Interna — Mantix MVP

> Fecha: 2026-04-30  
> Estado: Completado

---

## Objetivo

Eliminar o desactivar todo lo relacionado con mensajería interna tipo chat/inbox para el MVP. La comunicación pasará por un sistema de emails profesionales con historial en Supabase.

---

## Archivos Modificados

### `src/lib/navigation.ts`
**Cambios:**
- ❌ Eliminado ítem de navegación `"messages"` (link a `/messages` con badge `"3"`).
- ❌ Eliminado import de `MessageSquareMore` de lucide-react.
- ❌ Eliminados badges hardcodeados `"15"` (work-orders) y `"32"` (assets) — eran datos falsos.
- ❌ Eliminadas subtítulos hardcodeados con datos fake: `"Buenos dias, Juan"`, `"15 activas · 3 urgentes sin asignar"`, `"32 equipos registrados · 5 con alertas"`, `"3 sin leer"`, etc.
- ✅ Subtítulos reemplazados por textos genéricos y correctos.
- ✅ Entrada de pageMeta para `/messages` eliminada.

### `src/components/layout/app-sidebar.tsx`
**Cambios:**
- ❌ Eliminado import de `MessageSquareMore`.
- ❌ Eliminado link `"Mensajes"` del dropdown del usuario en la barra lateral.
- ✅ Badge de rol del usuario cambiado de `"Administrador"` hardcodeado a `{currentUser.team ?? "Usuario"}` — valor real del perfil.

---

## Archivos No Modificados (con justificación)

### `src/app/(workspace)/messages/page.tsx`
**Estado**: Mantenido como está — ya muestra un `WorkspaceEmptyState` correcto.  
**Justificación**: La ruta existe pero está limpia. No hay datos falsos. Puede actualizarse en el futuro para mostrar el historial de emails/comunicaciones por OT.

### `src/features/messages/components/messages-workspace.tsx`
**Estado**: No modificado, no se importa ni renderiza actualmente.  
**Justificación**: El componente usa 100% mock data (`providers`, `dashboardWorkOrders`, `currentUser` de `src/data/mock/`). No está conectado a ninguna ruta activa. Se puede eliminar en una siguiente limpieza cuando se defina la arquitectura de email inbound.

### `src/features/messages/services/get-messages-overview.ts`
**Estado**: No modificado, no se llama actualmente.  
**Justificación**: Usa mock data de `src/data/mock/platform.ts`. No está conectado a ninguna ruta activa.

### `src/data/mock/platform.ts`
**Estado**: No modificado.  
**Justificación**: Contiene `messages[]` (datos mock) pero también `providers[]` y `notifications[]` que podrían ser referenciados por otros componentes. Se mantiene para no romper referencias existentes. Auditar en limpieza futura.

---

## Qué Quedó Pendiente

| Ítem | Prioridad | Descripción |
|------|-----------|-------------|
| Eliminar `messages-workspace.tsx` | Media | Componente orphan con 100% mock data |
| Eliminar `get-messages-overview.ts` | Media | Service orphan con mock data |
| Limpiar `src/data/mock/platform.ts` | Alta | Eliminar `messages[]` y `notifications[]` mock |
| Ruta `/messages` | Baja | Puede mantenerse como placeholder o reutilizarse para historial de emails |

---

## Lógica Reutilizable para Emails/Historial

El componente `messages-workspace.tsx` implementa:
- Una lista de hilos (thread list) con búsqueda.
- Un panel de detalle por hilo.
- Un "asistente" de dispatch de mensajes.

**Qué se puede reutilizar en el futuro sistema de emails:**
- La estructura de lista-detalle (UI pattern) — reutilizable para mostrar `email_threads` por OT.
- El concepto de "relacionar un hilo con una OT" — ya está en la lógica del componente (campo `relatedWorkOrderId`).
- El sistema de búsqueda/filtro — adaptable a email_threads.

---

## Estado Visual Post-Remoción

| Elemento | Antes | Después |
|----------|-------|---------|
| Sidebar — sección "Gestión" | Tenía link "Mensajes" con badge "3" | Sin link de Mensajes |
| Sidebar — dropdown usuario | Tenía "Mensajes" como opción | Solo "Configuracion" y "Cerrar sesión" |
| Badge work-orders | "15" hardcodeado | Sin badge |
| Badge assets | "32" hardcodeado | Sin badge |
| Greeting dashboard | "Buenos dias, Juan" | "Resumen operativo de tu empresa" |
| Subtítulo work-orders | "15 activas · 3 urgentes sin asignar" | "Gestion y seguimiento de intervenciones" |
| Rol usuario en sidebar | "Administrador" fijo | Valor real del perfil (`currentUser.team`) |
