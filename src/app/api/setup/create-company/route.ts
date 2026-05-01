// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";

/**
 * POST /api/setup/create-company
 *
 * Ruta para que usuarios autenticados creen su empresa durante el onboarding.
 * Usa service_role para bypassear RLS, pero primero verifica que el token
 * del usuario sea válido para evitar que cualquiera cree empresas.
 */
export async function POST(req: NextRequest) {
  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "Servicio no disponible. Contactá a soporte." },
      { status: 501 }
    );
  }

  // Verificar que el usuario esté autenticado usando su Bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // Verificar el token con Supabase (usa anon key para validar el JWT del usuario)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
  }

  const { company_name, full_name, role } = await req.json();

  if (!company_name?.trim()) {
    return NextResponse.json({ error: "El nombre de la empresa es requerido." }, { status: 400 });
  }

  // Crear la empresa con service_role (bypassea RLS)
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert({ name: company_name.trim() })
    .select("id, name")
    .single();

  if (companyError) {
    console.error("[setup/create-company] Error creando empresa:", companyError);
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  // Upsert del perfil para vincular la empresa
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: full_name?.trim() || (user.user_metadata?.full_name as string) || "Usuario",
      company_id: company.id,
      role: role ?? "admin",
      is_active: true,
    });

  if (profileError) {
    console.error("[setup/create-company] Error actualizando perfil:", profileError);
    // Rollback: borrar la empresa recién creada para no dejar datos huérfanos
    await supabaseAdmin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company });
}
