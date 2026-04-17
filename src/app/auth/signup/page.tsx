"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type CompanyMode = "create" | "join";

interface CompanyResult {
  id: string;
  name: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { signUp, user, isLoading: authLoading } = useAuth();

  // ── Step state ────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: credentials
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: company
  const [companyMode, setCompanyMode] = useState<CompanyMode>("create");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CompanyResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Shared
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fix scroll
  useEffect(() => {
    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";
    return () => {
      document.documentElement.style.overflowY = "";
      document.body.style.overflowY = "";
    };
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // ── Company search ────────────────────────────────────────
  const searchCompanies = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setSearchResults([]);
      return;
    }
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

  // ── Validation ────────────────────────────────────────────
  const validateStep1 = (): string | null => {
    if (!fullName.trim()) return "El nombre es obligatorio.";
    if (!email.trim()) return "El email es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "El formato del email no es válido.";
    if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (password !== confirmPassword) return "Las contraseñas no coinciden.";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (companyMode === "create") {
      if (!newCompanyName.trim()) return "Ingresá el nombre de tu empresa.";
    } else {
      if (!selectedCompany) return "Seleccioná una empresa de la lista.";
    }
    return null;
  };

  // ── Handlers ──────────────────────────────────────────────
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = validateStep2();
    if (err) { setError(err); return; }

    setIsSubmitting(true);

    const companySetup =
      companyMode === "create"
        ? { mode: "create" as const, name: newCompanyName.trim() }
        : { mode: "join" as const, id: selectedCompany!.id };

    const { error: signUpError } = await signUp(email, password, fullName.trim(), companySetup);

    if (signUpError) {
      setError(signUpError);
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace("/"), 1500);
  };

  if (authLoading) return null;

  // ── Branding panel content per step ───────────────────────
  const leftContent =
    step === 1 ? (
      <>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", color: "#00d4aa", marginBottom: 18, textTransform: "uppercase" }}>
          Comenzá en minutos
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 20, maxWidth: 460 }}>
          Tu empresa merece un{" "}
          <span style={{ color: "#00d4aa" }}>mantenimiento</span>{" "}
          <span style={{ color: "#00b4d8" }}>inteligente</span>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, maxWidth: 420, marginBottom: 44 }}>
          Creá tu cuenta y centralizá todos tus activos, órdenes de trabajo y
          proveedores en un solo lugar.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { step: "01", title: "Creá tu cuenta", desc: "Solo necesitás email y contraseña. Sin tarjeta de crédito." },
            { step: "02", title: "Configurá tu empresa", desc: "Creá tu empresa o uníte a una que ya existe en Mantix." },
            { step: "03", title: "Gestioná desde el día uno", desc: "Cargá activos, creá OTs y coordiná proveedores en tiempo real." },
          ].map((item) => (
            <div key={item.step} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#00d4aa", flexShrink: 0 }}>
                {item.step}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{item.title}</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </>
    ) : (
      <>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", color: "#00b4d8", marginBottom: 18, textTransform: "uppercase" }}>
          Paso 2 de 2
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 20, maxWidth: 460 }}>
          Configurá tu{" "}
          <span style={{ color: "#00d4aa" }}>empresa</span>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, maxWidth: 420, marginBottom: 44 }}>
          En Mantix, cada usuario pertenece a una empresa. Las OTs, activos y
          sucursales están siempre asociadas a tu empresa.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>🏢</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Crear nueva empresa</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>Sos el primero de tu empresa en usar Mantix. Quedás como administrador.</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,180,216,0.12)", border: "1px solid rgba(0,180,216,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>🔗</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Unirse a empresa existente</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>Tu empresa ya está en Mantix. Buscá el nombre y uníte al equipo.</p>
            </div>
          </div>
        </div>
      </>
    );

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Panel izquierdo (branding) ── */}
      <div
        className="hidden lg:flex"
        style={{
          flex: 1,
          background: "linear-gradient(145deg, #0a0f1e 0%, #0d1b3e 55%, #071224 100%)",
          color: "#fff",
          flexDirection: "column",
          padding: "52px 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -80, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,170,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,216,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ marginBottom: 60 }}>
          <Image src="/logos/logo-full.png" alt="Mantix" width={180} height={52} style={{ objectFit: "contain", objectPosition: "left" }} priority />
        </div>

        <div style={{ flex: 1 }}>{leftContent}</div>

        <div style={{ marginTop: 44, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            ¿Ya tenés cuenta?{" "}
            <Link href="/auth/login" style={{ color: "#00b4d8", textDecoration: "none", fontWeight: 600 }}>
              Iniciá sesión aquí
            </Link>
          </p>
        </div>
      </div>

      {/* ── Panel derecho (formulario) ── */}
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          minHeight: "100vh",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 40px",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        {/* Logo mobile */}
        <div className="flex lg:hidden" style={{ alignItems: "center", gap: 10, marginBottom: 36 }}>
          <Image src="/logos/logo-full.png" alt="Mantix" width={140} height={40} style={{ objectFit: "contain" }} />
        </div>

        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Progress indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            {[1, 2].map((n) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: step >= n ? "#0ea5e9" : "#e2e8f0",
                  color: step >= n ? "#fff" : "#94a3b8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  transition: "all 0.2s",
                }}>
                  {n}
                </div>
                <span style={{ fontSize: 12, color: step >= n ? "#0ea5e9" : "#94a3b8", fontWeight: step === n ? 600 : 400 }}>
                  {n === 1 ? "Tu cuenta" : "Tu empresa"}
                </span>
                {n < 2 && <div style={{ width: 32, height: 1, background: step > n ? "#0ea5e9" : "#e2e8f0", transition: "background 0.2s" }} />}
              </div>
            ))}
          </div>

          {success ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>✓</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>¡Cuenta creada!</p>
              <p style={{ fontSize: 13, color: "#64748b" }}>Redirigiendo al dashboard...</p>
            </div>
          ) : step === 1 ? (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0a0f1e", marginBottom: 8 }}>Crear cuenta gratis</h2>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28, lineHeight: 1.6 }}>
                Ingresá tus datos para comenzar.
              </p>
              <form onSubmit={handleStep1Next} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nombre completo <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej: Martín García" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
                <div>
                  <label style={labelStyle}>Confirmar contraseña <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetí tu contraseña" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
                </div>

                {error && <div style={errorStyle}>{error}</div>}

                <button type="submit" style={btnStyle(false)}>
                  Continuar →
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0a0f1e", marginBottom: 8 }}>Tu empresa</h2>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                Para usar Mantix necesitás estar vinculado a una empresa.
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
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                      Quedarás como administrador de la empresa.
                    </p>
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
                        <button
                          type="button"
                          onClick={() => { setSelectedCompany(null); setSearchTerm(""); }}
                          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Search results */}
                    {!selectedCompany && searchTerm.length >= 2 && (
                      <div style={{ marginTop: 4, border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#fff", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                        {isSearching ? (
                          <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>Buscando...</div>
                        ) : searchResults.length === 0 ? (
                          <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>
                            No se encontraron empresas. Verificá el nombre o creá una nueva.
                          </div>
                        ) : (
                          searchResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setSelectedCompany(c); setSearchResults([]); }}
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

                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                      El administrador de la empresa podrá ver tu cuenta en el panel.
                    </p>
                  </div>
                )}

                {error && <div style={errorStyle}>{error}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); }}
                    style={{ flex: "0 0 auto", padding: "13px 20px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer" }}
                  >
                    ← Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ ...btnStyle(isSubmitting), flex: 1 }}
                  >
                    {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
                  </button>
                </div>
              </form>
            </>
          )}

          {!success && (
            <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#64748b" }}>
              ¿Ya tenés cuenta?{" "}
              <Link href="/auth/login" style={{ color: "#0ea5e9", fontWeight: 600, textDecoration: "none" }}>
                Ingresar
              </Link>
            </p>
          )}

          <p style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: "#94a3b8" }}>
            ¿Preguntas?{" "}
            <a href="mailto:info@mantix.com.ar" style={{ color: "#0ea5e9", textDecoration: "none" }}>
              info@mantix.com.ar
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  background: "#fff",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  color: "#dc2626",
  fontSize: 13,
};

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "13px",
  background: disabled ? "#94a3b8" : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "opacity 0.2s",
  letterSpacing: "0.02em",
});
