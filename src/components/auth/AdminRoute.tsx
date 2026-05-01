"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading, isAdminLevel } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/auth/login");
      } else if (!isAdminLevel) {
        router.replace("/");
      }
    }
  }, [user, isLoading, isAdminLevel, router]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
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
          <span style={{ color: "#64748b", fontSize: 14 }}>Cargando panel...</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdminLevel) return null;

  return <>{children}</>;
}
