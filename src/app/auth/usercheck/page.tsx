"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { resolveAccessState } from "@/lib/access-state";

export default function UserCheckPage() {
  const router = useRouter();
  const { user, profile, isLoading, isAdminLevel } = useAuth();

  const state = useMemo(
    () => resolveAccessState({ isAuthenticated: Boolean(user), isAdminLevel, profile }),
    [user, isAdminLevel, profile],
  );

  useEffect(() => {
    if (isLoading) return;

    const timeout = window.setTimeout(() => {
      if (state === "admin") router.replace("/admin");
      else if (state === "ready") router.replace("/");
      else router.replace("/auth/login?registered=1");
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [isLoading, router, state]);

  const goNow = () => {
    if (state === "admin") router.replace("/admin");
    else if (state === "ready") router.replace("/");
    else router.replace("/auth/login?registered=1");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(circle at top, rgba(16,185,129,0.14) 0%, transparent 36%), linear-gradient(145deg, #081120 0%, #0f172a 52%, #020617 100%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#f8fafc",
          border: "1px solid rgba(148,163,184,0.24)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 24px 72px rgba(2,6,23,0.45)",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 16px",
            borderRadius: 999,
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#059669",
            fontSize: 30,
            fontWeight: 800,
          }}
        >
          ✓
        </div>

        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, color: "#0f172a" }}>
          ¡Tu cuenta fue verificada correctamente!
        </h1>
        <p style={{ margin: "12px 0 0", color: "#475569", fontSize: 15, lineHeight: 1.7 }}>
          Ya podés ingresar a Mantix. Te redirigimos automáticamente en unos segundos.
        </p>

        <button
          type="button"
          onClick={goNow}
          style={{
            marginTop: 22,
            width: "100%",
            border: "none",
            borderRadius: 12,
            padding: "12px 14px",
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Ingresar a Mantix
        </button>

        <div style={{ marginTop: 14 }}>
          <Link href="/auth/login" style={{ color: "#0ea5e9", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}