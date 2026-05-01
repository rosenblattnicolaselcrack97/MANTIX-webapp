// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle, Plus, Search,
  X, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedCompany } from "@/contexts/SelectedCompanyContext";

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
  _adminName?: string | null;
}

const PLAN_COLORS = {
  trial:      { bg: "rgba(234,179,8,0.12)",    text: "#ca8a04" },
  starter:    { bg: "rgba(14,165,233,0.12)",   text: "#0284c7" },
  pro:        { bg: "rgba(139,92,246,0.12)",   text: "#7c3aed" },
  enterprise: { bg: "rgba(16,185,129,0.12)",   text: "#059669" },
};

const PLANS = ["trial", "starter", "pro", "enterprise"];

// ─── CreateCompanyModal ────────────────────────────────────────────────────────
// Formulario modal para crear una empresa nueva.
// Solo el SuperAdmin puede verlo (el padre condiciona el render con `isSuperAdmin`).
// `onCreated` callback recarga la lista de empresas al crear una nueva.
const EMPTY_CO_FORM = { name: "", industry: "", country: "", city: "", cuit: "", plan: "trial" };

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState(EMPTY_CO_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!form.name.trim()) { setError("El nombre es requerido."); return; }
    setSaving(true);
    setError("");
    // Usar la API route (service_role) para bypassear RLS en la creación de empresas.
    // Esto garantiza que la creación funciona independientemente de las políticas RLS.
    const res = await fetch("/api/admin/create-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:     form.name.trim(),
        industry: form.industry.trim() || null,
        country:  form.country.trim()  || null,
        city:     form.city.trim()     || null,
        cuit:     form.cuit.trim()     || null,
        plan:     form.plan,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Error al crear empresa."); return; }
    onCreated(); // recargar lista
    onClose();
  };

  // Estilos reutilizables dentro del modal
  const inp = { width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
  const lbl = { fontSize: 11, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 5, display: "block" };
  // Helper para vincular un campo del formulario a un input/select
  const f = (k: keyof typeof EMPTY_CO_FORM) => ({ value: form[k], onChange: (e: any) => setForm((p) => ({ ...p, [k]: e.target.value })) });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
        {/* Encabezado del modal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #334155" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Nueva empresa</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          {/* Campo obligatorio */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Nombre *</label>
            <input {...f("name")} placeholder="Ej: Empresa XYZ S.A." style={inp} />
          </div>
          {/* Campos opcionales en grilla 2 columnas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Industria</label><input {...f("industry")} placeholder="Manufactura, Retail..." style={inp} /></div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Plan</label>
              <select {...f("plan")} style={{ ...inp, cursor: "pointer" }}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>País</label><input {...f("country")} placeholder="Argentina" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Ciudad</label><input {...f("city")} placeholder="Buenos Aires" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>CUIT / RUT</label><input {...f("cuit")} placeholder="30-12345678-9" style={inp} /></div>
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving || !form.name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (saving || !form.name.trim()) ? 0.6 : 1 }}>
              {saving ? "Creando..." : "Crear empresa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmDeleteCompanyModal ─────────────────────────────────────────────────
// Modal de confirmación para eliminar una empresa.
// Requiere que el usuario reescriba el nombre exacto para evitar eliminaciones accidentales.
// La eliminación es irreversible (hard delete en la DB).
function ConfirmDeleteCompanyModal({ company, onClose, onDeleted }: { company: Company; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleDelete = async () => {
    if (confirm !== company.name) { setError("El nombre no coincide."); return; }
    setDeleting(true);
    const { error: err } = await supabase.from("companies").delete().eq("id", company.id);
    if (err) { setError("Error al eliminar: " + err.message); setDeleting(false); return; }
    onDeleted(); // recargar lista
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, width: "100%", maxWidth: 460 }}>
        {/* Encabezado en rojo para indicar acción destructiva */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #334155" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#ef4444" }}>Eliminar empresa</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>
            Esta acción es <strong style={{ color: "#ef4444" }}>irreversible</strong>. Se eliminarán todos los datos de{" "}
            <strong style={{ color: "#f1f5f9" }}>{company.name}</strong> incluyendo usuarios, activos, órdenes de trabajo y sucursales.
          </p>
          {/* Confirmación manual: el usuario debe escribir el nombre exacto */}
          <p style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>Escribí el nombre de la empresa para confirmar:</p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={company.name}
            style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" as const, marginBottom: 16 }}
          />
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={handleDelete} disabled={deleting || confirm !== company.name} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (deleting || confirm !== company.name) ? 0.5 : 1 }}>
              {deleting ? "Eliminando..." : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  const { isSuperAdmin, isMantixAdmin, profile } = useAuth();
  const { setSelectedCompany } = useSelectedCompany();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  // create modal: abre el formulario para nueva empresa
  const [createModal, setCreateModal] = useState(false);
  // deleteTarget: empresa seleccionada para eliminar (muestra modal de confirmación)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);

    let query = supabase.from("companies").select("*").order("created_at", { ascending: false });

    // MantixAdmin solo ve sus empresas asignadas
    if (isMantixAdmin && !isSuperAdmin && profile?.id) {
      const { data: assigned } = await supabase
        .from("admin_company_assignments")
        .select("company_id")
        .eq("admin_id", profile.id);
      const ids = (assigned ?? []).map((a) => a.company_id);
      if (ids.length === 0) { setCompanies([]); setLoading(false); return; }
      query = query.in("id", ids);
    } else if (isSuperAdmin) {
      // Excluir empresa interna Mantix del listado
      query = query.neq("industry", "SaaS CMMS");
    }

    const { data } = await query;
    if (!data) { setLoading(false); return; }

    // Enriquecer con conteos y admin asignado
    const enriched = await Promise.all(
      data.map(async (c) => {
        const [{ count: uc }, { count: ac }, { count: wc }, { count: lc }, assignRow] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", c.id),
          supabase.from("assets").select("*", { count: "exact", head: true }).eq("company_id", c.id),
          supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("company_id", c.id),
          supabase.from("locations").select("*", { count: "exact", head: true }).eq("company_id", c.id),
          isSuperAdmin
            ? supabase.from("admin_company_assignments").select("profiles(full_name)").eq("company_id", c.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        return {
          ...c,
          _userCount: uc ?? 0,
          _assetCount: ac ?? 0,
          _woCount: wc ?? 0,
          _locationCount: lc ?? 0,
          _adminName: assignRow?.data?.profiles?.full_name ?? null,
        };
      })
    );
    setCompanies(enriched);
    setLoading(false);
  }, [isSuperAdmin, isMantixAdmin, profile]);

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

  const handleSelectCompany = (c: Company) => {
    setSelectedCompany({ id: c.id, name: c.name, plan: c.plan, is_active: c.is_active });
    router.push(`/admin/companies/${c.id}`);
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* ── Modales ────────────────────────────────────────────────────── */}
      {createModal && (
        <CreateCompanyModal
          onClose={() => setCreateModal(false)}
          onCreated={loadCompanies}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteCompanyModal
          company={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={loadCompanies}
        />
      )}
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Building2 size={20} color="#0ea5e9" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Empresas</h1>
            <span style={{ fontSize: 12, color: "#64748b", background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: "2px 10px" }}>
              {filtered.length}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            {isSuperAdmin ? "Todas las empresas registradas en Mantix." : "Empresas asignadas a tu cuenta."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={loadCompanies} style={BTN_SECONDARY}><RefreshCw size={14} /> Actualizar</button>
          {isSuperAdmin && (
            <button
              onClick={() => setCreateModal(true)}
              style={BTN_PRIMARY}
            >
              <Plus size={14} /> Nueva Empresa
            </button>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 20, maxWidth: 360 }}>
        <Search size={15} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px 10px 38px", fontSize: 13, color: "#f1f5f9", outline: "none", boxSizing: "border-box" }}
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando empresas...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#475569", fontSize: 14 }}>
            {search ? `Sin resultados para "${search}"` : "No hay empresas todavia."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {[
                    "Empresa", "Plan", "Admin asignado", "Usuarios", "Activos", "OTs",
                    ...(isSuperAdmin ? ["Datos", "Estado"] : []),
                    "Registrada", ""
                  ].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const plan = PLAN_COLORS[c.plan] ?? PLAN_COLORS.trial;
                  return (
                    <tr key={c.id} style={{ borderTop: i === 0 ? "none" : "1px solid #0f172a" }}>
                      <td style={TD}>
                        <p style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{c.name}</p>
                        {c.city && <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{c.city}{c.country ? `, ${c.country}` : ""}</p>}
                      </td>
                      <td style={TD}>
                        {isSuperAdmin && editingPlan === c.id ? (
                          <select autoFocus value={c.plan} onChange={(e) => updatePlan(c, e.target.value)} onBlur={() => setEditingPlan(null)} style={{ fontSize: 12, background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "4px 8px" }}>
                            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <span onClick={() => isSuperAdmin && setEditingPlan(c.id)} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: plan.bg, color: plan.text, textTransform: "uppercase", letterSpacing: "0.06em", cursor: isSuperAdmin ? "pointer" : "default" }}>
                            {c.plan}
                          </span>
                        )}
                      </td>
                      <td style={TD}>
                        {c._adminName ? (
                          <span style={{ fontSize: 13, color: "#f1f5f9" }}>{c._adminName}</span>
                        ) : (
                          <span style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>Sin asignar</span>
                        )}
                      </td>
                      <td style={{ ...TD, textAlign: "center" }}><span style={{ fontSize: 14, color: "#94a3b8" }}>{c._userCount}</span></td>
                      <td style={{ ...TD, textAlign: "center" }}><span style={{ fontSize: 14, color: "#94a3b8" }}>{c._assetCount}</span></td>
                      <td style={{ ...TD, textAlign: "center" }}><span style={{ fontSize: 14, color: "#94a3b8" }}>{c._woCount}</span></td>
                      {isSuperAdmin && (
                        <>
                          <td style={TD}>
                            <button onClick={() => toggleConsent(c)} disabled={toggling === c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: c.data_sharing_consent ? "rgba(16,185,129,0.12)" : "rgba(71,85,105,0.2)", color: c.data_sharing_consent ? "#10b981" : "#64748b", opacity: toggling === c.id ? 0.5 : 1 }}>
                              {c.data_sharing_consent ? <Eye size={12} /> : <EyeOff size={12} />}
                              {c.data_sharing_consent ? "Habilitado" : "Privado"}
                            </button>
                          </td>
                          <td style={TD}>
                            <button onClick={() => toggleActive(c)} disabled={toggling === c.id + "_active"} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: c.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: c.is_active ? "#10b981" : "#ef4444", opacity: toggling === c.id + "_active" ? 0.5 : 1 }}>
                              {c.is_active ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                              {c.is_active ? "Activa" : "Inactiva"}
                            </button>
                          </td>
                        </>
                      )}
                      <td style={{ ...TD, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                        {new Date(c.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button onClick={() => handleSelectCompany(c)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #334155", background: "rgba(14,165,233,0.08)", color: "#0ea5e9", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                            Gestionar →
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => setDeleteTarget(c)}
                              title="Eliminar empresa"
                              style={{ display: "flex", alignItems: "center", padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const TD = { padding: "14px 16px", verticalAlign: "middle" };
const BTN_PRIMARY = { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const BTN_SECONDARY = { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, fontSize: 13, cursor: "pointer" };
