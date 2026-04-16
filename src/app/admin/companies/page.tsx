// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Company {
  id: string;
  name: string;
  plan: string;
  industry: string | null;
  country: string | null;
  city: string | null;
  cuit: string | null;
  is_active: boolean;
  data_sharing_consent: boolean;
  created_at: string;
  _userCount?: number;
  _assetCount?: number;
  _woCount?: number;
  _locationCount?: number;
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  trial: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  starter: { bg: "rgba(14,165,233,0.12)", text: "#0284c7" },
  pro: { bg: "rgba(139,92,246,0.12)", text: "#7c3aed" },
  enterprise: { bg: "rgba(16,185,129,0.12)", text: "#059669" },
};

const PLANS = ["trial", "starter", "pro", "enterprise"];

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Fetch counts for each company
    const enriched = await Promise.all(
      data.map(async (c) => {
        const [{ count: uc }, { count: ac }, { count: wc }, { count: lc }] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", c.id),
          supabase.from("assets").select("*", { count: "exact", head: true }).eq("company_id", c.id),
          supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("company_id", c.id),
          supabase.from("locations").select("*", { count: "exact", head: true }).eq("company_id", c.id),
        ]);
        return { ...c, _userCount: uc ?? 0, _assetCount: ac ?? 0, _woCount: wc ?? 0, _locationCount: lc ?? 0 };
      })
    );
    setCompanies(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const toggleConsent = async (company: Company) => {
    setToggling(company.id);
    await supabase.from("companies").update({ data_sharing_consent: !company.data_sharing_consent }).eq("id", company.id);
    setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, data_sharing_consent: !c.data_sharing_consent } : c));
    setToggling(null);
  };

  const toggleActive = async (company: Company) => {
    setToggling(company.id + "_active");
    await supabase.from("companies").update({ is_active: !company.is_active }).eq("id", company.id);
    setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, is_active: !c.is_active } : c));
    setToggling(null);
  };

  const updatePlan = async (company: Company, plan: string) => {
    await supabase.from("companies").update({ plan }).eq("id", company.id);
    setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, plan } : c));
    setEditingPlan(null);
  };

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Building2 size={20} color="#0ea5e9" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Empresas</h1>
          </div>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Todas las empresas registradas en Mantix. Podés gestionar planes, consentimiento de datos y estado.
          </p>
        </div>
        <button
          onClick={loadCompanies}
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

      {/* Table */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>
            Cargando empresas...
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>
            No hay empresas registradas todavía.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["Empresa", "Plan", "Usuarios", "Activos", "OTs", "Sucursales", "Datos", "Estado", "Registrada"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((c, i) => {
                  const plan = PLAN_COLORS[c.plan] ?? PLAN_COLORS.trial;
                  return (
                    <tr key={c.id} style={{ borderTop: i === 0 ? "none" : "1px solid #0f172a" }}>
                      {/* Empresa */}
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{c.name}</p>
                        {c.city && <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{c.city}{c.country ? `, ${c.country}` : ""}</p>}
                        {c.cuit && <p style={{ fontSize: 11, color: "#475569" }}>CUIT: {c.cuit}</p>}
                      </td>

                      {/* Plan */}
                      <td style={{ padding: "14px 16px" }}>
                        {editingPlan === c.id ? (
                          <select
                            autoFocus
                            value={c.plan}
                            onChange={(e) => updatePlan(c, e.target.value)}
                            onBlur={() => setEditingPlan(null)}
                            style={{ fontSize: 12, background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "4px 8px" }}
                          >
                            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingPlan(c.id)}
                            style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: plan.bg, color: plan.text, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", title: "Clic para editar" }}
                          >
                            {c.plan}
                          </span>
                        )}
                      </td>

                      {/* Counts */}
                      <td style={{ padding: "14px 16px", fontSize: 14, color: "#94a3b8", textAlign: "center" }}>{c._userCount}</td>
                      <td style={{ padding: "14px 16px", fontSize: 14, color: "#94a3b8", textAlign: "center" }}>{c._assetCount}</td>
                      <td style={{ padding: "14px 16px", fontSize: 14, color: "#94a3b8", textAlign: "center" }}>{c._woCount}</td>
                      <td style={{ padding: "14px 16px", fontSize: 14, color: "#94a3b8", textAlign: "center" }}>{c._locationCount}</td>

                      {/* Consentimiento de datos */}
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => toggleConsent(c)}
                          disabled={toggling === c.id}
                          title={c.data_sharing_consent ? "Deshabilitar acceso a datos" : "Habilitar acceso a datos"}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                            background: c.data_sharing_consent ? "rgba(16,185,129,0.12)" : "rgba(71,85,105,0.2)",
                            color: c.data_sharing_consent ? "#10b981" : "#64748b",
                            opacity: toggling === c.id ? 0.5 : 1,
                          }}
                        >
                          {c.data_sharing_consent ? <Eye size={12} /> : <EyeOff size={12} />}
                          {c.data_sharing_consent ? "Habilitado" : "Privado"}
                        </button>
                      </td>

                      {/* Estado activo */}
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => toggleActive(c)}
                          disabled={toggling === c.id + "_active"}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                            background: c.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                            color: c.is_active ? "#10b981" : "#ef4444",
                            opacity: toggling === c.id + "_active" ? 0.5 : 1,
                          }}
                        >
                          {c.is_active ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {c.is_active ? "Activa" : "Inactiva"}
                        </button>
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                        {new Date(c.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
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
        💡 Clic en el plan para editarlo. El botón &quot;Datos&quot; controla si podés ver información detallada de esa empresa.
      </p>
    </div>
  );
}
