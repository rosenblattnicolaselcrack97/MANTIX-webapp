import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isCompanyAdminRole } from "@/lib/roles";

export interface RequesterProfile {
  id: string;
  email: string;
  company_id: string | null;
  role: string;
  is_active: boolean;
  is_super_admin: boolean;
  is_mantix_admin: boolean;
}

export interface RequesterContext {
  userId: string;
  email: string;
  accessToken: string;
  profile: RequesterProfile | null;
  isAdminLevel: boolean;
  isCompanyAdmin: boolean;
}

export async function getRequesterContext(req: NextRequest): Promise<{ context: RequesterContext | null; error?: string; status?: number }> {
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace("Bearer", "").trim();

  if (!accessToken) {
    return { context: null, error: "No autenticado.", status: 401 };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !anonKey) {
    return { context: null, error: "Configuracion de Supabase incompleta.", status: 500 };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return { context: null, error: "Sesion invalida o expirada.", status: 401 };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, company_id, role, is_active, is_super_admin, is_mantix_admin")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = (profile as RequesterProfile | null) ?? null;

  const isAdminLevel =
    typedProfile?.is_super_admin === true || typedProfile?.is_mantix_admin === true;

  const isCompanyAdmin = isCompanyAdminRole(typedProfile?.role);

  return {
    context: {
      userId: user.id,
      email: user.email ?? "",
      accessToken,
      profile: typedProfile,
      isAdminLevel,
      isCompanyAdmin,
    },
  };
}
