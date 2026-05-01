"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { buildAccountStatusRoute, resolveAccessState } from "@/lib/access-state";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isAdminLevel, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      const state = resolveAccessState({
        isAuthenticated: Boolean(user),
        isAdminLevel,
        profile,
      });

      if (state === "unauthenticated") router.replace("/auth/login");
      else if (state === "admin") router.replace("/admin");
      else if (state !== "ready") router.replace(buildAccountStatusRoute(state));
    }
  }, [user, isLoading, isAdminLevel, profile, router]);

  // Solo mostrar spinner mientras auth está cargando.
  // Una vez isLoading=false el perfil está definitivamente resuelto.
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
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
          <span style={{ color: "#94a3b8", fontSize: 14 }}>Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const state = resolveAccessState({
    isAuthenticated: Boolean(user),
    isAdminLevel,
    profile,
  });

  if (state !== "ready") return null;

  return <>{children}</>;
}
