// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Mail,
  Building2,
  Shield,
} from "lucide-react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { supabase } from "@/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  is_super_admin: boolean | null;
  is_mantix_admin: boolean | null;
  company_id: string | null;
  company_name: string | null;
  last_login: string | null;
  created_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  technician: "Técnico",
  supervisor: "Supervisor",
  viewer: "Observador",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:     { bg: "#f0fdf4", text: "#15803d", label: "Activo" },
  inactive:   { bg: "#fef2f2", text: "#dc2626", label: "Inactivo" },
  no_company: { bg: "#fffbeb", text: "#b45309", label: "Sin empresa" },
};

function statusOf(u: UserRow) {
  if (!u.company_id) return "no_company";
  return u.is_active === false ? "inactive" : "active";
}

// ─── Componente principal ─────────────────────────────────────────────────────

function UsersPageInner() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "no_company">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select(`id, full_name, email, role, is_active, is_super_admin, is_mantix_admin, company_id, last_login, created_at, companies(name)`)
        .order("created_at", { ascending: false });
      if (err) throw err;
      setUsers((data ?? []).map((p: any) => ({
        ...p,
        company_name: p.companies?.name ?? null,
      })));
    } catch (e: any) {
      setError(e.message ?? "Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.company_name?.toLowerCase().includes(q);
    const st = statusOf(u);
    return matchesSearch && (statusFilter === "all" || st === statusFilter) && (roleFilter === "all" || u.role === roleFilter);
  });

  const toggleActive = async (user: UserRow) => {
    setActionId(user.id);
    const newVal = user.is_active === false ? true : false;
    const { error: err } = await supabase.from("profiles").update({ is_active: newVal }).eq("id", user.id);
    if (err) alert("Error: " + err.message);
    else setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: newVal } : u));
    setActionId(null);
  };

  const resendInvite = async (user: UserRow) => {
    if (!user.email) return;
    setActionId(user.id);
    try {
      const res = await fetch("/api/admin/resend-invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al reenviar.");
      alert("Invitación reenviada a " + user.email);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Usuarios</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {loading ? "Cargando…" : `${filtered.length} de ${users.length} usuarios`}
          </p>
        </div>
        <button onClick={loadUsers} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Actualizar
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input type="text" placeholder="Buscar por nombre, email o empresa…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, boxSizing: "border-box" }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ padding: "8px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, minWidth: 140 }}>
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="no_company">Sin empresa</option>
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: "8px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, minWidth: 140 }}>
          <option value="all">Todos los roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {["Usuario", "Empresa", "Rol", "Estado", "Último acceso", "Creado", "Acciones"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: 13 }}>Cargando usuarios…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: 13 }}>No se encontraron usuarios con los filtros seleccionados.</td></tr>
            ) : filtered.map((u) => {
              const st = statusOf(u);
              const sc = STATUS_COLORS[st];
              const isActing = actionId === u.id;
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid #1a2a3a" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0f2233", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0ea5e9", flexShrink: 0 }}>
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                          {u.full_name || "—"}
                          {u.is_super_admin && <Shield size={11} color="#f59e0b" title="Super Admin" />}
                          {u.is_mantix_admin && !u.is_super_admin && <Shield size={11} color="#818cf8" title="Mantix Admin" />}
                        </p>
                        <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{u.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {u.company_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Building2 size={12} color="#64748b" />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{u.company_name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>Sin empresa</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#94a3b8" }}>
                    {ROLE_LABELS[u.role ?? ""] ?? u.role ?? "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600 }}>{sc.label}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>{fmt(u.last_login)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>{fmt(u.created_at)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => toggleActive(u)} disabled={isActing}
                        title={u.is_active === false ? "Activar usuario" : "Desactivar usuario"}
                        style={{ padding: "6px", background: "transparent", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", color: u.is_active === false ? "#22c55e" : "#f87171", display: "flex" }}>
                        {u.is_active === false ? <UserCheck size={14} /> : <UserX size={14} />}
                      </button>
                      <button onClick={() => resendInvite(u)} disabled={isActing || !u.email}
                        title="Reenviar invitación"
                        style={{ padding: "6px", background: "transparent", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", color: "#64748b", display: "flex" }}>
                        <Mail size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function UsersPage() {
  return (
    <AdminRoute>
      <UsersPageInner />
    </AdminRoute>
  );
}
