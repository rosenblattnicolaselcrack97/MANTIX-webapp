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
import { buildWelcomeEmail } from "@/lib/email-templates";

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

    // Verificar si tiene perfil en profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, is_active")
      .eq("id", existingAuthUser.id)
      .maybeSingle();

    if (existingProfile) {
      // Tiene perfil → cuenta real, no zombie
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

    // ── REPARAR ZOMBIE: existe en auth.users pero sin perfil ────────────────
    console.log("[signup] Zombie detectado, reparando cuenta para:", email);

    // 1. Actualizar contraseña (para que pueda usar la nueva que acaba de ingresar)
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      existingAuthUser.id,
      { password, email_confirm: true }
    );
    if (updateAuthError) {
      console.error("[signup] Error actualizando auth user zombie:", updateAuthError);
      return NextResponse.json({
        error: "Error al recuperar la cuenta. Contactá a soporte.",
      }, { status: 500 });
    }

    // 2. Resolver empresa y crear perfil (mismo código que el flujo normal)
    return await createCompanyAndProfile({
      userId: existingAuthUser.id,
      email,
      fullName,
      password,
      companyMode,
      companyName,
      companyId,
    });
  }

  // ── Flujo normal: crear usuario nuevo ────────────────────────────────────
  console.log("[signup] Creando nuevo usuario en auth:", email);
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData?.user) {
    // Supabase dice que ya existe aunque listUsers no lo encontró → buscar y reparar
    const alreadyExistsMsg =
      authError?.message?.toLowerCase().includes("already") ||
      authError?.message?.toLowerCase().includes("registered");

    if (alreadyExistsMsg) {
      console.warn("[signup] createUser dice 'ya existe', intentando reparar...");
      const zombie = await findAuthUserByEmail(email);
      if (zombie) {
        await supabaseAdmin.auth.admin.updateUserById(zombie.id, {
          password,
          email_confirm: true,
        });
        return await createCompanyAndProfile({
          userId: zombie.id,
          email,
          fullName,
          password,
          companyMode,
          companyName,
          companyId,
        });
      }
    }

    console.error("[signup] Error creando usuario en auth:", authError);
    return NextResponse.json({
      error: authError?.message ?? "No se pudo crear la cuenta. Intentá de nuevo.",
    }, { status: 500 });
  }

  const userId = authData.user.id;
  console.log("[signup] Usuario creado en auth:", userId);

  return await createCompanyAndProfile({
    userId,
    email,
    fullName,
    password,
    companyMode,
    companyName,
    companyId,
    isNewAuthUser: true, // Para hacer rollback si el perfil falla
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
}: {
  userId: string;
  email: string;
  fullName: string;
  password: string;
  companyMode: "create" | "join";
  companyName?: string;
  companyId?: string;
  isNewAuthUser?: boolean;
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

  // ── Welcome email (no bloquea) ────────────────────────────────────────────
  try {
    const tpl = buildWelcomeEmail({ fullName, email, companyName: resolvedCompanyName, role });
    await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      meta: { entityType: "user", entityId: userId, companyId: resolvedCompanyId ?? undefined, eventType: "welcome" },
    });
  } catch (emailErr) {
    console.error("[signup] Error enviando email de bienvenida:", emailErr);
  }

  return NextResponse.json({
    ok: true,
    userId,
    companyId: resolvedCompanyId,
    companyName: resolvedCompanyName,
    role,
    message: "Cuenta creada correctamente. Ya podés iniciar sesión.",
  });
}
