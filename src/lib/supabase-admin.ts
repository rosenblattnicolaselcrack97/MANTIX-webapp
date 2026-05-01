import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase con service_role — SOLO para uso en API routes (server-side).
// NUNCA importar este archivo en código client-side.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

// Si no hay service_role key, el cliente se crea con anon key como fallback
// pero las operaciones de admin fallarán con un error claro.
const keyToUse = serviceRoleKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const supabaseAdmin = createClient(supabaseUrl, keyToUse, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const hasServiceRole = Boolean(serviceRoleKey);
