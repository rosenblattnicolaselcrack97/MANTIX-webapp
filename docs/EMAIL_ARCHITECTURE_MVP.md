# Arquitectura de Emails MVP — Mantix

> Versión: 1.0  
> Fecha: 2026-04-30

---

## Resumen Ejecutivo

Mantix reemplaza la mensajería interna (chat/inbox) por un sistema de **emails profesionales transaccionales** con:
1. Envío de emails en eventos del sistema (registro, OTs, activos).
2. Historial trazable en Supabase.
3. Arquitectura preparada para **inbound email** (respuestas que actualizan registros).

---

## 1. Cómo Se Enviarán Emails

### Proveedores soportados (sin lock-in)

La abstracción en `src/lib/email-service.ts` es agnóstica al proveedor. Se puede conectar cualquiera configurando variables de entorno:

| Proveedor | Variable | Recomendado para |
|-----------|---------|-----------------|
| **Resend** | `RESEND_API_KEY` | MVP — API simple, soporte Next.js oficial |
| **Postmark** | `POSTMARK_SERVER_TOKEN` | Producción — alta deliverability |
| **SendGrid** | `SENDGRID_API_KEY` | Volumen alto |
| **Mailgun** | `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` | Inbound email nativo |
| **Amazon SES** | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Escala masiva |

**Recomendación para MVP**: **Resend** — tiene SDK oficial para Next.js, free tier 3.000 emails/mes, inbound con webhooks.

### Email de envío
```
MANTIX_FROM_EMAIL=avisos@mantixarg.com
MANTIX_FROM_NAME=Mantix
MANTIX_REPLY_TO=soporte@mantixarg.com
```

### Cómo activar en producción
1. Crear cuenta en Resend (resend.com).
2. Verificar dominio `mantixarg.com` con DNS records que Resend provee.
3. Agregar `RESEND_API_KEY` en variables de entorno de Vercel.
4. El servicio detecta automáticamente el proveedor.

---

## 2. Variables de Entorno Necesarias

```env
# Email — proveedor
RESEND_API_KEY=re_xxxx                    # Para Resend (recomendado MVP)
# O alternativos:
# POSTMARK_SERVER_TOKEN=xxxx
# SENDGRID_API_KEY=SG.xxxx

# Email — configuración de envío
MANTIX_FROM_EMAIL=avisos@mantixarg.com
MANTIX_FROM_NAME=Mantix
MANTIX_REPLY_TO=soporte@mantixarg.com

# Email — inbound (futuro)
MANTIX_INBOUND_DOMAIN=reply.mantixarg.com
MANTIX_WEBHOOK_SECRET=xxxx               # Para validar firma del proveedor

# App
NEXT_PUBLIC_SITE_URL=https://mantixarg.com
```

---

## 3. Tablas de Supabase Necesarias

### `email_events`
Registro de cada email enviado o recibido.

```sql
CREATE TABLE IF NOT EXISTS email_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL,          -- 'work_order' | 'asset' | 'user' | 'company'
  entity_id       UUID,                   -- ID del registro relacionado
  event_type      TEXT NOT NULL,          -- 'welcome' | 'wo_created' | 'wo_updated' | 'invite' | 'inbound'
  direction       TEXT NOT NULL DEFAULT 'outbound', -- 'outbound' | 'inbound'
  from_email      TEXT,
  to_email        TEXT NOT NULL,
  subject         TEXT,
  provider        TEXT,                   -- 'resend' | 'postmark' | etc.
  provider_id     TEXT,                   -- ID del mensaje en el proveedor
  status          TEXT DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  error_message   TEXT,
  metadata        JSONB,                  -- datos extra del proveedor
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `email_threads`
Asocia un hilo de email a una entidad (OT, activo, usuario).

```sql
CREATE TABLE IF NOT EXISTS email_threads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL,          -- 'work_order' | 'asset'
  entity_id       UUID NOT NULL,
  thread_key      TEXT UNIQUE NOT NULL,   -- ej: 'ot-abc123', 'asset-xyz789'
  reply_to_email  TEXT,                   -- ej: reply+ot-abc123@reply.mantixarg.com
  subject_prefix  TEXT,                   -- ej: '[Mantix] Orden #OT-000042'
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `notification_log`
Log auditable de todas las notificaciones.

```sql
CREATE TABLE IF NOT EXISTS notification_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type     TEXT,
  entity_id       UUID,
  notification_type TEXT NOT NULL,        -- 'email' | 'push' | 'webhook'
  title           TEXT,
  body            TEXT,
  email_event_id  UUID REFERENCES email_events(id) ON DELETE SET NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Convención de Reply-To para Inbound Email

Para que una respuesta de email actualice automáticamente el registro correcto:

```
reply+work_order_<WO_ID>@reply.mantixarg.com
reply+asset_<ASSET_ID>@reply.mantixarg.com
```

Ejemplo real:
```
Reply-To: reply+work_order_a3f2-bc01@reply.mantixarg.com
Subject: [Mantix] Orden #OT-000042 - Cambio de correa
```

Al llegar una respuesta:
1. El proveedor hace POST al webhook `/api/email/inbound`.
2. El endpoint parsea el `to:` o `reply-to:` para extraer `entity_type` y `entity_id`.
3. Guarda el email en `email_events` (direction=inbound).
4. Actualiza la OT/activo según el contenido.

---

## 5. Cómo Funciona Inbound Email

### Endpoint preparado: `POST /api/email/inbound`

```
Proveedor (Resend/Mailgun) → POST /api/email/inbound
         ↓
  Validar firma HMAC (MANTIX_WEBHOOK_SECRET)
         ↓
  Parsear `to:` / `reply-to:` → extraer entity_type + entity_id
         ↓
  Guardar en email_events (direction='inbound')
         ↓
  Crear entrada en notification_log
         ↓
  Actualizar work_order / asset si aplica
         ↓
  Responder 200 OK al proveedor
```

### Estructura del payload entrante (ejemplo Resend)
```json
{
  "from": "cliente@empresa.com",
  "to": ["reply+work_order_abc123@reply.mantixarg.com"],
  "subject": "Re: [Mantix] Orden #OT-000042",
  "text": "Texto plano del mensaje",
  "html": "<p>HTML del mensaje</p>",
  "messageId": "<abc@mail.gmail.com>",
  "inReplyTo": "<xyz@mantixarg.com>",
  "headers": {}
}
```

---

## 6. Relación Email ↔ Supabase

```
work_orders ←── email_threads ←── email_events
assets      ←── email_threads ←── email_events
profiles    ←──────────────────── email_events (to_email)
                                   notification_log
```

---

## 7. Eventos de Email Implementados (MVP)

| Evento | Cuándo se dispara | Template |
|--------|------------------|---------|
| `welcome` | Usuario crea cuenta | `welcome-new-account` |
| `invite` | Admin invita usuario | `user-invitation` |
| `wo_created` | Se crea una OT | `work-order-created` (TODO) |
| `wo_updated` | Se actualiza estado de OT | `work-order-updated` (TODO) |
| `asset_alert` | Activo requiere atención | `asset-alert` (TODO) |

---

## 8. Qué Queda Listo Ahora vs TODO

### ✅ Listo
- `src/lib/email-service.ts` — abstracción provider-agnostic con fallback a log en Supabase.
- `src/lib/email-templates.ts` — templates HTML profesionales para: welcome, invite.
- `src/app/api/email/inbound/route.ts` — stub del endpoint inbound con validación de firma.
- Tablas SQL en `supabase/migrations/001_email_tables.sql`.
- Documentación completa.

### 📋 TODO Técnico

| Tarea | Complejidad | Prioridad |
|-------|------------|---------|
| Conectar proveedor real (Resend) | Baja | Alta |
| Configurar DNS para `reply.mantixarg.com` | Media | Media |
| Activar webhook inbound en proveedor | Baja | Media |
| Templates para OT (creada/actualizada) | Media | Alta |
| Template para alerta de activo | Media | Media |
| Lógica de actualización de OT por respuesta email | Alta | Media |
| Tests del endpoint inbound | Media | Media |
| Dashboard de emails enviados en superadmin | Media | Baja |

---

## 9. Ejemplo de Email Generado

**Subject**: `Bienvenido a Mantix — tu cuenta fue creada`

**Reply-To** (cuando aplica OT): `reply+work_order_a3f2bc01@reply.mantixarg.com`

El template está en `src/lib/email-templates.ts` con versión HTML responsive y fallback texto plano.
