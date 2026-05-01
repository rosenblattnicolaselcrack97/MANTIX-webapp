-- ============================================================
-- Migration 001: Email infrastructure tables
-- Run this in the Supabase SQL Editor
-- ============================================================

-- email_events: log de todos los emails enviados/recibidos
CREATE TABLE IF NOT EXISTS public.email_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  entity_type   TEXT,                          -- 'work_order', 'asset', 'profile', etc.
  entity_id     UUID,
  event_type    TEXT,                          -- 'welcome', 'invite', 'notification', 'reply', etc.
  direction     TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  from_email    TEXT,
  to_email      TEXT NOT NULL,
  subject       TEXT,
  provider      TEXT,                          -- 'resend', 'postmark', 'sendgrid', 'supabase'
  provider_id   TEXT,                          -- ID del mensaje en el proveedor
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened')),
  error_message TEXT,
  metadata      JSONB,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- email_threads: hilo de email por entidad (para reply tracking)
CREATE TABLE IF NOT EXISTS public.email_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  thread_key    TEXT UNIQUE NOT NULL,           -- e.g. 'work_order_<uuid>'
  reply_to_email TEXT,                          -- reply+<thread_key>@reply.mantixarg.com
  subject_prefix TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notification_log: registro de notificaciones enviadas a usuarios
CREATE TABLE IF NOT EXISTS public.notification_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type       TEXT,
  entity_id         UUID,
  notification_type TEXT NOT NULL,              -- 'email', 'push', 'in_app'
  title             TEXT,
  body              TEXT,
  email_event_id    UUID REFERENCES public.email_events(id) ON DELETE SET NULL,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_email_events_company    ON public.email_events(company_id);
CREATE INDEX IF NOT EXISTS idx_email_events_entity     ON public.email_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_key       ON public.email_threads(thread_key);
CREATE INDEX IF NOT EXISTS idx_notification_log_user   ON public.notification_log(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.email_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log  ENABLE ROW LEVEL SECURITY;

-- Solo service_role / superadmin puede leer email_events y email_threads
CREATE POLICY "service_role only - email_events" ON public.email_events
  FOR ALL USING (FALSE);

CREATE POLICY "service_role only - email_threads" ON public.email_threads
  FOR ALL USING (FALSE);

-- Usuario puede leer sus propias notificaciones
CREATE POLICY "user reads own notifications" ON public.notification_log
  FOR SELECT USING (auth.uid() = user_id);
