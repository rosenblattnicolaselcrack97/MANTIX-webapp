"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { resolveAccessState } from "@/lib/access-state";

type CompanyInfo = { id: string; name: string };

export default function UserApprovedPage() {
  const { user, profile, isLoading, isAdminLevel } = useAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const accessState = useMemo(
    () => resolveAccessState({ isAuthenticated: Boolean(user), isAdminLevel, profile }),
    [user, isAdminLevel, profile],
  );

  useEffect(() => {
    let mounted = true;

    const loadCompany = async () => {
      if (!profile?.company_id) {
        if (mounted) {
          setCompany(null);
          setCompanyError(null);
          setIsLoadingCompany(false);
        }
        return;
      }

      setIsLoadingCompany(true);
      setCompanyError(null);

      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", profile.company_id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setCompany(null);
        setCompanyError("No pudimos obtener la empresa asignada en este momento.");
      } else {
        setCompany((data as CompanyInfo | null) ?? null);
      }

      setIsLoadingCompany(false);
    };

    if (!isLoading) {
      void loadCompany();
    }

    return () => {
      mounted = false;
    };
  }, [isLoading, profile?.company_id]);

  useEffect(() => {
    if (isLoading) return;

    const timeout = window.setTimeout(() => {
      window.location.replace("/auth/login");
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [isLoading]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 400px at 20% -10%, rgba(14,165,233,0.22), transparent 60%), linear-gradient(145deg, #0a0f1e 0%, #0d1b3e 55%, #071224 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          background: "#f8fafc",
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          boxShadow: "0 18px 60px rgba(0,0,0,0.3)",
          padding: "34px 30px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Image src="/logos/logo-full.png" alt="Mantix" width={150} height={44} priority />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              border: "1px solid rgba(5,150,105,0.3)",
              background: "rgba(16,185,129,0.12)",
              color: "#047857",
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Cuenta aprobada
          </span>
        </div>

        <h1 style={{ margin: "18px 0 0", fontSize: 34, lineHeight: 1.15, color: "#0f172a" }}>Usuario nuevo aprobado</h1>
        <p style={{ margin: "12px 0 0", fontSize: 16, color: "#475569", lineHeight: 1.7 }}>
          Tu cuenta fue aprobada correctamente. Ya podes ingresar a Mantix.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#0f172a", fontWeight: 600 }}>Bienvenido a la familia Mantix.</p>

        <div style={{ marginTop: 22 }}>
          {isLoading || isLoadingCompany ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Cargando informacion de tu cuenta...</p>
          ) : company ? (
            <p style={{ margin: 0, color: "#0f172a", fontSize: 14 }}>
              Empresa asignada: <strong>{company.name}</strong>
            </p>
          ) : companyError ? (
            <p style={{ margin: 0, color: "#b45309", fontSize: 14 }}>{companyError}</p>
          ) : (
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No hay empresa visible para mostrar en este momento.</p>
          )}
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
              padding: "12px 16px",
              color: "#fff",
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            }}
          >
            Ir al login
          </Link>

          {accessState === "ready" || accessState === "admin" ? (
            <Link
              href={accessState === "admin" ? "/admin" : "/"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
                padding: "12px 16px",
                color: "#0f172a",
                background: "#e2e8f0",
              }}
            >
              Ir al dashboard
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
