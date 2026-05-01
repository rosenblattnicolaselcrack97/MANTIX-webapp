"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

function getFriendlyError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("expired") || normalized.includes("invalid")) {
    return "El enlace es invalido o expiro. Solicita uno nuevo.";
  }
  if (normalized.includes("weak") || normalized.includes("password")) {
    return "La contrasena es demasiado debil. Usa al menos 8 caracteres con mayusculas, minusculas y numeros.";
  }
  return message;
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasRecoverySession(Boolean(data.session));
      setIsCheckingSession(false);
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(getFriendlyError(updateError.message));
      setIsSubmitting(false);
      return;
    }

    setSuccess("Contrasena actualizada correctamente. Te redirigimos al login...");
    setIsSubmitting(false);

    window.setTimeout(() => {
      router.replace("/auth/login");
    }, 1800);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a0f1e 0%, #0d1b3e 55%, #071224 100%)",
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
          maxWidth: 460,
          background: "#f8fafc",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          padding: "30px 26px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>Actualizar contrasena</h1>

        {isCheckingSession ? (
          <p style={{ marginTop: 12, color: "#475569", fontSize: 14 }}>Validando enlace seguro...</p>
        ) : !hasRecoverySession ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ border: "1px solid #fdba74", background: "#fff7ed", color: "#9a3412", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
              El enlace de recuperacion es invalido o ya expiro.
            </div>
            <div style={{ marginTop: 14 }}>
              <Link href="/auth/forgot-password" style={{ color: "#0ea5e9", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
                Solicitar nuevo enlace
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.7, fontSize: 14 }}>
              Define una nueva contrasena para tu cuenta.
            </p>

            <form onSubmit={handleSubmit} style={{ marginTop: 20, display: "grid", gap: 14 }}>
              <div>
                <label htmlFor="password" style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  Nueva contrasena
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 8 caracteres"
                  style={{
                    width: "100%",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "11px 12px",
                    fontSize: 14,
                    color: "#0f172a",
                    outline: "none",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label htmlFor="confirm" style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  Repetir contrasena
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repite tu nueva contrasena"
                  style={{
                    width: "100%",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "11px 12px",
                    fontSize: 14,
                    color: "#0f172a",
                    outline: "none",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error ? (
                <div style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                  {error}
                </div>
              ) : null}

              {success ? (
                <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "Actualizando..." : "Guardar nueva contrasena"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
