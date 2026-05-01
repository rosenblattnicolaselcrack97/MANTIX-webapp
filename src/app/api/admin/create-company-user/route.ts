// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor." },
      { status: 501 }
    );
  }

  const { email, full_name, role, phone, company_id } = await req.json();

  if (!email || !full_name || !company_id) {
    return NextResponse.json({ error: "email, full_name y company_id son requeridos." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // Invite user via Supabase Auth (sends email with link to set password).
  // redirectTo apunta a /auth/confirm para que el token PKCE sea procesado
  // correctamente antes de redirigir al usuario al destino final.
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm`,
    data: { full_name },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No se pudo obtener el ID del usuario creado." }, { status: 500 });
  }

  // Upsert profile (the invite trigger may already create one)
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: userId,
      email,
      full_name,
      role: role ?? "technician",
      phone: phone ?? null,
      company_id,
      is_active: true,
    });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: userId });
}
