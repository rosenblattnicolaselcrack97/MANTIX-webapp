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
    const t3 = setTimeout(() => onComplete(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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
        transition: "opacity 0.5s ease",
        opacity: phase === "revealing" ? 0 : 1,
        pointerEvents: phase === "revealing" ? "none" : "all",
      }}
    >
      <div style={{ position: "relative", width: 160, height: 160 }}>
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
                ? "translateX(-110px)"
                : phase === "colliding"
                  ? "translateX(0px) scale(1.06)"
                  : "translateX(0px) scale(1)",
            transition:
              phase === "sliding"
                ? "transform 0.9s cubic-bezier(0.34,1.56,0.64,1)"
                : "transform 0.25s ease",
          }}
        >
          <Image
            src="/logos/icon-left.png"
            alt=""
            width={160}
            height={160}
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
                ? "translateX(110px)"
                : phase === "colliding"
                  ? "translateX(0px) scale(1.06)"
                  : "translateX(0px) scale(1)",
            transition:
              phase === "sliding"
                ? "transform 0.9s cubic-bezier(0.34,1.56,0.64,1)"
                : "transform 0.25s ease",
          }}
        >
          <Image
            src="/logos/icon-right.png"
            alt=""
            width={160}
            height={160}
            style={{ objectFit: "cover", objectPosition: "right", marginLeft: "-80px" }}
            priority
          />
        </div>

        {/* Destello de colisión */}
        {phase === "colliding" && (
          <div
            style={{
              position: "absolute",
              inset: -24,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,212,255,0.35) 0%, transparent 70%)",
              animation: "pulse-glow 0.45s ease-out forwards",
            }}
          />
        )}
      </div>

      {/* MANTIX text */}
      <div
        style={{
          marginTop: 22,
          opacity: phase === "sliding" ? 0 : 1,
          transform: phase === "sliding" ? "translateY(8px)" : "translateY(0)",
          transition: "all 0.4s ease 0.15s",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "0.16em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          MANTIX
        </span>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%   { opacity: 0; transform: scale(0.4); }
          50%  { opacity: 1; transform: scale(1.3); }
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

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setTimeout(() => setPageVisible(true), 30);
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
    router.replace("/");
  };

  if (authLoading) return null;

  return (
    <>
      {showAnimation && <LoadingAnimation onComplete={handleAnimationComplete} />}

      <div
        style={{
          opacity: pageVisible ? 1 : 0,
          transition: "opacity 0.45s ease",
          display: "flex",
          minHeight: "100vh",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── Panel izquierdo (marketing) ── */}
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
          <div style={{ position: "absolute", top: -120, right: -120, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,255,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -100, left: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,100,255,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Logo completo */}
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
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", color: "#00b4d8", marginBottom: 18, textTransform: "uppercase" }}>
              Gestión de mantenimiento inteligente
            </p>
            <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.2, marginBottom: 20, maxWidth: 480 }}>
              Convertí el mantenimiento{" "}
              <span style={{ color: "#00b4d8" }}>reactivo</span> en{" "}
              <span style={{ color: "#00d4aa" }}>preventivo</span> y automático
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, maxWidth: 440, marginBottom: 44 }}>
              La primera plataforma que usa WhatsApp como canal nativo para
              comunicarte con tus proveedores — con trazabilidad total de cada interacción.
            </p>

            {/* Value props */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { icon: "⚙️", title: "Centralizá todos tus activos", desc: "Equipos, instalaciones y ciclos de mantenimiento en un solo lugar." },
                { icon: "📋", title: "OTs automáticas, híbridas o manuales", desc: "La plataforma genera órdenes según calendario o tu criterio." },
                { icon: "💬", title: "WhatsApp como canal nativo", desc: "Coordiná proveedores sin salir de la plataforma." },
                { icon: "📊", title: "Trazabilidad total basada en datos", desc: "Detectá sobrecostos y prevenís paradas antes de que ocurran." },
              ].map((item) => (
                <div key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,180,216,0.12)", border: "1px solid rgba(0,180,216,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats footer */}
          <div style={{ marginTop: 44, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", gap: 36 }}>
              {[
                { label: "Empresas activas", value: "6+" },
                { label: "Reducción de costos", value: "~10x" },
                { label: "WhatsApp nativo", value: "✓" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#00b4d8" }}>{stat.value}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{stat.label}</p>
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
          {/* Logo mobile (solo visible en móvil) */}
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

          <div style={{ width: "100%", maxWidth: 360 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0a0f1e", marginBottom: 8 }}>
              Bienvenido de vuelta
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32, lineHeight: 1.6 }}>
              Ingresá a tu cuenta para continuar.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="email" style={labelStyle}>Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div>
                <label htmlFor="password" style={labelStyle}>Contraseña</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {error && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
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
                {isSubmitting ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#64748b" }}>
              ¿No tenés cuenta?{" "}
              <Link href="/auth/signup" style={{ color: "#0ea5e9", fontWeight: 600, textDecoration: "none" }}>
                Registrate gratis
              </Link>
            </p>

            <p style={{ textAlign: "center", marginTop: 40, fontSize: 11, color: "#94a3b8" }}>
              ¿Preguntas?{" "}
              <a href="mailto:rosenblattnicolas@gmail.com" style={{ color: "#0ea5e9", textDecoration: "none" }}>
                rosenblattnicolas@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
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
