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

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
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
    setTimeout(() => router.replace("/dashboard"), 1500);
  };

  if (authLoading) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 32,
          }}
        >
          <Image
            src="/logos/icon-white.png"
            alt="Mantix"
            width={36}
            height={36}
            style={{ objectFit: "contain", filter: "invert(1) sepia(1) saturate(5) hue-rotate(175deg)" }}
          />
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#0a0f1e",
            }}
          >
            MANTIX
          </span>
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0a0f1e",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          Crear cuenta
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#64748b",
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          Empezá a gestionar el mantenimiento de tu empresa.
        </p>

        {success ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
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

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  color: "#dc2626",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {/* Botón */}
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
                marginTop: 4,
              }}
            >
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta gratis"}
            </button>
          </form>
        )}

        {/* Link a login */}
        {!success && (
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
            ¿Ya tenés cuenta?{" "}
            <Link href="/auth/login" style={{ color: "#0ea5e9", fontWeight: 600, textDecoration: "none" }}>
              Ingresar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

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
