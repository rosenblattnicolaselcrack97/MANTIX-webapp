"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/auth/confirm`;
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Ingresa tu email para recuperar la contrasena.");
      return;
    }

    setIsSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setIsSubmitting(false);
      return;
    }

    setSuccess("Te enviamos un enlace para actualizar la contrasena.");
    setIsSubmitting(false);
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
        <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>Recuperar contrasena</h1>
        <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.7, fontSize: 14 }}>
          Ingresa tu email y te enviaremos un enlace seguro para crear una nueva contrasena.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: "grid", gap: 14 }}>
          <div>
            <label htmlFor="email" style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@empresa.com"
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
            {isSubmitting ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 13, color: "#64748b" }}>
          <Link href="/auth/login" style={{ color: "#0ea5e9", textDecoration: "none", fontWeight: 600 }}>
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
