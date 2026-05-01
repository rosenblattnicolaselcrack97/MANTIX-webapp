// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";

/**
 * POST /api/admin/create-company
 *
 * Crea una nueva empresa desde el panel de administración.
 * Usa supabaseAdmin (service_role) para bypassear RLS.
 * Solo debe ser llamada desde el admin panel — NO exponer al usuario final.
 *
 * Body: { name, industry?, plan?, country?, city?, cuit? }
 * Response: { ok: true, company: { id, name, ... } } | { error: string }
 */
export async function POST(req: NextRequest) {
  // Verificar que tenemos la service_role key configurada
  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor." },
      { status: 501 }
    );
  }

  const body = await req.json();
  const { name, industry, plan, country, city, cuit } = body;

  // Validar campo obligatorio
  if (!name?.trim()) {
    return NextResponse.json(
      { error: "El nombre de la empresa es requerido." },
      { status: 400 }
    );
  }

  // Insertar empresa usando service_role (sin restricciones de RLS)
  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: name.trim(),
      industry: industry?.trim() || null,
      plan:     plan ?? "trial",
      country:  country?.trim() || null,
      city:     city?.trim()    || null,
      cuit:     cuit?.trim()    || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, company });
}
