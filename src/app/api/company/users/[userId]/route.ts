import { NextRequest, NextResponse } from "next/server";

import { getRequesterContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const COMPANY_ROLES = new Set([
  "admin",
  "manager",
  "technician",
  "viewer",
  "admin_empresa",
  "supervisor",
  "tecnico",
  "financiero",
  "solo_lectura",
]);

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { context, error, status } = await getRequesterContext(req);
  if (!context) return NextResponse.json({ error }, { status: status ?? 401 });

  const companyId = context.profile?.company_id;
  if (!companyId) {
    return NextResponse.json({ error: "Tu cuenta no tiene empresa asignada." }, { status: 403 });
  }

  if (!context.isCompanyAdmin) {
    return NextResponse.json({ error: "No tenes permisos para editar usuarios." }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const updates: Record<string, unknown> = {};
  if (typeof body.full_name === "string") updates.full_name = body.full_name.trim();
  if (typeof body.role === "string") {
    const nextRole = body.role.trim();
    if (!COMPANY_ROLES.has(nextRole)) {
      return NextResponse.json({ error: "Rol de empresa invalido." }, { status: 400 });
    }
    updates.role = nextRole;
  }
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay cambios para aplicar." }, { status: 400 });
  }

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from("profiles")
    .select("id, company_id")
    .eq("id", userId)
    .maybeSingle();

  if (targetError || !targetProfile) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (targetProfile.company_id !== companyId) {
    return NextResponse.json({ error: "No podes editar usuarios de otra empresa." }, { status: 403 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
