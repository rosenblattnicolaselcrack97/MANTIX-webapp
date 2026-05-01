// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

// ─── CreateAdminModal ─────────────────────────────────────────────────────────

export function CreateAdminModal({ open, onClose, onCreated }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const reset = () => { setEmail(""); setFullName(""); setError(null); setSuccess(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/create-mantix-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), fullName: fullName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Error al crear admin"); return; }
      setSuccess(true);
      setTimeout(() => { onCreated?.(); onClose(); reset(); }, 1500);
    } catch (e) {
      setError("Error inesperado. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={OVERLAY}>
      <div style={MODAL_BOX}>
        <div style={MODAL_HEADER}>
          <h3 style={MODAL_TITLE}>Nuevo Admin de Mantix</h3>
          <button onClick={() => { onClose(); reset(); }} style={CLOSE_BTN}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={LABEL}>Nombre completo</label>
              <input
                style={INPUT}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan García"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label style={LABEL}>Email</label>
              <input
                style={INPUT}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                required
                disabled={loading}
              />
            </div>
          </div>
          {error && (
            <div style={ERROR_BOX}>
              <AlertCircle size={14} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={SUCCESS_BOX}>
              <CheckCircle2 size={14} color="#10b981" />
              <span>Admin creado. Se envio email de invitacion.</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={() => { onClose(); reset(); }} style={SECONDARY_BTN} disabled={loading}>Cancelar</button>
            <button type="submit" style={PRIMARY_BTN} disabled={loading || success}>
              {loading ? "Creando..." : "Crear Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── EditAdminModal ───────────────────────────────────────────────────────────

export function EditAdminModal({ open, admin, onClose, onSaved }) {
  const [fullName, setFullName] = useState(admin?.full_name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (admin) setFullName(admin.full_name); }, [admin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error: err } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", admin.id);
      if (err) { setError(err.message); return; }
      onSaved?.();
      onClose();
    } catch (e) {
      setError("Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !admin) return null;

  return (
    <div style={OVERLAY}>
      <div style={MODAL_BOX}>
        <div style={MODAL_HEADER}>
          <h3 style={MODAL_TITLE}>Editar Admin</h3>
          <button onClick={onClose} style={CLOSE_BTN}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Nombre completo</label>
            <input style={INPUT} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={loading} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Email</label>
            <input style={{ ...INPUT, opacity: 0.6, cursor: "not-allowed" }} type="email" value={admin.email} disabled />
          </div>
          {error && <div style={ERROR_BOX}><AlertCircle size={14} color="#ef4444" /><span>{error}</span></div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={onClose} style={SECONDARY_BTN} disabled={loading}>Cancelar</button>
            <button type="submit" style={PRIMARY_BTN} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ResetPasswordModal ───────────────────────────────────────────────────────

export function ResetPasswordModal({ open, admin, onClose }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reset-admin-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: admin.email }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Error"); return; }
      setSent(true);
    } catch (e) {
      setError("Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setSent(false); setError(null); onClose(); };

  if (!open || !admin) return null;

  return (
    <div style={OVERLAY}>
      <div style={{ ...MODAL_BOX, maxWidth: 400 }}>
        <div style={MODAL_HEADER}>
          <h3 style={MODAL_TITLE}>Resetear contrasena</h3>
          <button onClick={handleClose} style={CLOSE_BTN}><X size={18} /></button>
        </div>
        {sent ? (
          <div style={{ padding: "20px 0" }}>
            <div style={SUCCESS_BOX}><CheckCircle2 size={14} color="#10b981" /><span>Email enviado a {admin.email}</span></div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleClose} style={PRIMARY_BTN}>Cerrar</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>
              Se enviara un email de reset de contrasena a <strong style={{ color: "#f1f5f9" }}>{admin.email}</strong>.
            </p>
            {error && <div style={{ ...ERROR_BOX, marginBottom: 16 }}><AlertCircle size={14} color="#ef4444" /><span>{error}</span></div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={handleClose} style={SECONDARY_BTN}>Cancelar</button>
              <button onClick={handleReset} style={PRIMARY_BTN} disabled={loading}>{loading ? "Enviando..." : "Enviar email"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const OVERLAY = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const MODAL_BOX = { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" };
const MODAL_HEADER = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 };
const MODAL_TITLE = { fontSize: 16, fontWeight: 700, color: "#f1f5f9" };
const CLOSE_BTN = { background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 6, display: "flex" };
const LABEL = { display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 };
const INPUT = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#f1f5f9", outline: "none", boxSizing: "border-box" };
const ERROR_BOX = { display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#ef4444", marginBottom: 12 };
const SUCCESS_BOX = { display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#10b981", marginBottom: 12 };
const PRIMARY_BTN = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const SECONDARY_BTN = { background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" };
