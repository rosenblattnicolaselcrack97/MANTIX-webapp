// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  if (!hasServiceRole) {
    return NextResponse.json({ error: "Service role key not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim().toLowerCase(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
