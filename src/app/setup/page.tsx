"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type CompanyMode = "create" | "join";

interface CompanyResult {
  id: string;
  name: string;
}

export default function SetupPage() {
  const router = useRouter();
  const { user, profile, isLoading, refreshProfile, signOut } = useAuth();

  const [companyMode, setCompanyMode] = useState<CompanyMode>("create");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CompanyResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";
    return () => {
      document.documentElement.style.overflowY = "";
      document.body.style.overflowY = "";
    };
  }, []);

  // If user already has a company, skip this page
  useEffect(() => {
    if (!isLoading && profile !== null) {
      if (!user) router.replace("/auth/login");
      else if (profile.company_id) router.replace("/");
    }
  }, [user, isLoading, profile, router]);

  const searchCompanies = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const { data } = await supabase.rpc("search_companies_by_name", { search_term: term });
    setSearchResults((data as CompanyResult[]) ?? []);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (companyMode === "join") searchCompanies(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, companyMode, searchCompanies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (companyMode === "create" && !newCompanyName.trim()) {
      setError("Ingresá el nombre de tu empresa.");
      return;
    }
    if (companyMode === "join" && !selectedCompany) {
      setError("Seleccioná una empresa de la lista.");
      return;
    }

    setIsSubmitting(true);
    let companyId: string | null = null;

    if (companyMode === "create") {
      const { data, error: err } = await supabase
        .from("companies")
        .insert({ name: newCompanyName.trim() })
        .select("id")
        .single();
      if (err) { setError("No se pudo crear la empresa. Intentá de nuevo."); setIsSubmitting(false); return; }
      companyId = data?.id ?? null;
    } else {
      companyId = selectedCompany!.id;
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ company_id: companyId, role: companyMode === "create" ? "admin" : "technician" })
      .eq("id", user!.id);

    if (updateErr) {
      setError("No se pudo vincular la empresa. Intentá de nuevo.");
      setIsSubmitting(false);
      return;
    }

    await refreshProfile();
    router.replace("/");
  };

  if (isLoading || (user && profile === null)) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(14,165,233,0.3)", borderTop: "3px solid #0ea5e9", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg, #0a0f1e 0%, #0d1b3e 55%, #071224 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#f8fafc", borderRadius: 20, padding: "44px 40px", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
        {/* Logo */}
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <Image src="/logos/logo-full.png" alt="Mantix" width={140} height={40} style={{ objectFit: "contain" }} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0a0f1e", marginBottom: 6, textAlign: "center" }}>
          Configurá tu empresa
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 28, textAlign: "center", lineHeight: 1.6 }}>
          Para usar Mantix necesitás estar vinculado a una empresa.<br />
          Hola, <strong>{profile?.full_name ?? user.email}</strong>.
        </p>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["create", "join"] as CompanyMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setCompanyMode(mode); setError(null); setSelectedCompany(null); setSearchTerm(""); setSearchResults([]); }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                border: companyMode === mode ? "2px solid #0ea5e9" : "1.5px solid #e2e8f0",
                background: companyMode === mode ? "rgba(14,165,233,0.06)" : "#fff",
                color: companyMode === mode ? "#0ea5e9" : "#64748b",
                fontSize: 13,
                fontWeight: companyMode === mode ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {mode === "create" ? "🏢 Crear empresa" : "🔗 Unirme a empresa"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {companyMode === "create" ? (
            <div>
              <label style={labelStyle}>Nombre de la empresa <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ej: Ferretería Sur S.A."
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Quedarás como administrador de la empresa.</p>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Buscar empresa <span style={{ color: "#dc2626" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={selectedCompany ? selectedCompany.name : searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setSelectedCompany(null); }}
                  placeholder="Escribí el nombre de tu empresa..."
                  style={{ ...inputStyle, paddingRight: selectedCompany ? 36 : 14 }}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  readOnly={!!selectedCompany}
                />
                {selectedCompany && (
                  <button type="button" onClick={() => { setSelectedCompany(null); setSearchTerm(""); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>×</button>
                )}
              </div>

              {!selectedCompany && searchTerm.length >= 2 && (
                <div style={{ marginTop: 4, border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#fff", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  {isSearching ? (
                    <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>Buscando...</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>No se encontraron empresas. Verificá el nombre o creá una nueva.</div>
                  ) : (
                    searchResults.map((c) => (
                      <button key={c.id} type="button" onClick={() => { setSelectedCompany(c); setSearchResults([]); }}
                        style={{ width: "100%", padding: "11px 14px", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 14, color: "#0a0f1e", fontWeight: 500 }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "#f8fafc")}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "none")}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedCompany && (
                <div style={{ marginTop: 6, padding: "8px 12px", background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#0ea5e9", fontWeight: 600 }}>{selectedCompany.name}</span>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>{error}</div>}

          <button type="submit" disabled={isSubmitting} style={{ width: "100%", padding: "13px", background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", marginTop: 4 }}>
            {isSubmitting ? "Guardando..." : "Continuar a Mantix →"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => signOut().then(() => router.replace("/auth/login"))}
          style={{ width: "100%", marginTop: 16, padding: "10px", background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "center" }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10,
  fontSize: 14, background: "#fff", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
};
