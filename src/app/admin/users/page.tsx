// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
  company_id: string | null;
  _companyName?: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: "rgba(14,165,233,0.12)", text: "#0ea5e9" },
  manager: { bg: "rgba(139,92,246,0.12)", text: "#8b5cf6" },
  technician: { bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  viewer: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
};

const ROLES = ["admin", "manager", "technician", "viewer"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profiles) { setLoading(false); return; }

    // Fetch company names
    const companyIds = [...new Set(profiles.map((p) => p.company_id).filter(Boolean))];
    const { data: companies } = companyIds.length > 0
      ? await supabase.from("companies").select("id, name").in("id", companyIds)
      : { data: [] };

    const companyMap: Record<string, string> = {};
    (companies ?? []).forEach((c) => { companyMap[c.id] = c.name; });

    setUsers(profiles.map((p) => ({ ...p, _companyName: p.company_id ? companyMap[p.company_id] : undefined })));
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleActive = async (user: UserRow) => {
    setToggling(user.id);
    await supabase.from("profiles").update({ is_active: !user.is_active }).eq("id", user.id);
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    setToggling(null);
  };

  const updateRole = async (user: UserRow, role: string) => {
    await supabase.from("profiles").update({ role }).eq("id", user.id);
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role } : u));
    setEditingRole(null);
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u._companyName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Users size={20} color="#8b5cf6" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Usuarios</h1>
          </div>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Todos los usuarios registrados. Podés cambiar roles y habilitar/deshabilitar acceso.
          </p>
        </div>
        <button
          onClick={loadUsers}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 16px", borderRadius: 8, border: "1px solid #334155",
            background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13,
          }}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Buscar por nombre, email o empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "9px 14px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#f1f5f9",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>
            Cargando usuarios...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>
            {search ? "Sin resultados para la búsqueda." : "No hay usuarios registrados todavía."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["Usuario", "Empresa", "Rol", "Estado", "Registrado"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const roleColor = ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer;
                  return (
                    <tr key={u.id} style={{ borderTop: i === 0 ? "none" : "1px solid #0f172a" }}>
                      {/* Usuario */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
                          }}>
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <p style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{u.full_name}</p>
                              {u.is_super_admin && <ShieldCheck size={13} color="#0ea5e9" title="Super Admin" />}
                            </div>
                            <p style={{ fontSize: 12, color: "#475569" }}>{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Empresa */}
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>
                        {u._companyName ?? <span style={{ color: "#334155", fontStyle: "italic" }}>Sin empresa</span>}
                      </td>

                      {/* Rol */}
                      <td style={{ padding: "14px 16px" }}>
                        {editingRole === u.id ? (
                          <select
                            autoFocus
                            value={u.role}
                            onChange={(e) => updateRole(u, e.target.value)}
                            onBlur={() => setEditingRole(null)}
                            style={{ fontSize: 12, background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "4px 8px" }}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span
                            onClick={() => !u.is_super_admin && setEditingRole(u.id)}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                              background: roleColor.bg, color: roleColor.text,
                              textTransform: "uppercase", letterSpacing: "0.06em",
                              cursor: u.is_super_admin ? "default" : "pointer",
                            }}
                          >
                            {u.is_super_admin ? "super admin" : u.role}
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => !u.is_super_admin && toggleActive(u)}
                          disabled={toggling === u.id || u.is_super_admin}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "5px 10px", borderRadius: 6, border: "none",
                            cursor: u.is_super_admin ? "default" : "pointer",
                            fontSize: 12, fontWeight: 600,
                            background: u.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                            color: u.is_active ? "#10b981" : "#ef4444",
                            opacity: toggling === u.id ? 0.5 : 1,
                          }}
                        >
                          {u.is_active ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {u.is_active ? "Activo" : "Inactivo"}
                        </button>
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                        {new Date(u.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#334155", marginTop: 12 }}>
        💡 Clic en el rol para editarlo. Los super admins no pueden ser deshabilitados.
      </p>
    </div>
  );
}
