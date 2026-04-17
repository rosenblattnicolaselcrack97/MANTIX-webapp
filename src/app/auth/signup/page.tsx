"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, user, isLoading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fix scroll: globals.css sets overflow:hidden on body for the workspace.
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

  const validate = (): string | null => {
    if (!fullName.trim()) return "El nombre es obligatorio.";
    if (!email.trim()) return "El email es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "El formato del email no es válido.";
    if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (password !== confirmPassword) return "Las contraseñas no coinciden.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    const { error: signUpError } = await signUp(email, password, fullName.trim(), companyName.trim() || undefined);

    if (signUpError) {
      setError(signUpError);
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace("/"), 1500);
  };

  if (authLoading) return null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
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
        {/* Círculos decorativos */}
        <div style={{ position: "absolute", top: -80, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,170,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,216,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ marginBottom: 60 }}>
          <Image
            src="/logos/logo-full.png"
            alt="Mantix"
            width={180}
            height={52}
            style={{ objectFit: "contain", objectPosition: "left" }}
            priority
          />
        </div>

        {/* Headline */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", color: "#00d4aa", marginBottom: 18, textTransform: "uppercase" }}>
            Comenzá en minutos
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 20, maxWidth: 460 }}>
            Tu empresa merece un{" "}
            <span style={{ color: "#00d4aa" }}>mantenimiento</span>{" "}
            <span style={{ color: "#00b4d8" }}>inteligente</span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, maxWidth: 420, marginBottom: 44 }}>
            Creá tu cuenta gratis y empezá a centralizar todos tus activos,
            órdenes de trabajo y proveedores en un solo lugar.
          </p>

          {/* Pasos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { step: "01", title: "Creá tu cuenta", desc: "Solo necesitás email y contraseña. Sin tarjeta de crédito." },
              { step: "02", title: "Cargá tu empresa y activos", desc: "Registrá tus equipos, ubicaciones y ciclos de mantenimiento." },
              { step: "03", title: "Gestioná desde el día uno", desc: "Creá OTs, asigná proveedores y monitoreá el estado en tiempo real." },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#00d4aa", flexShrink: 0,
                }}>
                  {item.step}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
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
        <div
          className="flex lg:hidden"
          style={{ alignItems: "center", gap: 10, marginBottom: 36 }}
        >
          <Image
            src="/logos/logo-full.png"
            alt="Mantix"
            width={140}
            height={40}
            style={{ objectFit: "contain" }}
          />
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0a0f1e", marginBottom: 8 }}>
            Crear cuenta gratis
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32, lineHeight: 1.6 }}>
            Empezá a gestionar el mantenimiento de tu empresa.
          </p>

          {success ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, margin: "0 auto 16px",
              }}>✓</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>
                ¡Cuenta creada!
              </p>
              <p style={{ fontSize: 13, color: "#64748b" }}>
                Redirigiendo al dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Nombre completo */}
              <div>
                <label style={labelStyle}>
                  Nombre completo <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Martín García"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>
                  Email <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {/* Empresa (opcional) */}
              <div>
                <label style={labelStyle}>
                  Nombre de empresa{" "}
                  <span style={{ color: "#94a3b8", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej: Ferretería Sur S.A."
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {/* Contraseña */}
              <div>
                <label style={labelStyle}>
                  Contraseña <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label style={labelStyle}>
                  Confirmar contraseña <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí tu contraseña"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {error && (
                <div style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  color: "#dc2626",
                  fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: isSubmitting
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s",
                  letterSpacing: "0.02em",
                  marginTop: 4,
                }}
              >
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta gratis"}
              </button>
            </form>
          )}

          {!success && (
            <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#64748b" }}>
              ¿Ya tenés cuenta?{" "}
              <Link href="/auth/login" style={{ color: "#0ea5e9", fontWeight: 600, textDecoration: "none" }}>
                Ingresar
              </Link>
            </p>
          )}

          <p style={{ textAlign: "center", marginTop: 40, fontSize: 11, color: "#94a3b8" }}>
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
