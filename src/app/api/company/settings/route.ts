import { NextRequest, NextResponse } from "next/server";

import { getRequesterContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { context, error, status } = await getRequesterContext(req);
  if (!context) return NextResponse.json({ error }, { status: status ?? 401 });

  if (!context.isCompanyAdmin) {
    return NextResponse.json({ error: "No tenes permisos para ver configuracion de empresa." }, { status: 403 });
  }

  const companyId = context.profile?.company_id;
  if (!companyId) {
    return NextResponse.json({ error: "No hay empresa asociada a tu cuenta." }, { status: 403 });
  }

  const { data, error: companyError } = await supabaseAdmin
    .from("companies")
    .select(
      "id, name, logo_url, description, theme_mode, primary_color, secondary_color, font_family, font_size, email_cc_admin, email_template_header, email_template_footer"
    )
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, company: data });
}

export async function PATCH(req: NextRequest) {
  const { context, error, status } = await getRequesterContext(req);
  if (!context) return NextResponse.json({ error }, { status: status ?? 401 });

  if (!context.isCompanyAdmin) {
    return NextResponse.json({ error: "No tenes permisos para actualizar configuracion de empresa." }, { status: 403 });
  }

  const companyId = context.profile?.company_id;
  if (!companyId) {
    return NextResponse.json({ error: "No hay empresa asociada a tu cuenta." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const allowedFields = [
    "name",
    "description",
    "logo_url",
    "theme_mode",
    "primary_color",
    "secondary_color",
    "font_family",
    "font_size",
    "email_cc_admin",
    "email_template_header",
    "email_template_footer",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key as keyof typeof body];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("companies")
    .update(updates)
    .eq("id", companyId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
