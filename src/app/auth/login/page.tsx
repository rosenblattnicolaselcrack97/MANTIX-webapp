"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

// ─── Animación de carga ───────────────────────────────────────────────────────

function LoadingAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"sliding" | "colliding" | "revealing">("sliding");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("colliding"), 900);
    const t2 = setTimeout(() => setPhase("revealing"), 1500);
    const t3 = setTimeout(() => onComplete(), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0f1e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        transition: "opacity 0.6s ease",
        opacity: phase === "revealing" ? 0 : 1,
      }}
    >
      <div style={{ position: "relative", width: 180, height: 180 }}>
        {/* Mitad izquierda */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "50%",
            height: "100%",
            overflow: "hidden",
            transform:
              phase === "sliding"
                ? "translateX(-120px)"
                : phase === "colliding"
                  ? "translateX(0px) scale(1.08)"
                  : "translateX(0px) scale(1)",
            transition:
              phase === "sliding"
                ? "transform 0.9s cubic-bezier(0.34,1.56,0.64,1)"
                : "transform 0.3s ease",
          }}
        >
          <Image
            src="/logos/icon-left.png"
            alt="Mantix Left"
            width={180}
            height={180}
            style={{ objectFit: "cover", objectPosition: "left" }}
            priority
          />
        </div>

        {/* Mitad derecha */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: "50%",
            height: "100%",
            overflow: "hidden",
            transform:
              phase === "sliding"
                ? "translateX(120px)"
                : phase === "colliding"
                  ? "translateX(0px) scale(1.08)"
                  : "translateX(0px) scale(1)",
            transition:
              phase === "sliding"
                ? "transform 0.9s cubic-bezier(0.34,1.56,0.64,1)"
                : "transform 0.3s ease",
          }}
        >
          <Image
            src="/logos/icon-right.png"
            alt="Mantix Right"
            width={180}
            height={180}
            style={{
              objectFit: "cover",
              objectPosition: "right",
              marginLeft: "-90px",
            }}
            priority
          />
        </div>

        {/* Destello de colisión */}
        {phase === "colliding" && (
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(0,212,255,0.4) 0%, transparent 70%)",
              animation: "pulse-glow 0.4s ease-out forwards",
            }}
          />
        )}
      </div>

      {/* Texto MANTIX bajo el icono */}
      <div
        style={{
          marginTop: 20,
          opacity: phase === "sliding" ? 0 : 1,
          transform: phase === "sliding" ? "translateY(10px)" : "translateY(0)",
          transition: "all 0.4s ease 0.2s",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.15em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          MANTIX
        </span>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%   { opacity: 0; transform: scale(0.5); }
          50%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Página de login ──────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, isLoading: authLoading } = useAuth();

  const [showAnimation, setShowAnimation] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir si ya está logueado
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setTimeout(() => setPageVisible(true), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Completá todos los campos.");
      return;
    }
    setIsSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setIsSubmitting(false);
      return;
    }
    router.replace("/dashboard");
  };

  if (authLoading) return null;

  return (
    <>
      {/* Animación de carga */}
      {showAnimation && <LoadingAnimation onComplete={handleAnimationComplete} />}

      {/* Página principal */}
      <div
        style={{
          opacity: pageVisible ? 1 : 0,
          transition: "opacity 0.5s ease",
          minHeight: "100vh",
          display: "flex",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── Panel izquierdo (marketing) ── */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            padding: "48px 52px",
            position: "relative",
            overflow: "hidden",
          }}
          className="hidden lg:flex"
        >
          {/* Fondo decorativo */}
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,180,255,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -80,
              left: -80,
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,100,255,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56 }}>
            <Image
              src="/logos/icon-white.png"
              alt="Mantix"
              width={44}
              height={44}
              style={{ objectFit: "contain" }}
            />
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.12em" }}>
              MANTIX
            </span>
          </div>

          {/* Headline */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: "#00b4d8",
                marginBottom: 16,
                textTransform: "uppercase",
              }}
            >
              Gestión de mantenimiento inteligente
            </p>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: 24,
                maxWidth: 480,
              }}
            >
              Convertí el mantenimiento{" "}
              <span style={{ color: "#00b4d8" }}>reactivo</span> en{" "}
              <span style={{ color: "#00d4aa" }}>preventivo</span> y automático
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.7,
                maxWidth: 440,
                marginBottom: 40,
              }}
            >
              La primera plataforma que usa WhatsApp como canal nativo para comunicarte
              con tus proveedores — con trazabilidad total de cada interacción.
            </p>

            {/* Value props */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                {
                  icon: "⚙️",
                  title: "Centraliza todos tus activos",
                  desc: "Equipos, instalaciones y ciclos de mantenimiento en un solo lugar.",
                },
                {
                  icon: "📋",
                  title: "Órdenes automáticas, híbridas o manuales",
                  desc: "La plataforma genera OTs según calendario o tu criterio.",
                },
                {
                  icon: "💬",
                  title: "WhatsApp como canal nativo",
                  desc: "Coordina proveedores sin salir de la plataforma.",
                },
                {
                  icon: "📊",
                  title: "Trazabilidad total basada en datos",
                  desc: "Detecta sobrecostos y previene paradas antes de que ocurran.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(0,180,216,0.12)",
                      border: "1px solid rgba(0,180,216,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer marketing */}
          <div
            style={{
              marginTop: 40,
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "flex", gap: 32 }}>
              {[
                { label: "Empresas activas", value: "6+" },
                { label: "Reducción de costos", value: "~10x" },
                { label: "WhatsApp nativo", value: "✓" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#00b4d8" }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Panel derecho (formulario) ── */}
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 40px",
          }}
        >
          {/* Logo mobile */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 36,
            }}
            className="flex lg:hidden"
          >
            <Image
              src="/logos/icon-white.png"
              alt="Mantix"
              width={36}
              height={36}
              style={{ objectFit: "contain", filter: "invert(1)" }}
            />
            <span
              style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.12em", color: "#0a0f1e" }}
            >
              MANTIX
            </span>
          </div>

          <div style={{ width: "100%", maxWidth: 360 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#0a0f1e",
                marginBottom: 8,
              }}
            >
              Bienvenido de vuelta
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>
              Ingresá a tu cuenta para continuar.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    background: "#fff",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    background: "#fff",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
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
                  transition: "all 0.2s",
                  letterSpacing: "0.02em",
                  marginTop: 4,
                }}
              >
                {isSubmitting ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            {/* Link a signup */}
            <p
              style={{
                textAlign: "center",
                marginTop: 24,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              ¿No tenés cuenta?{" "}
              <Link
                href="/auth/signup"
                style={{ color: "#0ea5e9", fontWeight: 600, textDecoration: "none" }}
              >
                Registrate gratis
              </Link>
            </p>

            {/* Contacto */}
            <p
              style={{
                textAlign: "center",
                marginTop: 40,
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              ¿Preguntas?{" "}
              <a
                href="mailto:rosenblattnicolas@gmail.com"
                style={{ color: "#0ea5e9", textDecoration: "none" }}
              >
                rosenblattnicolas@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
