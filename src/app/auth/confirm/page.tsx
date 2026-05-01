"use client";

/**
 * /auth/confirm
 *
 * Página de callback para el flujo PKCE de Supabase Auth.
 * Supabase redirige aquí después de que el usuario confirma su cuenta
 * o acepta una invitación. El cliente de Supabase JS detecta automáticamente
 * el `token_hash` o `code` en la URL y establece la sesión.
 *
 * Flujo:
 *   1. Usuario hace click en el link del email (invite / confirm / reset)
 *   2. Supabase redirige a esta página con ?token_hash=...&type=...
 *   3. Supabase JS procesa el token automáticamente (onAuthStateChange)
 *   4. AuthContext carga el perfil del usuario
 *   5. Esta página redirige al destino correcto según el tipo de usuario
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { buildAccountStatusRoute, resolveAccessState } from "@/lib/access-state";
import { supabase } from "@/lib/supabase";

function isEmailOtpType(type: string): type is EmailOtpType {
  return ["signup", "invite", "magiclink", "recovery", "email_change"].includes(type);
}

function AuthConfirmPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAdminLevel, profile, refreshProfile } = useAuth();
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const hasProcessedCallback = useRef(false);

  useEffect(() => {
    if (hasProcessedCallback.current) return;
    hasProcessedCallback.current = true;

    let mounted = true;

    const processCallback = async () => {
      const code = searchParams?.get("code");
      const tokenHash = searchParams?.get("token_hash");
      const authType = (searchParams?.get("type") ?? "").toLowerCase();

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && isEmailOtpType(authType)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: authType,
          });
          if (error) throw error;
        }

        await refreshProfile();
      } catch {
        if (mounted) {
          setCallbackError("El enlace de verificacion es invalido o ya expiro.");
        }
      } finally {
        if (mounted) {
          setIsProcessingToken(false);
        }
      }
    };

    void processCallback();

    return () => {
      mounted = false;
    };
  }, [refreshProfile, searchParams]);

  // Una vez que auth termine de cargar, redirigir al lugar correcto
  useEffect(() => {
    if (!isLoading && !isProcessingToken && !callbackError) {
      const authType = (searchParams?.get("type") ?? "").toLowerCase();
      if (authType === "recovery") {
        router.replace("/auth/update-password");
        return;
      }

      const state = resolveAccessState({
        isAuthenticated: Boolean(user),
        isAdminLevel,
        profile,
      });

      if (state === "unauthenticated") router.replace("/auth/login");
      else if (state === "admin") router.replace("/admin");
      else if (state === "ready") router.replace("/auth/user-approved");
      else router.replace(buildAccountStatusRoute(state));
    }
  }, [user, isLoading, isProcessingToken, callbackError, isAdminLevel, profile, router, searchParams]);

  // Mostrar spinner mientras se procesa el token y se carga el perfil
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f1e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        gap: 20,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(14,165,233,0.3)",
          borderTop: "3px solid #0ea5e9",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: callbackError ? "#fca5a5" : "#64748b", fontSize: 14 }}>
        {callbackError ?? "Verificando cuenta..."}
      </p>
      {callbackError ? (
        <button
          onClick={() => router.replace("/auth/login")}
          style={{
            border: "none",
            borderRadius: 10,
            background: "#0ea5e9",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            padding: "10px 14px",
          }}
          type="button"
        >
          Volver al login
        </button>
      ) : null}
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <AuthConfirmPageInner />
    </Suspense>
  );
}
