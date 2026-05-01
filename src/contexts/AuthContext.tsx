"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  theme_preference?: string | null;
  notification_preferences?: Record<string, unknown> | null;
  email_preferences?: Record<string, unknown> | null;
  is_active: boolean;
  is_super_admin: boolean;
  is_mantix_admin: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isError: string | null;
  isSuperAdmin: boolean;
  isMantixAdmin: boolean;
  isAdminLevel: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    companySetup: { mode: "create"; name: string } | { mode: "join"; id: string }
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  getProfile: () => Promise<Profile | null>;
  refreshProfile: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState<string | null>(null);

  // Carga el perfil con timeout de 5 segundos para evitar bloqueos RLS.
  const loadProfile = async (userId: string): Promise<Profile | null> => {
    // Competencia entre la query y un timeout de 5 s.
    // Si la RLS cuelga (auto-referencia, lentitud de red, etc.) resolvemos con null.
    const queryPromise = supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null; error: null }>((res) =>
      setTimeout(() => res({ data: null, error: null }), 5000)
    );

    const { data } = await Promise.race([queryPromise, timeoutPromise]);
    const prof = (data as Profile | null) ?? null;
    setProfile(prof);
    return prof;
  };

  useEffect(() => {
    // ── INICIALIZACIÓN DUAL (robusta para Next.js + Supabase v2) ─────────────
    //
    // 1. getSession() lee la sesión de localStorage SIN red — resuelve en < 1 ms.
    //    Esto inicializa el estado inmediatamente sin esperar ningún evento.
    //
    // 2. onAuthStateChange gestiona cambios futuros (login, logout, token refresh).
    //
    // 3. Un timeout de 8 s garantiza que isLoading SIEMPRE resuelva aunque
    //    Supabase no pueda conectarse o INITIAL_SESSION nunca llegue.

    let resolved = false;

    const resolve = () => {
      if (!resolved) {
        resolved = true;
        setIsLoading(false);
      }
    };

    // Fallback de seguridad
    const safetyTimer = setTimeout(() => {
      resolve();
    }, 8000);

    // Inicialización inmediata desde localStorage
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!resolved) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await loadProfile(currentSession.user.id);
          } else {
            setProfile(null);
          }
        }
      } catch {
        setProfile(null);
      } finally {
        resolve();
      }
    };

    void initAuth();

    // Suscripción a cambios posteriores (no re-inicializa — solo actualiza estado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        // Ignorar el INITIAL_SESSION si ya resolvimos vía getSession()
        if (_event === "INITIAL_SESSION") return;

        try {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await loadProfile(currentSession.user.id);
          } else {
            setProfile(null);
          }
        } catch {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── signUp ──────────────────────────────────────────────────────────────
  // Delega la creación del usuario, empresa y perfil al API route /api/auth/signup
  // que usa service_role para bypassear RLS correctamente.
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companySetup: { mode: "create"; name: string } | { mode: "join"; id: string }
  ): Promise<{ error: string | null }> => {
    setIsError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          companyMode: companySetup.mode,
          companyName: companySetup.mode === "create" ? companySetup.name : undefined,
          companyId: companySetup.mode === "join" ? companySetup.id : undefined,
        }),
      });

      const json = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok || !json.ok) {
        const msg = json.error ?? "Error al crear la cuenta. Intentá de nuevo.";
        setIsError(msg);
        return { error: msg };
      }

      return { error: null };
    } catch {
      const msg = "Error inesperado. Por favor intentá de nuevo.";
      setIsError(msg);
      return { error: msg };
    }
  };

  // ─── signIn ──────────────────────────────────────────────────────────────
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    setIsError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg = translateError(error.message);
        setIsError(msg);
        return { error: msg };
      }

      return { error: null };
    } catch {
      const msg = "Error inesperado. Por favor intentá de nuevo.";
      setIsError(msg);
      return { error: msg };
    }
  };

  // ─── signOut ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // ─── getProfile ──────────────────────────────────────────────────────────
  const getProfile = async (): Promise<Profile | null> => {
    if (!user) return null;
    return loadProfile(user.id);
  };

  // ─── refreshProfile ──────────────────────────────────────────────────────
  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  // check profile first; fall back to user_metadata for users created directly in Supabase Dashboard
  const isSuperAdmin =
    profile?.is_super_admin === true ||
    Boolean((user?.user_metadata as Record<string, unknown> | undefined)?.is_super_admin);

  const isMantixAdmin = profile?.is_mantix_admin === true;

  // true for both SuperAdmin and MantixAdmin — allows access to /admin
  const isAdminLevel = isSuperAdmin || isMantixAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isError,
        isSuperAdmin,
        isMantixAdmin,
        isAdminLevel,
        signUp,
        signIn,
        signOut,
        getProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function translateError(msg: string): string {
  const errors: Record<string, string> = {
    "Invalid login credentials": "Email o contraseña incorrectos.",
    "Email not confirmed": "Confirmá tu email antes de ingresar.",
    "User already registered": "Este email ya está registrado.",
    "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres.",
    "Unable to validate email address: invalid format": "El formato del email no es válido.",
    "signup disabled": "El registro está temporalmente deshabilitado.",
    "Email rate limit exceeded": "Demasiados intentos. Esperá unos minutos.",
  };
  return errors[msg] ?? msg;
}
