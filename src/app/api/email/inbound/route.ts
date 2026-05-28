/**
 * POST /api/email/inbound
 *
 * Webhook para procesamiento de emails entrantes (respuestas a OTs, activos, etc.)
 * Compatible con: Resend, Mailgun, Postmark (Inbound Processing).
 *
 * FLUJO:
 * 1. Proveedor hace POST a este endpoint cuando llega un email al dominio inbound
 * 2. Validar firma HMAC del proveedor (MANTIX_WEBHOOK_SECRET)
 * 3. Parsear destinatario para identificar entidad relacionada
 * 4. Guardar email en email_events (direction='inbound')
 * 5. Crear entrada en notification_log
 * 6. Actualizar work_order / asset si corresponde
 * 7. Responder 200 OK
 *
 * CONFIGURACIÓN:
 * - Configurar en el proveedor: POST https://mantixarg.com/api/email/inbound
 * - Agregar MANTIX_WEBHOOK_SECRET en variables de entorno
 * - Configurar dominio inbound (ej: reply.mantixarg.com) en el proveedor
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Formato esperado del destinatario: reply+{entityType}_{entityId}@reply.mantixarg.com
// Ejemplo: reply+work_order_abc123@reply.mantixarg.com
const REPLY_TO_REGEX = /^reply\+([a-z_]+)_([a-z0-9-]+)@/i;

interface InboundEmailPayload {
  from?: string;
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  messageId?: string;
  inReplyTo?: string;
  headers?: Record<string, string>;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  // ── 1. Validar firma del webhook ──────────────────────────────────────────
  const webhookSecret = process.env.MANTIX_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = req.headers.get("x-webhook-signature") ??
                      req.headers.get("x-resend-signature") ??
                      req.headers.get("x-mailgun-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 }
      );
    }

    const genericSignature = req.headers.get("x-webhook-signature");
    if (genericSignature && !isSignatureValid(genericSignature, rawBody, webhookSecret)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }
  }

  // ── 2. Parsear payload ────────────────────────────────────────────────────
  let body: InboundEmailPayload;
  try {
    body = JSON.parse(rawBody) as InboundEmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const toAddresses = Array.isArray(body.to) ? body.to : [body.to ?? ""];
  const fromEmail = body.from ?? "unknown";
  const subject = body.subject ?? "(sin asunto)";

  // ── 3. Identificar entidad relacionada ────────────────────────────────────
  let entityType: string | null = null;
  let entityId: string | null = null;

  for (const toAddr of toAddresses) {
    const match = toAddr.match(REPLY_TO_REGEX);
    if (match) {
      entityType = match[1]; // ej: "work_order"
      entityId = match[2];   // ej: "abc123"
      break;
    }
  }

  // ── 4. Guardar en email_events ────────────────────────────────────────────
  const { data: emailEvent, error: eventError } = await supabaseAdmin
    .from("email_events")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      event_type: "inbound",
      direction: "inbound",
      from_email: fromEmail,
      to_email: toAddresses.join(", "),
      subject,
      provider: detectProvider(req),
      status: "delivered",
      sent_at: new Date().toISOString(),
      metadata: {
        messageId: body.messageId,
        inReplyTo: body.inReplyTo,
        textPreview: body.text?.slice(0, 500),
      },
    })
    .select("id")
    .single();

  if (eventError) {
    console.error("[email/inbound] Error saving email_event:", eventError);
    // Aún respondemos 200 para que el proveedor no reintente indefinidamente
    return NextResponse.json({ ok: false, warning: "Event log failed" });
  }

  // ── 5. Crear notification_log ─────────────────────────────────────────────
  if (entityType && entityId) {
    await supabaseAdmin.from("notification_log").insert({
      entity_type: entityType,
      entity_id: entityId,
      notification_type: "email",
      title: `Respuesta email: ${subject}`,
      body: body.text?.slice(0, 300) ?? null,
      email_event_id: emailEvent?.id ?? null,
    });
  }

  // ── 6. Actualizar entidad relacionada ─────────────────────────────────────
  if (entityType === "work_order" && entityId) {
    await appendEmailNoteToEntity("work_orders", entityId, fromEmail, subject, body.text);
  }

  if (entityType === "asset" && entityId) {
    await appendEmailNoteToEntity("assets", entityId, fromEmail, subject, body.text);
  }

  // ── 7. Responder OK ───────────────────────────────────────────────────────
  return NextResponse.json({
    ok: true,
    processed: {
      entityType,
      entityId,
      eventId: emailEvent?.id,
    },
  });
}

// Detectar proveedor por headers de la request
function detectProvider(req: NextRequest): string {
  if (req.headers.get("x-resend-signature")) return "resend";
  if (req.headers.get("x-mailgun-signature")) return "mailgun";
  if (req.headers.get("x-postmark-signature")) return "postmark";
  return "unknown";
}

function isSignatureValid(signatureHeader: string, body: string, secret: string): boolean {
  const normalizedSignature = signatureHeader.replace(/^sha256=/i, "").trim();
  const digest = createHmac("sha256", secret).update(body).digest("hex");

  const received = Buffer.from(normalizedSignature, "utf8");
  const expected = Buffer.from(digest, "utf8");

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

async function appendEmailNoteToEntity(
  table: "work_orders" | "assets",
  entityId: string,
  fromEmail: string,
  subject: string,
  text?: string,
): Promise<void> {
  const preview = (text ?? "(sin cuerpo)").trim().slice(0, 800);
  const entry = [
    "",
    `--- Email inbound ${new Date().toISOString()} ---`,
    `From: ${fromEmail}`,
    `Subject: ${subject}`,
    preview,
  ].join("\n");

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("notes")
    .eq("id", entityId)
    .maybeSingle();

  if (error || !data) {
    console.error(`[email/inbound] Could not load ${table} ${entityId}:`, error);
    return;
  }

  const currentNotes = typeof data.notes === "string" ? data.notes : "";
  const nextNotes = `${currentNotes}${entry}`.slice(0, 15000);

  const { error: updateError } = await supabaseAdmin
    .from(table)
    .update({ notes: nextNotes })
    .eq("id", entityId);

  if (updateError) {
    console.error(`[email/inbound] Could not update notes for ${table} ${entityId}:`, updateError);
  }
}
