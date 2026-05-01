// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, RefreshCw, CheckCircle2, AlertCircle,
  ShieldCheck, Edit2, KeyRound, Power, PowerOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CreateAdminModal, EditAdminModal, ResetPasswordModal } from "./AdminModals";

interface Admin {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_mantix_admin: boolean;
  is_super_admin: boolean;
  last_login: string | null;
  created_at: string;
  _assignedCompanies?: number;
}

const ROLE_LABEL = (a: Admin) => {
  if (a.is_super_admin) return { label: "Super Admin", bg: "rgba(139,92,246,0.12)", text: "#a78bfa" };
  if (a.is_mantix_admin) return { label: "Admin Mantix", bg: "rgba(14,165,233,0.12)", text: "#0ea5e9" };
  return { label: "Usuario", bg: "rgba(100,116,139,0.12)", text: "#94a3b8" };
};

export function AdminsTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [resetAdmin, setResetAdmin] = useState<Admin | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_active, is_mantix_admin, is_super_admin, last_login, created_at")
      .or("is_mantix_admin.eq.true,is_super_admin.eq.true")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const enriched = await Promise.all(
      data.map(async (a) => {
        const { count } = await supabase
          .from("admin_company_assignments")
          .select("*", { count: "exact", head: true })
          .eq("admin_id", a.id);
        return { ...a, _assignedCompanies: count ?? 0 };
      })
    );
    setAdmins(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (admin: Admin) => {
    if (admin.is_super_admin) { showToast("error", "No se puede desactivar al Super Admin"); return; }
    setToggling(admin.id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !admin.is_active })
      .eq("id", admin.id);
    if (error) { showToast("error", error.message); }
    else {
      showToast("success", admin.is_active ? "Admin desactivado" : "Admin activado");
      setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, is_active: !a.is_active } : a));
    }
    setToggling(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={18} color="#0ea5e9" />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Admins de Mantix</h2>
          <span style={{ fontSize: 12, color: "#64748b", background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: "2px 10px" }}>
            {admins.length}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={BTN_SECONDARY}><RefreshCw size={14} /> Actualizar</button>
          <button onClick={() => setCreateOpen(true)} style={BTN_PRIMARY}><Plus size={14} /> Nuevo Admin</button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: toast.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${toast.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: toast.type === "success" ? "#10b981" : "#ef4444", fontSize: 13 }}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando admins...</div>
        ) : admins.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#475569", fontSize: 14 }}>No hay admins todavia. Crea el primero.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Nombre", "Email", "Rol", "Empresas asig.", "Ultimo acceso", "Estado", "Acciones"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const roleInfo = ROLE_LABEL(admin);
                return (
                  <tr key={admin.id} style={{ borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
                    <td style={TD}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {admin.is_super_admin && <ShieldCheck size={14} color="#a78bfa" />}
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>{admin.full_name}</span>
                      </div>
                    </td>
                    <td style={TD}><span style={{ fontSize: 13, color: "#94a3b8" }}>{admin.email}</span></td>
                    <td style={TD}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: roleInfo.bg, color: roleInfo.text }}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td style={TD}><span style={{ fontSize: 13, color: "#94a3b8" }}>{admin._assignedCompanies ?? 0}</span></td>
                    <td style={TD}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {admin.last_login ? new Date(admin.last_login).toLocaleDateString("es-AR") : "Nunca"}
                      </span>
                    </td>
                    <td style={TD}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: admin.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: admin.is_active ? "#10b981" : "#ef4444" }}>
                        {admin.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={TD}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!admin.is_super_admin && (
                          <button onClick={() => setEditAdmin(admin)} title="Editar" style={ACTION_BTN}><Edit2 size={13} /></button>
                        )}
                        <button onClick={() => setResetAdmin(admin)} title="Resetear contrasena" style={ACTION_BTN}><KeyRound size={13} /></button>
                        {!admin.is_super_admin && (
                          <button
                            onClick={() => toggleActive(admin)}
                            title={admin.is_active ? "Desactivar" : "Activar"}
                            disabled={toggling === admin.id}
                            style={{ ...ACTION_BTN, color: admin.is_active ? "#ef4444" : "#10b981" }}
                          >
                            {admin.is_active ? <PowerOff size={13} /> : <Power size={13} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <CreateAdminModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <EditAdminModal open={!!editAdmin} admin={editAdmin} onClose={() => setEditAdmin(null)} onSaved={load} />
      <ResetPasswordModal open={!!resetAdmin} admin={resetAdmin} onClose={() => setResetAdmin(null)} />
    </div>
  );
}

const TD = { padding: "12px 16px", verticalAlign: "middle" };
const BTN_PRIMARY = { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const BTN_SECONDARY = { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, fontSize: 13, cursor: "pointer" };
const ACTION_BTN = { background: "transparent", border: "1px solid #334155", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" };
