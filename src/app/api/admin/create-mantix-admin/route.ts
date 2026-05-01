import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";

// POST /api/admin/create-mantix-admin
// Crea un nuevo Admin de Mantix: invita al usuario via Supabase Auth
// y crea su perfil en la tabla profiles.
// Requiere: SUPABASE_SERVICE_ROLE_KEY en variables de entorno.

export async function POST(req: NextRequest) {
  if (!hasServiceRole) {
    return NextResponse.json(
      {
        error:
          "Función no configurada. Agregar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel.",
      },
      { status: 501 }
    );
  }

  let email: string;
  let fullName: string;

  try {
    const body = await req.json();
    email = body.email?.trim().toLowerCase();
    fullName = body.fullName?.trim();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  if (!email || !fullName) {
    return NextResponse.json({ error: "Email y nombre son requeridos" }, { status: 400 });
  }

  // Validación básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Formato de email inválido" }, { status: 400 });
  }

  // Obtener el ID de la empresa Mantix
  const { data: mantixCompany, error: companyErr } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("name", "Mantix")
    .eq("industry", "SaaS CMMS")
    .maybeSingle();

  if (companyErr || !mantixCompany) {
    return NextResponse.json(
      { error: "No se encontró la empresa Mantix. Ejecutar la migración SQL primero." },
      { status: 500 }
    );
  }

  // Invitar usuario via Supabase Auth (envía email con link de configuración)
  const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: fullName },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin`,
    }
  );

  if (inviteErr) {
    return NextResponse.json(
      { error: inviteErr.message ?? "Error al invitar usuario" },
      { status: 400 }
    );
  }

  const userId = inviteData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No se pudo obtener el ID del usuario creado" }, { status: 500 });
  }

  // Crear perfil en la tabla profiles
  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName,
    company_id: mantixCompany.id,
    role: "admin",
    is_mantix_admin: true,
    is_super_admin: false,
    is_active: true,
  });

  if (profileErr) {
    return NextResponse.json(
      { error: `Usuario creado pero error al crear perfil: ${profileErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, userId });
}
