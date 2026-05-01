/**
 * Email Service — Mantix
 *
 * Abstracción provider-agnostic para envío de emails transaccionales.
 * El proveedor se selecciona automáticamente según las variables de entorno.
 *
 * Proveedores soportados (en orden de prioridad):
 *   1. Resend (RESEND_API_KEY)
 *   2. Postmark (POSTMARK_SERVER_TOKEN)
 *   3. SendGrid (SENDGRID_API_KEY)
 *   4. Fallback: solo registra en Supabase (sin envío real)
 *
 * IMPORTANTE: Este archivo solo debe importarse en código SERVER-SIDE
 * (API routes, Server Actions). Nunca importar en componentes cliente.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
  fromName?: string;
  // Metadatos para trazabilidad en Supabase
  meta?: {
    entityType?: "work_order" | "asset" | "user" | "company";
    entityId?: string;
    companyId?: string;
    eventType?: string;
  };
}

export interface EmailResult {
  ok: boolean;
  provider: string;
  providerId?: string;
  error?: string;
}

// ─── Configuración ────────────────────────────────────────────────────────────

const FROM_EMAIL = process.env.MANTIX_FROM_EMAIL ?? "avisos@mantixarg.com";
const FROM_NAME = process.env.MANTIX_FROM_NAME ?? "Mantix";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const SENDGRID_KEY = process.env.SENDGRID_API_KEY;

// ─── Proveedores ─────────────────────────────────────────────────────────────

async function sendWithResend(payload: EmailPayload): Promise<EmailResult> {
  const body = {
    from: `${payload.fromName ?? FROM_NAME} <${payload.from ?? FROM_EMAIL}>`,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    reply_to: payload.replyTo,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as { id?: string; error?: { message?: string } };

  if (!res.ok) {
    return { ok: false, provider: "resend", error: data.error?.message ?? "Resend error" };
  }

  return { ok: true, provider: "resend", providerId: data.id };
}

async function sendWithPostmark(payload: EmailPayload): Promise<EmailResult> {
  const body = {
    From: `${payload.fromName ?? FROM_NAME} <${payload.from ?? FROM_EMAIL}>`,
    To: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
    Subject: payload.subject,
    HtmlBody: payload.html,
    TextBody: payload.text,
    ReplyTo: payload.replyTo,
  };

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": POSTMARK_TOKEN ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as { MessageID?: string; Message?: string };

  if (!res.ok) {
    return { ok: false, provider: "postmark", error: data.Message ?? "Postmark error" };
  }

  return { ok: true, provider: "postmark", providerId: data.MessageID };
}

async function sendWithSendGrid(payload: EmailPayload): Promise<EmailResult> {
  const body = {
    personalizations: [
      {
        to: (Array.isArray(payload.to) ? payload.to : [payload.to]).map((e) => ({ email: e })),
      },
    ],
    from: { email: payload.from ?? FROM_EMAIL, name: payload.fromName ?? FROM_NAME },
    reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
    subject: payload.subject,
    content: [
      { type: "text/html", value: payload.html },
      ...(payload.text ? [{ type: "text/plain", value: payload.text }] : []),
    ],
  };

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, provider: "sendgrid", error: text };
  }

  const messageId = res.headers.get("X-Message-Id") ?? undefined;
  return { ok: true, provider: "sendgrid", providerId: messageId };
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  let result: EmailResult;

  // Seleccionar proveedor según variables de entorno
  if (RESEND_API_KEY) {
    result = await sendWithResend(payload);
  } else if (POSTMARK_TOKEN) {
    result = await sendWithPostmark(payload);
  } else if (SENDGRID_KEY) {
    result = await sendWithSendGrid(payload);
  } else {
    // Sin proveedor configurado — solo registrar en log
    console.warn("[email-service] No hay proveedor de email configurado. El email no fue enviado.");
    result = { ok: false, provider: "none", error: "Sin proveedor configurado" };
  }

  // Registrar en email_events de Supabase (siempre, para trazabilidad)
  const toEmails = Array.isArray(payload.to) ? payload.to.join(",") : payload.to;
  await logEmailEvent(payload, result, toEmails);

  return result;
}

// ─── Registro en Supabase ─────────────────────────────────────────────────────

async function logEmailEvent(
  payload: EmailPayload,
  result: EmailResult,
  toEmails: string
): Promise<void> {
  try {
    await supabaseAdmin.from("email_events").insert({
      company_id: payload.meta?.companyId ?? null,
      entity_type: payload.meta?.entityType ?? null,
      entity_id: payload.meta?.entityId ?? null,
      event_type: payload.meta?.eventType ?? "unknown",
      direction: "outbound",
      from_email: payload.from ?? FROM_EMAIL,
      to_email: toEmails,
      subject: payload.subject,
      provider: result.provider,
      provider_id: result.providerId ?? null,
      status: result.ok ? "sent" : "failed",
      error_message: result.error ?? null,
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  } catch (err) {
    // No fallar el flujo principal si el log falla
    console.error("[email-service] Error al registrar email_event:", err);
  }
}
