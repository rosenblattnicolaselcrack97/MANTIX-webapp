"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

type StatusKey = "pending" | "no_company" | "incomplete_profile";

const STATUS_COPY: Record<StatusKey, { title: string; description: string }> = {
  pending: {
    title: "Tu cuenta esta pendiente de aprobacion",
    description:
      "Tu usuario existe, pero todavia no fue aprobado para operar en Mantix. Contacta al administrador de tu empresa o espera la confirmacion.",
  },
  no_company: {
    title: "Todavia no tenes una empresa asignada",
    description:
      "Tu cuenta fue verificada, pero no tiene una empresa vinculada. Contacta al administrador de tu empresa para que te asigne correctamente.",
  },
  incomplete_profile: {
    title: "Tu perfil esta incompleto",
    description:
      "Detectamos una inconsistencia en tu cuenta. El equipo de administracion debe revisar el perfil y la asignacion de empresa para habilitar el acceso.",
  },
};

function AccountStatusPageInner() {
  const searchParams = useSearchParams();

  const state = useMemo<StatusKey>(() => {
    const raw = (searchParams?.get("state") ?? "").toLowerCase();
    if (raw === "pending" || raw === "no_company" || raw === "incomplete_profile") return raw;
    return "incomplete_profile";
  }, [searchParams]);

  const copy = STATUS_COPY[state];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a0f1e 0%, #0d1b3e 55%, #071224 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          background: "#f8fafc",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          padding: "34px 30px",
          boxShadow: "0 18px 56px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            borderRadius: 999,
            border: "1px solid #cbd5e1",
            background: "#f1f5f9",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            color: "#334155",
            marginBottom: 14,
          }}
        >
          Estado de cuenta
        </div>
        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.2, color: "#0f172a" }}>{copy.title}</h1>
        <p style={{ margin: "14px 0 0", fontSize: 15, lineHeight: 1.7, color: "#475569" }}>{copy.description}</p>

        <div style={{ marginTop: 26, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/auth/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              padding: "11px 16px",
              color: "#fff",
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            }}
          >
            Volver al login
          </Link>
          <a
            href="mailto:info@mantix.com.ar"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              padding: "11px 16px",
              color: "#0f172a",
              background: "#e2e8f0",
            }}
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AccountStatusPage() {
  return (
    <Suspense fallback={null}>
      <AccountStatusPageInner />
    </Suspense>
  );
}
