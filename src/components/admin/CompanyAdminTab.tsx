// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { Link2, RefreshCw, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Company {
  id: string;
  name: string;
  plan: string;
  is_active: boolean;
  _adminId?: string | null;
  _adminName?: string | null;
}

interface Admin {
  id: string;
  full_name: string;
  email: string;
}

export function CompanyAdminTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);

    // Cargar empresas (excluir Mantix interna)
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name, plan, is_active")
      .neq("industry", "SaaS CMMS")
      .order("name");

    // Cargar admins de Mantix
    const { data: adminsData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_mantix_admin", true)
      .eq("is_active", true)
      .order("full_name");

    // Cargar asignaciones actuales
    const { data: assignments } = await supabase
      .from("admin_company_assignments")
      .select("admin_id, company_id, profiles(full_name)");

    const assignMap: Record<string, { adminId: string; adminName: string }> = {};
    (assignments ?? []).forEach((a) => {
      assignMap[a.company_id] = { adminId: a.admin_id, adminName: a.profiles?.full_name ?? "" };
    });

    setCompanies(
      (companiesData ?? []).map((c) => ({
        ...c,
        _adminId: assignMap[c.id]?.adminId ?? null,
        _adminName: assignMap[c.id]?.adminName ?? null,
      }))
    );
    setAdmins(adminsData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const close = () => setOpenDropdown(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const assign = async (companyId: string, adminId: string | null, adminName: string | null) => {
    setSaving(companyId);
    setOpenDropdown(null);
    try {
      // Eliminar asignacion previa
      await supabase.from("admin_company_assignments").delete().eq("company_id", companyId);

      if (adminId) {
        const { error } = await supabase.from("admin_company_assignments").insert({
          admin_id: adminId,
          company_id: companyId,
        });
        if (error) throw error;
      }

      setCompanies((prev) =>
        prev.map((c) => c.id === companyId ? { ...c, _adminId: adminId, _adminName: adminName } : c)
      );
      showToast("success", adminId ? `Asignado: ${adminName}` : "Admin removido");
    } catch (e) {
      showToast("error", e.message ?? "Error al asignar");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link2 size={18} color="#0ea5e9" />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Asignaciones Empresa - Admin</h2>
        </div>
        <button onClick={load} style={BTN_SECONDARY}><RefreshCw size={14} /> Actualizar</button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: toast.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${toast.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: toast.type === "success" ? "#10b981" : "#ef4444", fontSize: 13 }}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Info si no hay admins */}
      {!loading && admins.length === 0 && (
        <div style={{ padding: "14px 16px", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 8, fontSize: 13, color: "#ca8a04", marginBottom: 16 }}>
          No hay Admins de Mantix activos. Crea uno en la pestana "Admins" primero.
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando...</div>
        ) : companies.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#475569", fontSize: 14 }}>No hay empresas cliente todavia.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Empresa", "Plan", "Admin asignado", "Accion"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const planInfo = PLAN_COLORS[company.plan] ?? PLAN_COLORS.trial;
                const isSaving = saving === company.id;
                const isOpen = openDropdown === company.id;

                return (
                  <tr key={company.id} style={{ borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
                    <td style={TD}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>{company.name}</span>
                        {!company.is_active && <span style={{ fontSize: 11, color: "#ef4444", marginLeft: 8 }}>Inactiva</span>}
                      </div>
                    </td>
                    <td style={TD}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: planInfo.bg, color: planInfo.text }}>
                        {company.plan}
                      </span>
                    </td>
                    <td style={TD}>
                      {company._adminName ? (
                        <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{company._adminName}</span>
                      ) : (
                        <span style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>Sin asignar</span>
                      )}
                    </td>
                    <td style={TD}>
                      {isSaving ? (
                        <span style={{ fontSize: 13, color: "#64748b" }}>Guardando...</span>
                      ) : (
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(isOpen ? null : company.id); }}
                            style={BTN_DROPDOWN}
                            disabled={admins.length === 0}
                          >
                            {company._adminName ? "Cambiar" : "Asignar"}
                            <ChevronDown size={12} />
                          </button>
                          {isOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, minWidth: 200, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                            >
                              {company._adminName && (
                                <button onClick={() => assign(company.id, null, null)} style={DROPDOWN_ITEM_RED}>
                                  Sin admin (remover)
                                </button>
                              )}
                              {admins.map((admin) => (
                                <button
                                  key={admin.id}
                                  onClick={() => assign(company.id, admin.id, admin.full_name)}
                                  style={{ ...DROPDOWN_ITEM, background: company._adminId === admin.id ? "rgba(14,165,233,0.1)" : "transparent", color: company._adminId === admin.id ? "#0ea5e9" : "#f1f5f9" }}
                                >
                                  {admin.full_name}
                                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>{admin.email}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const TD = { padding: "12px 16px", verticalAlign: "middle" };
const BTN_SECONDARY = { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, fontSize: 13, cursor: "pointer" };
const BTN_DROPDOWN = { display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "transparent", color: "#0ea5e9", border: "1px solid rgba(14,165,233,0.3)", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 };
const DROPDOWN_ITEM = { display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, transition: "background 0.1s" };
const DROPDOWN_ITEM_RED = { display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid #334155", cursor: "pointer", fontSize: 13, color: "#ef4444" };
const PLAN_COLORS = {
  trial: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  starter: { bg: "rgba(14,165,233,0.12)", text: "#0284c7" },
  pro: { bg: "rgba(139,92,246,0.12)", text: "#7c3aed" },
  enterprise: { bg: "rgba(16,185,129,0.12)", text: "#059669" },
};
