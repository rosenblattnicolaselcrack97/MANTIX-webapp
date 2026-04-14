# MANTIX WEBAPP — AUDITORÍA TÉCNICA COMPLETA
**Fecha:** Abril 2026  
**Versión auditada:** 0.1.0  
**Auditor:** Análisis arquitectónico multi-dimensión (Software Architecture + Product + UX/UI)  
**Audiencia:** CTO · Equipo técnico · Inversores

---

## 1. RESUMEN EJECUTIVO

### Qué hace la app hoy
MANTIX es un frontend funcional de un CMMS (Computerized Maintenance Management System) B2B SaaS targeting pymes industriales latinoamericanas. Permite visualizar órdenes de trabajo, activos, proveedores, preventivo, mensajes, reportes y configuración. Todo corre sobre datos mock hardcodeados sin backend real.

### Nivel general
**Frontend MVP sólido con deuda de integración.**  
El código es limpio, la arquitectura tiene buenas bases, el diseño visual es competitivo para la categoría. El problema es que casi toda la "funcionalidad" es cosmética: los formularios no persisten, los filtros no filtran, los charts tienen valores hardcodeados, y no hay backend ni auth.

### Principales fortalezas
- Stack moderno y bien elegido (Next.js App Router + TS + Tailwind 4)
- Sistema de diseño propio con dark/light mode implementado correctamente
- Feature-based folder structure con separación de responsabilidades
- Type coverage excelente — todas las entidades de negocio tipadas
- El formulario de Activos es el más completo y refleja buen pensamiento de producto
- La lógica de "continuidad de órdenes" (OT vinculadas) es un diferencial real

### Principales debilidades
- **Cero backend** — no hay API routes, auth, ni llamadas reales
- **Charts con datos hardcodeados** que no reflejan los datos mock reales
- **Filtros decorativos** — ningún `filter-chip` tiene handler funcional
- **Bugs concretos** en el código (ver Sección 9)
- **Página de Activos sin detalle** — no existe ruta `/assets/[id]`
- **CSS híbrido** mezclando utilidades Tailwind con clases custom en `globals.css`
- Sin testing, sin error boundaries, sin estados de carga

---

## 2. ARQUITECTURA FRONTEND

### Estructura del proyecto
```
src/
├── app/(workspace)/     # Route group — autenticado
│   ├── layout.tsx       # Shell de la aplicación
│   ├── page.tsx         # Dashboard
│   ├── assets/          # Lista + /new
│   ├── work-orders/     # Lista + /new + /[id]
│   ├── parts/           # Stock y repuestos
│   ├── providers/       # Proveedores
│   ├── messages/        # Mensajes
│   ├── preventive/      # Mantenimiento preventivo
│   ├── reports/         # Reportes
│   └── settings/        # Configuración
├── components/
│   ├── layout/          # AppShell, AppSidebar, TopBar
│   ├── shared/          # PageHeader, StatusChip, BrandMark
│   ├── theme/           # ThemeProvider, ThemeScript
│   └── ui/              # Button, Card, Badge, Input, Textarea, Sheet, Table
├── features/            # Lógica por dominio
│   ├── assets/
│   ├── dashboard/
│   ├── messages/
│   ├── parts/
│   ├── providers/
│   ├── reports/
│   ├── settings/
│   └── work-orders/
├── data/mock/           # Datos de prueba
├── lib/                 # Utilidades: theme, navigation, utils, branding
└── types/               # entities.ts — tipos de negocio
```

### Separación de responsabilidades
**Bien aplicada en general.** La separación `features/[domain]/components` + `features/[domain]/services` es correcta. Los servicios actualmente son wrappers de mock data, pero están estructurados para ser reemplazados por llamadas reales.

**Problema:** Algunos datos mock se importan directamente en páginas y componentes sin pasar por el service layer. Ejemplo:
- `reports/page.tsx` importa directamente `dashboardWorkOrders` y `trackedAssets` from mock
- `settings-workspace.tsx` importa `currentUser` y `mantixCompany` directamente desde `data/mock/platform`

Esto rompe la consistencia del patrón y va a generar deuda cuando se integre el backend.

### Manejo de estado
**Minimalista — solo `useState` local.**  
No hay Zustand, Redux, ni React Query. Para el MVP esto es correcto. El problema es que el estado de usuario (`currentUser`, `company`) se inyecta desde el servidor en el Layout pero se accede también desde el cliente en múltiples places directamente desde los mocks, creando dos fuentes de verdad.

**Riesgo real:** cuando se conecte el backend, habrá que refactorizar todos los puntos de acceso a datos de sesión.

### Escalabilidad del código
El sistema de tipos (`types/entities.ts`) es robusto y completo. Los `Draft` types (`WorkOrderDraft`, `AssetDraft`) están bien pensados para formularios. La separación `Entity` vs `Draft` es buena práctica.

**Problema de escalabilidad**: El archivo `globals.css` tiene ~700 líneas de CSS custom que conviven con Tailwind 4. A medida que la app crece, este archivo se va a convertir en un cuello de botella de mantenimiento.

---

## 3. UX / UI EVALUATION

### Claridad visual
**Alta.** El dark mode con paleta azul/cian sobre fondos profundos (`#06080e`) es consistente con software industrial. La jerarquía visual funciona: KPI cards arriba, tables de trabajo en el centro, panel lateral con alertas.

### Legibilidad (contrastes, colores)
**Buena en dark mode, pendiente de validar en light mode.**  
- Dark: `--t1: #ffffff` sobre `--bg: #06080e` — contraste excelente
- Light: `--t1: #07101f` sobre `--bg: #e8eef7` — contraste aceptable
- `--t3: #3d5068` en dark mode sobre fondos oscuros puede ser problemático para textos de soporte

### Dark mode / Responsive
**Dark mode: implementado y funcional.** La implementación es correcta — usa `data-theme` en `<html>`, persiste en localStorage, respeta `prefers-color-scheme`.

**Responsive: parcialmente implementado.** Hay breakpoints en `globals.css` para `1279px`, `1023px`, y `767px`. En mobile:
- El sidebar se convierte en Sheet (correcto)
- Las grids colapsan a una columna (correcto)
- La topbar se adapta (correcto)

**Problema responsive**: La tabla de órdenes de trabajo en mobile hace scroll horizontal, pero sin indicación visual clara de que hay más columnas. Experiencia aceptable pero mejorable.

### Navegación
**Inconsistencia crítica:** El ítem "Sucursales" en la sidebar apunta a `/settings` en vez de a una ruta propia `/branches`. Este es un bug de producto que confunde al usuario:

```typescript
// src/lib/navigation.ts — LÍNEA 55
{
  id: "branches",
  title: "Sucursales",
  href: "/settings",  // ← BUG: debería ser /branches
  icon: Wrench,
},
```

### Consistencia de diseño
**Alta en components**, pero hay inconsistencias de implementación:
- Formularios usan `<select>` nativo con clase `.form-control` (CSS custom)
- Pero usan `<Input>` del componente UI para inputs de texto
- Los `filter-chip` son `<button>` sin handler — solo cambia el estilo de `.active` en el primero con clase hardcodeada

### Problemas críticos de experiencia
1. **Filtros no funcionan** — Todos los chips de filtro en `/work-orders` son decorativos. El chip "Todas (61)" tiene clase `active` hardcodeada. No hay `onClick`.
2. **"Ver →" en Activos no tiene destino real** — No existe `/assets/[id]`
3. **Donut chart no refleja datos reales** — Los porcentajes del donut están hardcodeados en el CSS (`conic-gradient`), no derivados de los datos
4. **Bar chart hardcodeado** — Los `height` en píxeles y los valores del chart mensual no son dinámicos
5. **El selector de fuente en Settings no cambia la fuente global** — El propio código lo dice: "Vista previa local... No cambia la fuente global de la app"
6. **Toggles de notificaciones decorativos** — Todos en `on`, sin estado reactivo

---

## 4. PRODUCT THINKING

### Features bien pensadas
- **Continuidad de órdenes (OT vinculadas):** La relación `followsWorkOrderId` en WorkOrder es un diferencial real. Pocos CMMS de nivel SMB tienen esto. Está bien modelado en tipos y bien representado en la UI.
- **Resolución interna/externa por OT:** Correcto para el mercado argentino donde conviven técnicos propios y proveedores.
- **Evidencia fotográfica en OT:** Bien posicionado como core feature. El formulario de carga está integrado.
- **Criticidad de activos (baja/media/alta):** Fundamental para un CMMS real. Bien tipado.
- **IA tag como señal de roadmap:** El `ia-tag` en el UI es un buen placeholder que comunica evolución sin over-prometer.
- **Panel de módulos con `readiness` (ready/foundation/planned):** Honesto y comunica el roadmap visualmente.

### Qué falta para ser un CMMS real
1. **Historial completo de activo:** Solo hay 2 ítems en el timeline hardcodeados. Un CMMS real necesita historial cronológico real, filtrable por tipo de intervención.
2. **Sin página de detalle de activo** — El activo es la entidad central del sistema. No tener `/assets/[id]` es un gap crítico.
3. **Sin estado de OT editable** — No hay forma de cambiar el estado de una OT (En curso → Completada).
4. **Sin asignación de OT** — No hay UI para asignar una OT sin asignar a un técnico.
5. **Sin cálculo de KPIs reales** — MTTR, MTBF, y compliance son strings hardcodeados. Necesitan lógica de cálculo real.
6. **Sin QR/código de activo** — Para CMMS industrial, escanear un QR y ver/crear OT es flujo crítico.
7. **Sin vista de calendario** — El preventivo necesita vista de calendario (month/week view), no solo tabla.
8. **Sin firma/cierre formal de OT** — Falta flujo de "cerrar OT con firma o confirmación" para compliance.

### Qué partes no aportan valor hoy
- **Selector de tipografía en Settings:** Es cosmético y el código mismo advierte que no funciona. Eliminar o implementar.
- **`openIssues + 8` en Assets page:** Esto es un bug/placeholder que no tiene sentido de negocio.
- **El "Asistente IA" en formularios:** El texto es hardcodeado ("desgaste o mantenimiento vencido") sin lógica real. Comunica bien el roadmap pero puede generar expectativas falsas en demos.

### Features a agregar PRIORITARIAMENTE
1. **Detalle de activo** (`/assets/[id]`) con historial de OTs, métricas de disponibilidad, y documentos
2. **Cambio de estado de OT** con registro de quién y cuándo
3. **Asignación de OT** desde la lista y desde el detalle
4. **Backend básico + auth** sin esto el resto no tiene sentido

---

## 5. PERFORMANCE & OPTIMIZACIÓN

### Carga inicial
El stack de Next.js App Router con RSC (React Server Components) está bien usado. Las páginas de lista son Server Components, solo los formularios y el shell usan `"use client"`. Esto es correcto y favorece el Time to First Byte.

**Sin embargo**: No hay `loading.tsx` en ninguna ruta. Si los `async` page functions tardan (cuando se conecte backend), no hay skeleton ni fallback.

### Uso de assets
- Sin imágenes reales (solo emojis como placeholders)
- Sin fuentes externas (usa Segoe UI del sistema)
- La única fuente externa potencial es si se agrega tipografía custom

### Posibles cuellos de botella
1. **`globals.css` de ~700 líneas:** Todo el CSS custom está en un único archivo que se carga global. Con Tailwind 4 esto debería poder ser refactorizado gradualmente a CSS Modules o utility classes.
2. **Charts en CSS puro:** El donut chart usa `conic-gradient` hardcodeado. Cuando se dinamice, va a requerir o bien un chart library (Recharts, Chart.js) o cálculo de `conic-gradient` dinámico en JS. El segundo enfoque tiene límites de mantenimiento.
3. **Sin `React.memo` o `useMemo` estratégico:** En listas grandes de OTs o activos, los re-renders podrían ser un problema. Actualmente no es visible con mock data pequeña.

### Mejores prácticas no aplicadas
- Sin `Suspense` boundaries para SSR/streaming
- Sin `loading.tsx` en rutas async
- Sin `error.tsx` — un error en `getWorkOrderDetail` causa crash sin mensaje amigable
- Sin paginación en tablas — escalar a 500 OTs sin paginación es inviable

---

## 6. ESCALABILIDAD

### Qué tan preparado está para crecer

**10 empresas:** El código aguanta, pero hay que resolver el multi-tenant desde la raíz. Hoy `mantixCompany` es un objeto hardcodeado. No hay concepto de `tenantId` en ninguna query.

**100 empresas:** Requiere:
- Auth real con sesión por empresa
- Todas las queries filtradas por `companyId`
- CDN para evidencia fotográfica (hoy no hay storage)
- Las tablas sin paginación van a ser inusables con datos reales

**1000 empresas:**
- La arquitectura frontend actual no escala sin estas adiciones: data fetching con caché (React Query o SWR), paginación/cursor en todas las listas, lazy loading de módulos poco usados
- La estructura de `types/entities.ts` como archivo único se convierte en problema de mantenimiento

### Problemas específicos si escala

**Multi-tenant:**
```typescript
// Hoy — hardcodeado en layout.tsx
export default function WorkspaceLayout({ children }) {
  return (
    <AppShell company={mantixCompany} currentUser={currentUser}>
```
Cuando haya auth real, `company` y `currentUser` deben venir de sesión/JWT, no de un archivo mock.

**Evidencia fotográfica a escala:**  
El campo `attachments: File[]` en `WorkOrderDraft` y `AssetDraft` guarda archivos en memoria. Necesita:
- Upload directo a S3/Cloudflare R2
- Thumbnails generados server-side
- Sin esto, subir 10 fotos de 5MB cada una crashea el browser

### Qué cambiaría YA
1. Agregar `tenantId` o `companyId` a todos los tipos de entidad que lo requieran
2. Implementar paginación en las tablas desde el principio
3. Mover el manejo de archivos a un servicio de storage dedicado desde el día 1
4. Agregar un `api/` folder con Next.js Route Handlers como intermediario antes de conectar backend externo

---

## 7. SEGURIDAD (FRONTEND)

### Manejo de datos sensibles
**Sin auth** — Esta es la observación principal. No hay:
- Middleware de autenticación en Next.js
- Protección de rutas (todo es accesible sin login)
- Session management
- JWT handling

Para la etapa actual (demo/MVP sin usuarios reales) esto es aceptable, pero **no se puede lanzar a producción así.**

### Validaciones
Los formularios (`WorkOrderComposer`, `AssetRegistrationForm`) **no tienen validación real.** El único "efecto" al hacer submit es setear `submitted: true`. No hay:
- Validación de campos requeridos (`*`) — marcados visualmente pero sin validación
- Validación de formato de fecha, números, emails
- Sanitización de inputs

### Posibles riesgos
- **XSS:** Actualmente no hay riesgo real porque no hay datos del servidor renderizados. Cuando se integre backend, revisar que los datos de texto (títulos de OT, notas) pasen por `next/link` y no `dangerouslySetInnerHTML`.
- **CSRF:** Sin API routes ni forms que postean a server, no aplica hoy. Cuando se agregue, implementar tokens CSRF.
- **File upload sin validación:** El `<input type="file">` acepta cualquier archivo. Agregar validación de tipo MIME y tamaño tanto en frontend como backend.

---

## 8. PREPARACIÓN PARA BACKEND

### Qué está bien preparado
- El service layer (`features/*/services/`) es el punto de integración correcto. Cada función async puede reemplazarse con una llamada HTTP sin tocar los componentes.
- Los tipos están completos — cuando el backend responda, es probable que los tipos ya estén definidos.
- La separación RSC (Server) vs `"use client"` está bien hecha — las páginas de lista ya son Server Components listos para fetch server-side.

### Qué falta definir
- **Auth provider:** Decidir entre JWT, sessions, NextAuth, Clerk, Auth0, etc.
- **Base URL de API:** No hay `NEXT_PUBLIC_API_URL` ni `env.ts` configurado.
- **Error handling:** No hay interceptors ni manejo de 401/403/500.
- **Loading/Error UI:** Faltan `loading.tsx` y `error.tsx` en todas las rutas.
- **Manejo de forms:** Necesita React Hook Form + Zod (o similar) para validación real.

### Cómo debería conectarse con backend
```
src/
├── lib/
│   ├── api-client.ts     # Cliente HTTP centralizado (fetch wrapper con auth headers)
│   └── env.ts            # Variables de entorno validadas con zod
├── features/
│   └── work-orders/
│       └── services/
│           └── get-work-orders-overview.ts  # ← Aquí va la llamada real
```

Patrón recomendado para las services:
```typescript
// ANTES (mock)
export async function getWorkOrdersOverview() {
  return { items: dashboardWorkOrders, metrics: [...] };
}

// DESPUÉS (backend real)
export async function getWorkOrdersOverview(tenantId: string) {
  const response = await apiClient.get(`/work-orders?tenantId=${tenantId}`);
  return response.data as WorkOrdersOverview;
}
```

### Estructura recomendada de APIs
```
GET    /api/work-orders?status=&priority=&page=&limit=
POST   /api/work-orders
GET    /api/work-orders/:id
PATCH  /api/work-orders/:id/status
POST   /api/work-orders/:id/evidence

GET    /api/assets?site=&status=&page=&limit=
POST   /api/assets
GET    /api/assets/:id
GET    /api/assets/:id/history

GET    /api/providers
POST   /api/providers
GET    /api/providers/:id

POST   /api/uploads/evidence          # Upload de archivos a storage
GET    /api/dashboard                  # Datos del dashboard agregados

POST   /auth/login
POST   /auth/logout
GET    /auth/me
```

---

## 9. DEUDA TÉCNICA

### Bugs concretos en el código

**Bug 1 — Assets page: cálculo incorrecto de órdenes**
```typescript
// src/app/(workspace)/assets/page.tsx
<td className="font-semibold">{asset.openIssues + 8}</td>
// ← Se suma 8 hardcodeado. Debería ser solo asset.openIssues o una métrica real.
```

**Bug 2 — Navegación: "Sucursales" apunta a /settings**
```typescript
// src/lib/navigation.ts
{
  id: "branches",
  title: "Sucursales",
  href: "/settings",  // ← Debería ser /branches (ruta inexistente)
}
```

**Bug 3 — Donut chart valores hardcodeados que no coinciden con datos reales**
```css
/* globals.css */
conic-gradient(
  var(--green) 0 62%,    /* 43 completadas */
  var(--blue) 62% 79%,   /* 8 en curso */
  var(--yellow) 79% 92%, /* 7 pendientes */
  var(--red) 92% 100%    /* 3 urgentes = ~4.8% ≠ 8% */
)
/* Los porcentajes no coinciden con los datos reales del mock */
```

**Bug 4 — Formulario de OT: falta prioridad "Media"**
```typescript
// src/features/work-orders/components/work-order-composer.tsx
{[
  ["low", "Baja", "active-success"],
  // ["medium", "Media", "active-neutral"], ← FALTA
  ["high", "Alta", "active-warning"],
  ["urgent", "Urgente", "active-danger"],
]}
// La entidad WorkOrder tiene priority: "low"|"medium"|"high"|"urgent"
// pero el form no permite seleccionar "medium"
```

**Bug 5 — Filter chips sin handler funcional**
```tsx
// src/app/(workspace)/work-orders/page.tsx
<button className="filter-chip active" type="button">Todas (61)</button>
<button className="filter-chip" type="button">Pendientes (7)</button>
// No hay onClick en ninguno. La clase "active" está hardcodeada en el primero.
```

**Bug 6 — "Cerrar sesión" no hace nada**
```typescript
// src/components/layout/app-sidebar.tsx
<button
  className="sidebar-user-dropdown-item text-danger"
  onClick={() => setMenuOpen(false)}  // ← Solo cierra el menú, no hay logout
  type="button"
>
  Cerrar sesion
</button>
```

### Malas prácticas

1. **CSS híbrido sin estrategia clara**: `globals.css` mezcla CSS custom (`.kpi-card`, `.filter-bar`, `.mantix-card`) con Tailwind utility classes en los JSX. Esto crea dos sistemas de estilos paralelos difíciles de mantener.

2. **Datos mock importados directamente en páginas**: `reports/page.tsx` importa `dashboardWorkOrders` y `trackedAssets` directamente, saltando el service layer.

3. **Datos de sesión accedidos desde mocks en componentes client**: `settings-workspace.tsx` hace `import { currentUser, mantixCompany } from "@/data/mock/platform"` en un componente client, lo que no escala.

4. **Emojis como evidencia fotográfica**: `evidence: ["📷", "🔩", "🔧", "＋"]` — esto es un placeholder que nunca debe llegar a producción como está.

5. **Valores de negocio hardcodeados en templates**: `dueAt: "2026-03-20"` en el `initialDraft` de WorkOrderComposer es una fecha fija del pasado.

6. **El "Exportar" y "Exportar PDF" no tienen handlers**: Botones decorativos sin funcionalidad.

### Quick wins (antes de backend)

| Problema | Fix | Impacto |
|---|---|---|
| `openIssues + 8` en Assets | Eliminar el `+ 8` | Bajo |
| "Sucursales" href incorrecto | Cambiar a `href: "/branches"` o eliminar | Medio |
| Priority "Media" faltante en form | Agregar el botón | Bajo |
| Filter chips sin handler | Implementar estado local de filtro | Alto |
| Donut chart desincronizado | Calcular porcentajes desde datos reales | Medio |

---

## 10. ROADMAP DE MEJORAS

### Quick Wins (1–3 días)

| # | Tarea | Impacto |
|---|---|---|
| 1 | **Corregir bug `openIssues + 8`** en la tabla de Activos | Credibilidad en demos |
| 2 | **Corregir href "Sucursales"** en navegación | UX, evita confusión |
| 3 | **Agregar prioridad "Media"** en formulario de OT | Datos completos |
| 4 | **Hacer filtros funcionales** en /work-orders con estado local | Primera interactividad real |
| 5 | **Agregar `loading.tsx`** en rutas principales (`/`, `/work-orders`, `/assets`) | Preparación para backend |
| 6 | **Agregar `error.tsx`** en rutas con `async` pages | Robustez |
| 7 | **Donut chart dinámico** — calcular porcentajes desde los datos del array | Coherencia visual |

### Mejoras importantes (1–2 semanas)

| # | Tarea | Impacto |
|---|---|---|
| 1 | **Crear `/assets/[id]`** — página de detalle de activo con historial de OTs | Gap crítico de producto |
| 2 | **Implementar auth básico** (NextAuth + credentials) | Gate para go-live |
| 3 | **Agregar validación de formularios** con React Hook Form + Zod | Integridad de datos |
| 4 | **Reemplazar services con llamadas HTTP reales** al primer endpoint disponible | Integración real |
| 5 | **Paginación en tablas** (work-orders, assets) | Escalabilidad |
| 6 | **Upload real de archivos** para evidencia fotográfica (S3/R2) | Feature core |
| 7 | **Cambio de estado de OT** — UI para transicionar status | Flujo core de CMMS |
| 8 | **Middleware de auth en Next.js** — proteger todas las rutas bajo `(workspace)` | Seguridad básica |

### Nivel PRO (1–2 meses)

| # | Tarea | Impacto |
|---|---|---|
| 1 | **Visor de historial de activo real** con timeline completo y filtros por tipo | Diferenciador de producto |
| 2 | **Notificaciones en tiempo real** (WebSockets o SSE) para alertas críticas | Engagement y retención |
| 3 | **Vista de calendario para Preventivo** — month/week view con drag and drop | UX premium |
| 4 | **Chart library real** (Recharts o Tremor) para KPIs dinámicos, MTTR/MTBF, etc. | Analytics real |
| 5 | **Integración IA real** — sugerencias de causa raíz basadas en historial de activo | Diferenciador competitivo |
| 6 | **Mobile PWA** — hacer installable con notificaciones push para técnicos en campo | Adoption en campo |
| 7 | **Multi-tenant real** — workspace por empresa con subdominios o paths | Scale |
| 8 | **Exportación PDF/Excel** de OTs, activos, reportes | Compliance y ventas |
| 9 | **QR por activo** — generar QR, escanear y abrir OT desde mobile | Feature de campo diferencial |
| 10 | **Testing suite** (Vitest + Playwright E2E) | Calidad a largo plazo |

---

## 11. SCORE FINAL

| Dimensión | Score | Justificación |
|---|---|---|
| **Código** | **7.5 / 10** | TypeScript completo, arquitectura bien estructurada, feature-sliced parcialmente implementado, servicio layer listo para backend. Se baja por el CSS híbrido, bugs concretos, y falta de testing. |
| **UX/UI** | **8.5 / 10** | Diseño visual profesional y competitivo. Dark/light mode real. Responsive funcional. Componentes consistentes. Se baja por filtros decorativos, charts desincronizados, y ausencia de estados vacíos/carga/error. |
| **Producto** | **6.5 / 10** | Buenas ideas de producto (OT vinculadas, criticidad de activos, resolución interna/externa). Pero falta el detalle de activo (entidad central), los KPIs son strings, y la IA es solo decorativa. El roadmap es realista pero hay gaps críticos. |
| **Escalabilidad** | **5.5 / 10** | La arquitectura *puede* escalar con trabajo. Pero hoy: sin auth, sin multi-tenant, sin paginación, sin upload real, sin caché. Los fundamentos están, la implementación no. |

### Score global: **7.0 / 10**

**Conclusión:** MANTIX tiene una base técnica y visual sólida que justifica continuar el desarrollo. El código está escrito con criterio, el diseño es diferenciador para el mercado LATAM SMB, y hay decisiones de producto inteligentes. El camino crítico ahora es: (1) integrar auth + backend básico, (2) cerrar el gap del detalle de activo, (3) hacer los filtros y el cambio de estado de OT funcionales. Con esas tres cosas, la demo se convierte en un producto real.

---

*Fin del reporte. Versión auditada: mantix-webapp v0.1.0 · Next.js 16.1.6 · React 19 · TypeScript 5 · Tailwind CSS 4*
