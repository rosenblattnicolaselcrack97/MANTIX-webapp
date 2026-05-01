import { NextRequest, NextResponse } from "next/server";

import { getRequesterContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { context, error, status } = await getRequesterContext(req);
  if (!context) return NextResponse.json({ error }, { status: status ?? 401 });

  const companyId = context.profile?.company_id;
  if (!companyId) {
    return NextResponse.json({ error: "Tu cuenta no tiene empresa asignada." }, { status: 403 });
  }

  if (!context.isCompanyAdmin) {
    return NextResponse.json({ error: "No tenes permisos para reenviar invitaciones." }, { status: 403 });
  }

  const { userId } = await params;

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, company_id")
    .eq("id", userId)
    .maybeSingle();

  if (targetError || !targetProfile) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (targetProfile.company_id !== companyId) {
    return NextResponse.json({ error: "No podes reenviar invitaciones de otra empresa." }, { status: 403 });
  }

  if (!targetProfile.email) {
    return NextResponse.json({ error: "El usuario no tiene email valido." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const redirectTo = siteUrl ? `${siteUrl}/auth/confirm` : undefined;

  const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(targetProfile.email, {
    redirectTo,
  });

  if (inviteResult.error) {
    const resetResult = await supabaseAdmin.auth.resetPasswordForEmail(targetProfile.email, {
      redirectTo: siteUrl ? `${siteUrl}/auth/update-password` : undefined,
    });

    if (resetResult.error) {
      return NextResponse.json({ error: resetResult.error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
