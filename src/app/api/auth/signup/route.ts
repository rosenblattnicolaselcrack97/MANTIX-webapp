// @ts-nocheck
/**
 * POST /api/auth/signup
 *
 * Flujo:
 * 1. Validar datos
 * 2. Buscar si el email ya existe en auth.users (zombie check)
 *    a. Si existe CON perfil y activo → error USER_EXISTS
 *    b. Si existe CON perfil inactivo → error USER_DISABLED
 *    c. Si existe SIN perfil (zombie) → REPARAR: actualizar contraseña + crear empresa + perfil
 * 3. Si no existe → crear usuario + empresa + perfil normalmente
 * 4. Enviar welcome email (no bloquea el registro si falla)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email-service";
import { buildSignupVerificationEmail } from "@/lib/email-templates";

// ── Busca un usuario en auth.users por email (recorre todas las páginas) ──────
async function findAuthUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error || !data?.users?.length) break;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );
    if (found) return found;
    if (data.users.length < 1000) break; // última página
    page++;
  }
  return null;
}

export async function POST(req: NextRequest) {
  console.log("[signup] Iniciando registro...");

  if (!hasServiceRole) {
    console.error("[signup] FALTA SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      { error: "Servicio temporalmente no disponible. Contactá a soporte." },
      { status: 503 }
    );
  }

  // ── Parsear body ─────────────────────────────────────────────────────────
  let email: string;
  let password: string;
  let fullName: string;
  let companyMode: "create" | "join";
  let companyName: string | undefined;
  let companyId: string | undefined;

  try {
    const body = await req.json();
    email       = (body.email ?? "").trim().toLowerCase();
    password    = body.password ?? "";
    fullName    = (body.fullName ?? "").trim();
    companyMode = body.companyMode;
    companyName = (body.companyName ?? "").trim() || undefined;
    companyId   = body.companyId;
  } catch {
    return NextResponse.json({ error: "Datos de solicitud inválidos." }, { status: 400 });
  }

  // ── Validaciones ─────────────────────────────────────────────────────────
  if (!email || !password || !fullName) {
    return NextResponse.json({ error: "Email, contraseña y nombre son requeridos." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "El formato del email no es válido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }
  if (companyMode === "create" && !companyName) {
    return NextResponse.json({ error: "El nombre de la empresa es requerido." }, { status: 400 });
  }
  if (companyMode === "join" && !companyId) {
    return NextResponse.json({ error: "Debés seleccionar una empresa." }, { status: 400 });
  }

  // ── Verificar si ya existe en auth.users ─────────────────────────────────
  console.log("[signup] Buscando usuario existente para:", email);
  const existingAuthUser = await findAuthUserByEmail(email);

  if (existingAuthUser) {
    console.log("[signup] Usuario auth encontrado:", existingAuthUser.id);

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, is_active")
      .eq("id", existingAuthUser.id)
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.is_active === false) {
        return NextResponse.json({
          error: "Esta cuenta está desactivada. Contactá al administrador de tu empresa.",
          code: "USER_DISABLED",
        }, { status: 409 });
      }

      return NextResponse.json({
        error: "Este email ya está registrado. Iniciá sesión directamente.",
        code: "USER_EXISTS",
      }, { status: 409 });
    }

    console.log("[signup] Zombie detectado, eliminando cuenta huérfana para:", email);
    const { error: deleteZombieError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
    if (deleteZombieError) {
      console.error("[signup] Error eliminando zombie:", deleteZombieError);
      return NextResponse.json({
        error: "Error al limpiar una cuenta huérfana. Contactá a soporte.",
      }, { status: 500 });
    }
  }

  // ── Generar signup link real con confirmación de email ───────────────────
  console.log("[signup] Generando link de verificación para:", email);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "https://mantixarg.com";
  const verifyRedirectTo = `${siteUrl}/auth/usercheck`;

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: { full_name: fullName },
      redirectTo: verifyRedirectTo,
    },
  });

  if (linkError || !linkData?.user || !linkData?.properties?.action_link) {
    const message = linkError?.message ?? "No se pudo crear el enlace de verificación.";
    console.error("[signup] Error generando link signup:", linkError);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const userId = linkData.user.id;
  const verifyUrl = linkData.properties.action_link;
  console.log("[signup] Usuario y link generados:", userId);

  return await createCompanyAndProfile({
    userId,
    email,
    fullName,
    password,
    companyMode,
    companyName,
    companyId,
    isNewAuthUser: true, // Para hacer rollback si el perfil falla
    verifyUrl,
  });
}

// ── Helper: crea empresa (si aplica) + perfil ─────────────────────────────────
async function createCompanyAndProfile({
  userId,
  email,
  fullName,
  password,
  companyMode,
  companyName,
  companyId,
  isNewAuthUser = false,
  verifyUrl,
}: {
  userId: string;
  email: string;
  fullName: string;
  password: string;
  companyMode: "create" | "join";
  companyName?: string;
  companyId?: string;
  isNewAuthUser?: boolean;
  verifyUrl?: string;
}) {
  let resolvedCompanyId: string | null = null;
  let resolvedCompanyName: string | null = null;
  const role = companyMode === "create" ? "admin" : "technician";

  if (companyMode === "create") {
    console.log("[signup] Creando empresa:", companyName);
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({ name: companyName!, plan: "trial", is_active: true })
      .select("id, name")
      .single();

    if (companyError || !newCompany) {
      console.error("[signup] Error creando empresa:", companyError);
      if (isNewAuthUser) await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({
        error: `No se pudo crear la empresa: ${companyError?.message ?? "error desconocido"}`,
      }, { status: 500 });
    }

    resolvedCompanyId = newCompany.id;
    resolvedCompanyName = newCompany.name;
    console.log("[signup] Empresa creada:", resolvedCompanyId);
  } else {
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("id", companyId!)
      .eq("is_active", true)
      .maybeSingle();

    if (!company) {
      if (isNewAuthUser) await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({
        error: "La empresa seleccionada no existe o no está activa.",
      }, { status: 400 });
    }

    resolvedCompanyId = company.id;
    resolvedCompanyName = company.name;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "https://mantixarg.com";
  const verifyUrl = `${siteUrl}/auth/usercheck`;

  // ── Crear/reparar perfil ──────────────────────────────────────────────────
  console.log("[signup] Creando perfil para userId:", userId);
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        company_id: resolvedCompanyId,
        role,
        is_active: true,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    console.error("[signup] Error creando perfil:", profileError);
    // Rollback solo si creamos el usuario en este request
    if (isNewAuthUser) await supabaseAdmin.auth.admin.deleteUser(userId);
    if (companyMode === "create" && resolvedCompanyId) {
      await supabaseAdmin.from("companies").delete().eq("id", resolvedCompanyId);
    }
    return NextResponse.json({
      error: `Error al crear el perfil: ${profileError.message}`,
    }, { status: 500 });
  }

  console.log("[signup] Perfil creado OK para:", email);

  const fallbackVerifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "https://mantixarg.com"}/auth/usercheck`;
  const verificationEmail = buildSignupVerificationEmail({
    fullName,
    verifyUrl: verifyUrl ?? fallbackVerifyUrl,
  });

  void sendEmail({
    to: email,
    subject: verificationEmail.subject,
    html: verificationEmail.html,
    text: verificationEmail.text,
    meta: {
      entityType: "user",
      entityId: userId,
      companyId: resolvedCompanyId ?? undefined,
      eventType: "signup_verification",
    },
  });

  return NextResponse.json({
    ok: true,
    userId,
    companyId: resolvedCompanyId,
    companyName: resolvedCompanyName,
    role,
    message: "Cuenta creada correctamente. Ya podés iniciar sesión.",
  });
}
