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

export async function GET(req: NextRequest) {
  const { context, error, status } = await getRequesterContext(req);
  if (!context) return NextResponse.json({ error }, { status: status ?? 401 });

  const companyId = context.profile?.company_id;
  if (!companyId) {
    return NextResponse.json({ error: "Tu cuenta no tiene empresa asignada." }, { status: 403 });
  }

  if (!context.isCompanyAdmin) {
    return NextResponse.json({ error: "No tenes permisos para ver usuarios de empresa." }, { status: 403 });
  }

  const { data, error: listError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, users: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { context, error, status } = await getRequesterContext(req);
  if (!context) return NextResponse.json({ error }, { status: status ?? 401 });

  const companyId = context.profile?.company_id;
  if (!companyId) {
    return NextResponse.json({ error: "Tu cuenta no tiene empresa asignada." }, { status: 403 });
  }

  if (!context.isCompanyAdmin) {
    return NextResponse.json({ error: "No tenes permisos para invitar usuarios." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const email = String(body.email ?? "").trim().toLowerCase();
  const fullName = String(body.full_name ?? "").trim();
  const role = String(body.role ?? "technician").trim();

  if (!email || !fullName) {
    return NextResponse.json({ error: "Email y nombre son obligatorios." }, { status: 400 });
  }

  if (!COMPANY_ROLES.has(role)) {
    return NextResponse.json({ error: "Rol de empresa invalido." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const redirectTo = siteUrl ? `${siteUrl}/auth/confirm` : undefined;

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const userId = inviteData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No se pudo obtener el usuario invitado." }, { status: 500 });
  }

  const { error: upsertError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName,
    role,
    company_id: companyId,
    is_active: true,
  });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: userId });
}
