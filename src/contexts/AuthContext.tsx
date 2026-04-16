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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isError: string | null;
  signUp: (email: string, password: string, fullName: string, companyName?: string) => Promise<{ error: string | null }>;
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

  // Carga el perfil del usuario desde la tabla profiles
  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
    return data as Profile | null;
  };

  // Inicializa la sesión al montar
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        }
      } catch {
        setIsError("Error al inicializar la sesión");
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Suscripción a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ─── signUp ──────────────────────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companyName?: string
  ): Promise<{ error: string | null }> => {
    setIsError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        const msg = translateError(error.message);
        setIsError(msg);
        return { error: msg };
      }

      if (data.user) {
        // Crear empresa si se proporcionó nombre
        let companyId: string | null = null;
        if (companyName?.trim()) {
          const { data: company } = await supabase
            .from("companies")
            .insert({ name: companyName.trim() })
            .select("id")
            .single();
          companyId = company?.id ?? null;
        }

        // Crear perfil del usuario
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          company_id: companyId,
          role: "admin",
        });
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isError,
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
