// @ts-nocheck
/**
 * GET /api/debug/signup-check
 * Diagnóstico completo: configuración, migraciones y usuarios zombie.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Service role key
  checks.service_role_key = {
    ok: hasServiceRole,
    detail: hasServiceRole
      ? "SUPABASE_SERVICE_ROLE_KEY configurada ✓"
      : "FALTA SUPABASE_SERVICE_ROLE_KEY — el signup fallará con error 503",
  };

  // 2. Conexión
  try {
    const { error } = await supabaseAdmin.from("companies").select("count").limit(1);
    checks.supabase_connection = {
      ok: !error,
      detail: error ? `Error de conexión: ${error.message}` : "Conexión a Supabase OK ✓",
    };
  } catch (e: any) {
    checks.supabase_connection = { ok: false, detail: `Excepción: ${e.message}` };
  }

  // 3. Tabla profiles + columnas base
  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, is_active, company_id")
      .limit(1);
    checks.profiles_table = {
      ok: !error,
      detail: error ? `Error: ${error.message}` : "Tabla profiles OK ✓",
    };
  } catch (e: any) {
    checks.profiles_table = { ok: false, detail: `Excepción: ${e.message}` };
  }

  // 4. Columna is_super_admin (admin-setup.sql)
  try {
    const { error } = await supabaseAdmin.from("profiles").select("is_super_admin").limit(1);
    checks.column_is_super_admin = {
      ok: !error,
      detail: error
        ? `Falta columna is_super_admin → ejecutar admin-setup.sql (${error.message})`
        : "Columna is_super_admin existe ✓",
    };
  } catch (e: any) {
    checks.column_is_super_admin = { ok: false, detail: `Excepción: ${e.message}` };
  }

  // 5. Columna is_mantix_admin (mantix-admin-migration.sql)
  try {
    const { error } = await supabaseAdmin.from("profiles").select("is_mantix_admin").limit(1);
    checks.column_is_mantix_admin = {
      ok: !error,
      detail: error
        ? `Falta columna is_mantix_admin → ejecutar mantix-admin-migration.sql (${error.message})`
        : "Columna is_mantix_admin existe ✓",
    };
  } catch (e: any) {
    checks.column_is_mantix_admin = { ok: false, detail: `Excepción: ${e.message}` };
  }

  // 6. Tabla email_events (001_email_tables.sql)
  try {
    const { error } = await supabaseAdmin.from("email_events").select("id").limit(1);
    checks.email_events_table = {
      ok: !error,
      detail: error
        ? `Falta tabla email_events → ejecutar migrations/001_email_tables.sql (${error.message})`
        : "Tabla email_events existe ✓",
    };
  } catch (e: any) {
    checks.email_events_table = { ok: false, detail: `Excepción: ${e.message}` };
  }

  // 7. Email provider
  checks.email_config = {
    ok: Boolean(process.env.RESEND_API_KEY || process.env.POSTMARK_API_KEY),
    detail: process.env.RESEND_API_KEY
      ? "RESEND_API_KEY configurada ✓"
      : "Sin proveedor de email → emails no se envían pero el signup igual funciona",
  };

  // 8. Detectar zombie users (en auth.users pero sin profile)
  let zombies: { id: string; email: string; created_at: string }[] = [];
  try {
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsers?.users?.length) {
      const authIds = authUsers.users.map((u) => u.id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("id", authIds);
      const profileIds = new Set((profiles ?? []).map((p) => p.id));
      zombies = authUsers.users
        .filter((u) => !profileIds.has(u.id))
        .map((u) => ({ id: u.id, email: u.email ?? "", created_at: u.created_at ?? "" }));
    }
    checks.zombie_users = {
      ok: zombies.length === 0,
      detail: zombies.length === 0
        ? "No hay zombie users ✓"
        : `HAY ${zombies.length} zombie(s): usuario(s) en auth.users sin fila en profiles → usar DELETE /api/debug/signup-check para limpiar`,
    };
  } catch (e: any) {
    checks.zombie_users = { ok: false, detail: `No se pudo verificar: ${e.message}` };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({
    status: allOk ? "ALL_OK" : "ISSUES_FOUND",
    allOk,
    critical: [checks.service_role_key, checks.supabase_connection, checks.profiles_table].every((c) => c.ok),
    checks,
    zombies,
    hint: zombies.length > 0
      ? "Para limpiar zombies: DELETE /api/debug/signup-check con body { zombieIds: ['id1','id2'] }"
      : undefined,
  }, { status: 200 });
}

// DELETE: eliminar usuarios zombie específicos
export async function DELETE(req: NextRequest) {
  if (!hasServiceRole) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { zombieIds } = body as { zombieIds?: string[] };

  if (!zombieIds?.length) {
    return NextResponse.json({ error: "Proveer array zombieIds." }, { status: 400 });
  }

  const results: { id: string; deleted: boolean; error?: string }[] = [];

  for (const id of zombieIds) {
    // Solo eliminar si REALMENTE no tiene perfil (doble check de seguridad)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (profile) {
      results.push({ id, deleted: false, error: "Tiene perfil, no es zombie — no eliminado" });
      continue;
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    results.push({ id, deleted: !error, error: error?.message });
  }

  return NextResponse.json({ results });
}
