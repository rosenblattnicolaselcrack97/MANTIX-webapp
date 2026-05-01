// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";

/**
 * POST /api/csv/import
 *
 * Importa activos o proveedores desde CSV para una empresa.
 * Requiere autenticación via Bearer token.
 *
 * Body:
 * {
 *   company_id: string,
 *   import_type: "activos" | "proveedores",
 *   rows: { action: "create" | "update", data: Record<string, string>, existingId?: string }[],
 *   file_name: string,
 *   location_map: Record<string, string>  // locationName → location_id (para activos)
 * }
 */
export async function POST(req: NextRequest) {
  if (!hasServiceRole) {
    return NextResponse.json({ error: "Servicio no disponible." }, { status: 501 });
  }

  // Authenticate user
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

  const body = await req.json();
  const { company_id, import_type, rows, file_name, location_map = {} } = body;

  if (!company_id || !import_type || !Array.isArray(rows)) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }
  if (rows.length > 50) {
    return NextResponse.json({ error: "Máximo 50 registros por importación." }, { status: 400 });
  }

  let created_count = 0;
  let updated_count = 0;
  const errorDetails: string[] = [];

  // ─── Import ACTIVOS ─────────────────────────────────────────────────────────
  if (import_type === "activos") {
    for (const item of rows) {
      const d = item.data;
      try {
        const payload = {
          company_id,
          name: d["Nombre"]?.trim() || "Sin nombre",
          internal_code: d["Código"]?.trim() || null,
          category: d["Categoría"]?.trim() || null,
          status: d["Estado"]?.trim()?.toLowerCase() || "operative",
          criticality: d["Criticidad"]?.trim()?.toLowerCase() || "medium",
          location_id: d["Ubicación"] ? (location_map[d["Ubicación"].trim()] ?? null) : null,
          manufacturer: d["Fabricante"]?.trim() || null,
          model: d["Modelo"]?.trim() || null,
          serial_number: d["Número de Serie"]?.trim() || null,
          notes: d["Notas"]?.trim() || null,
        };

        if (item.action === "update" && item.existingId) {
          const { error } = await supabaseAdmin.from("assets").update(payload).eq("id", item.existingId);
          if (error) throw error;
          updated_count++;
        } else {
          const { error } = await supabaseAdmin.from("assets").insert(payload);
          if (error) throw error;
          created_count++;
        }
      } catch (e: any) {
        errorDetails.push(`Error en activo "${d["Nombre"]}": ${e.message}`);
      }
    }
  }

  // ─── Import PROVEEDORES ──────────────────────────────────────────────────────
  else if (import_type === "proveedores") {
    for (const item of rows) {
      const d = item.data;
      try {
        const payload = {
          company_id,
          name: d["Nombre"]?.trim() || "Sin nombre",
          phone: d["Teléfono"]?.trim() || null,
          whatsapp: d["WhatsApp"]?.trim() || null,
          email: d["Email"]?.trim() || null,
          category: d["Categoría"]?.trim() || null,
          contact_name: d["Contacto Principal"]?.trim() || null,
          notes: d["Notas"]?.trim() || null,
          is_active: d["Estado"]?.trim() !== "Inactivo",
        };

        if (item.action === "update" && item.existingId) {
          const { error } = await supabaseAdmin.from("providers").update(payload).eq("id", item.existingId);
          if (error) throw error;
          updated_count++;
        } else {
          const { error } = await supabaseAdmin.from("providers").insert(payload);
          if (error) throw error;
          created_count++;
        }
      } catch (e: any) {
        errorDetails.push(`Error en proveedor "${d["Nombre"]}": ${e.message}`);
      }
    }
  } else {
    return NextResponse.json({ error: "import_type inválido." }, { status: 400 });
  }

  // ─── Log in csv_import_logs (best-effort, won't fail the response) ──────────
  try {
    await supabaseAdmin.from("csv_import_logs").insert({
      company_id,
      imported_by: user.id,
      import_type,
      created_count,
      updated_count,
      error_count: errorDetails.length,
      file_name: file_name ?? "unknown.csv",
      status: errorDetails.length === 0 ? "success" : errorDetails.length === rows.length ? "failed" : "partial",
      error_details: errorDetails.length > 0 ? errorDetails : null,
    });
  } catch (_) {
    // Table may not exist yet — ignore, don't fail the request
  }

  return NextResponse.json({
    ok: true,
    created_count,
    updated_count,
    error_count: errorDetails.length,
    errors: errorDetails,
  });
}
