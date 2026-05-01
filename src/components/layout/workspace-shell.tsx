"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Company, User } from "@/types/entities";

import { AppShell } from "@/components/layout/app-shell";

function getInitials(fullName: string | null | undefined, email: string | null | undefined) {
  const source = fullName?.trim() || email?.trim() || "M";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function buildWorkspaceUser(profile: NonNullable<ReturnType<typeof useAuth>["profile"]>): User {
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.is_super_admin ? "mantix_admin" : "company_user",
    email: profile.email,
    initials: getInitials(profile.full_name, profile.email),
    team: profile.role,
    availability: profile.is_active ? "online" : "offline",
    companyId: profile.company_id ?? "",
  };
}

function buildWorkspaceCompany(
  company: {
    id: string;
    name: string;
    industry: string | null;
    country: string | null;
    city: string | null;
  },
): Company {
  const locationParts = [company.city, company.country].filter(Boolean);

  return {
    id: company.id,
    name: company.name,
    industry: company.industry ?? "Sin industria definida",
    headquarters: locationParts.join(", ") || "Sin ubicación definida",
    locations: 0,
    activeAssets: 0,
    openWorkOrders: 0,
    complianceScore: 0,
  };
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCompany = async () => {
      if (!profile?.company_id) {
        if (isMounted) {
          setCompany(null);
          setIsLoadingCompany(false);
        }
        return;
      }

      setIsLoadingCompany(true);

      const { data } = await supabase
        .from("companies")
        .select("id, name, industry, country, city")
        .eq("id", profile.company_id)
        .maybeSingle();

      if (isMounted) {
        setCompany(data ? buildWorkspaceCompany(data) : null);
        setIsLoadingCompany(false);
      }
    };

    void loadCompany();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id]);

  if (!profile || isLoadingCompany) {
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
            width: 40,
            height: 40,
            border: "3px solid rgba(14,165,233,0.3)",
            borderTop: "3px solid #0ea5e9",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!company) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid #334155",
            borderRadius: 18,
            padding: "28px 24px",
            color: "#e2e8f0",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
            No pudimos cargar tu empresa
          </h1>
          <p style={{ margin: "12px 0 0", color: "#94a3b8", lineHeight: 1.6 }}>
            Tu sesión está activa, pero la empresa asociada a tu perfil no existe o no está accesible.
            Revisá la relación company_id en profiles o completá la configuración inicial otra vez.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell company={company} currentUser={buildWorkspaceUser(profile)}>
      {children}
    </AppShell>
  );
}