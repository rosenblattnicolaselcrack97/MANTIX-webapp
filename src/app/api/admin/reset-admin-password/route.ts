import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";

// POST /api/admin/reset-admin-password
// Envía un email de reset de contraseña al admin.
// Usa Supabase Auth resetPasswordForEmail.

export async function POST(req: NextRequest) {
  let email: string;

  try {
    const body = await req.json();
    email = body.email?.trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Formato de email inválido" }, { status: 400 });
  }

  if (hasServiceRole) {
    // Con service_role usamos admin API para generar link de reset
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/login`,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    // Sin service_role, usamos el cliente con anon key — funciona igual para reset
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
    const client = createClient(url, key);
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/login`,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
