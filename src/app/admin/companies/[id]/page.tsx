// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Building2, Users, Package, ClipboardList, MapPin,
  Edit2, Save, X, CheckCircle2, AlertCircle, Plus, Trash2, Truck, Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedCompany } from "@/contexts/SelectedCompanyContext";
import { AdminInfoCard } from "@/components/admin/AdminInfoCard";
import { CSVImportExport } from "@/components/admin/CSVImportExport";

// ─── Types ───────────────────────────────────────────────────────────────────
interface CompanyRow {
  id: string; name: string; industry: string | null; cuit: string | null;
  country: string | null; city: string | null; plan: string;
  is_active: boolean; data_sharing_consent: boolean; created_at: string;
}
interface UserRow {
  id: string; full_name: string; email: string; role: string;
  phone: string | null; is_active: boolean; created_at: string;
}
interface LocationRow {
  id: string; name: string; address: string | null; city: string | null;
  description: string | null; is_active: boolean; created_at: string;
}
interface AssetRow {
  id: string; name: string; category: string | null; subcategory: string | null;
  internal_code: string | null; manufacturer: string | null; model: string | null;
  serial_number: string | null; status: string; criticality: string;
  location_id: string | null; notes: string | null;
  _locationName?: string; created_at: string;
}
interface WorkOrderRow {
  id: string; title: string; description: string | null; type: string;
  priority: string; status: string; asset_id: string | null;
  location_id: string | null; estimated_cost: number | null;
  due_date: string | null; notes: string | null;
  _assetName?: string; created_at: string;
}
interface ProviderRow {
  id: string; name: string; category: string | null; contact_name: string | null;
  phone: string | null; whatsapp: string | null; email: string | null;
  rating: number; total_jobs: number; notes: string | null; is_active: boolean;
  created_at: string;
}
type Tab = "overview" | "users" | "assets" | "workorders" | "locations" | "providers";

// ─── Constants ───────────────────────────────────────────────────────────────
const PLANS = ["trial", "starter", "pro", "enterprise"];
const ROLES = ["admin", "manager", "technician", "viewer"];
const ASSET_STATUSES = ["operative", "critical", "review", "inactive"];
const ASSET_CRITICALITIES = ["low", "medium", "high", "critical"];
const ASSET_CATEGORIES = ["Climatización", "Eléctrica", "Mecánica", "Hidráulica", "IT", "Seguridad", "Infraestructura", "Otro"];
const WO_TYPES = ["corrective", "preventive", "predictive", "emergency"];
const WO_PRIORITIES = ["low", "normal", "high", "urgent"];
const WO_STATUSES = ["pending", "open", "in_progress", "scheduled", "completed", "blocked", "cancelled"];
const PROVIDER_CATEGORIES = ["Eléctrica", "Mecánica", "HVAC", "Plomería", "IT", "Seguridad", "Civil", "Limpieza", "Otro"];

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  trial: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  starter: { bg: "rgba(14,165,233,0.12)", text: "#0284c7" },
  pro: { bg: "rgba(139,92,246,0.12)", text: "#7c3aed" },
  enterprise: { bg: "rgba(16,185,129,0.12)", text: "#059669" },
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  operative: { bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  critical: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
  review: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  inactive: { bg: "rgba(100,116,139,0.12)", text: "#64748b" },
  pending: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  open: { bg: "rgba(14,165,233,0.12)", text: "#0ea5e9" },
  in_progress: { bg: "rgba(139,92,246,0.12)", text: "#8b5cf6" },
  scheduled: { bg: "rgba(14,165,233,0.12)", text: "#0ea5e9" },
  completed: { bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  blocked: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
  cancelled: { bg: "rgba(100,116,139,0.12)", text: "#64748b" },
};
const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "rgba(100,116,139,0.12)", text: "#64748b" },
  medium: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  normal: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  high: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
  urgent: { bg: "rgba(239,68,68,0.2)", text: "#dc2626" },
  critical: { bg: "rgba(239,68,68,0.2)", text: "#dc2626" },
};
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: "rgba(14,165,233,0.12)", text: "#0ea5e9" },
  manager: { bg: "rgba(139,92,246,0.12)", text: "#8b5cf6" },
  technician: { bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  viewer: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
};

// ─── Shared button styles ─────────────────────────────────────────────────────
const BTN_ICON = { background: "rgba(255,255,255,0.04)", border: "1px solid #334155", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" };
const BTN_SECONDARY_SM = { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 12 };
const BTN_DANGER_SM = { display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: 12 };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: colors.bg, color: colors.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {label}
    </span>
  );
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #334155" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{title}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Form field helpers ───────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
const labelStyle = { fontSize: 11, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 5, display: "block" };
const selectStyle = { ...inputStyle, cursor: "pointer" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>{children}</div>;
}

function ConfirmDelete({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <Modal title="Confirmar eliminación" onClose={onCancel}>
      <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
        ¿Eliminar <strong style={{ color: "#f1f5f9" }}>{name}</strong>? Esta acción no se puede deshacer.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
        <button onClick={onConfirm} disabled={loading} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Tab: Overview ───────────────────────────────────────────────────────────
function OverviewTab({ company, onSave }: { company: CompanyRow; onSave: (u: Partial<CompanyRow>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: company.name, industry: company.industry ?? "", cuit: company.cuit ?? "", country: company.country ?? "", city: company.city ?? "", plan: company.plan });

  const handleSave = async () => {
    setSaving(true);
    await onSave({ name: form.name.trim() || company.name, industry: form.industry.trim() || null, cuit: form.cuit.trim() || null, country: form.country.trim() || null, city: form.city.trim() || null, plan: form.plan });
    setSaving(false); setEditing(false);
  };

  const field = (lbl: string, key: keyof typeof form, type: "text" | "select" = "text") => (
    <div key={lbl}>
      <p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{lbl}</p>
      {editing ? (
        type === "select"
          ? <select value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13 }}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
          : <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      ) : (
        <p style={{ fontSize: 14, color: form[key] ? "#e2e8f0" : "#334155", fontStyle: form[key] ? "normal" : "italic" }}>{form[key] || "—"}</p>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 8 }}>
        {editing ? (
          <>
            <button onClick={() => setEditing(false)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}><X size={14} /> Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}><Save size={14} />{saving ? "Guardando..." : "Guardar"}</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}><Edit2 size={14} /> Editar empresa</button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
        {field("Nombre", "name")}{field("Industria", "industry")}{field("Plan", "plan", "select")}{field("CUIT", "cuit")}{field("País", "country")}{field("Ciudad", "city")}
      </div>
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #1e293b", display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div><p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Estado</p><Badge label={company.is_active ? "Activa" : "Inactiva"} colors={company.is_active ? { bg: "rgba(16,185,129,0.12)", text: "#10b981" } : { bg: "rgba(239,68,68,0.12)", text: "#ef4444" }} /></div>
        <div><p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Datos</p><Badge label={company.data_sharing_consent ? "Compartidos" : "Privados"} colors={company.data_sharing_consent ? { bg: "rgba(16,185,129,0.12)", text: "#10b981" } : { bg: "rgba(100,116,139,0.12)", text: "#64748b" }} /></div>
        <div><p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Creada</p><p style={{ fontSize: 13, color: "#94a3b8" }}>{fmtDate(company.created_at)}</p></div>
      </div>
    </div>
  );
}

// ─── Tab: Users ───────────────────────────────────────────────────────────────
const EMPTY_USER = { full_name: "", email: "", role: "technician", phone: "" };

function UsersTab({ companyId }: { companyId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "create" | "edit">(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState(EMPTY_USER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_USER); setError(""); setModal("create"); };
  const openEdit = (u: UserRow) => { setEditing(u); setForm({ full_name: u.full_name, email: u.email, role: u.role, phone: u.phone ?? "" }); setError(""); setModal("edit"); };

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { setError("Nombre y email son requeridos."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/admin/create-company-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, company_id: companyId }) });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Error al crear usuario."); return; }
    setModal(null); load();
  };

  const handleEdit = async () => {
    if (!editing || !form.full_name.trim()) { setError("El nombre es requerido."); return; }
    setSaving(true); setError("");
    await supabase.from("profiles").update({ full_name: form.full_name.trim(), role: form.role, phone: form.phone.trim() || null }).eq("id", editing.id);
    setSaving(false); setModal(null); setEditing(null); load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("profiles").update({ is_active: false, company_id: null }).eq("id", deleteTarget.id);
    setDeleting(false); setDeleteTarget(null); load();
  };

  const toggleActive = async (u: UserRow) => {
    setToggling(u.id);
    await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
    setToggling(null);
  };

  const f = (key: keyof typeof form) => ({ value: form[key], onChange: (e: any) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  return (
    <>
      {modal && (
        <Modal title={modal === "create" ? "Nuevo usuario" : "Editar usuario"} onClose={() => setModal(null)}>
          <Field label="Nombre completo"><input {...f("full_name")} placeholder="Ej: Juan Pérez" style={inputStyle} /></Field>
          {modal === "create" && <Field label="Email"><input {...f("email")} type="email" placeholder="juan@empresa.com" style={inputStyle} /></Field>}
          {modal === "edit" && <Field label="Email"><input value={form.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} /></Field>}
          <FormGrid>
            <Field label="Rol">
              <select {...f("role")} style={selectStyle}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Teléfono"><input {...f("phone")} placeholder="+54 11 1234-5678" style={inputStyle} /></Field>
          </FormGrid>
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {modal === "create" && <p style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>Se enviará un email de invitación para que el usuario configure su contraseña.</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={modal === "create" ? handleCreate : handleEdit} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Guardando..." : modal === "create" ? "Enviar invitación" : "Guardar cambios"}
            </button>
          </div>
        </Modal>
      )}
      {deleteTarget && <ConfirmDelete name={deleteTarget.full_name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#475569" }}>{users.length} usuario{users.length !== 1 ? "s" : ""}</p>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Nuevo usuario</button>
      </div>

      {loading ? <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando...</div> : users.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <Users size={36} color="#1e293b" style={{ marginBottom: 12 }} />
          <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>No hay usuarios todavía.</p>
          <button onClick={openCreate} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Crear primer usuario</button>
        </div>
      ) : (
        <div style={{ background: "#0f172a", borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Usuario", "Rol", "Teléfono", "Estado", "Acciones"].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #1e293b" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer;
                return (
                  <tr key={u.id} style={{ borderTop: i === 0 ? "none" : "1px solid #1e293b" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#0ea5e9,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{u.full_name.charAt(0).toUpperCase()}</div>
                        <div>
                          <p style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{u.full_name}</p>
                          <p style={{ fontSize: 12, color: "#475569" }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}><Badge label={u.role} colors={rc} /></td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{u.phone ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button onClick={() => toggleActive(u)} disabled={toggling === u.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: u.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: u.is_active ? "#10b981" : "#ef4444" }}>
                        {u.is_active ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}{u.is_active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(u)} title="Editar" style={BTN_ICON}><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteTarget(u)} title="Eliminar" style={{ ...BTN_ICON, color: "#ef4444" }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Tab: Locations ───────────────────────────────────────────────────────────
const EMPTY_LOCATION = { name: "", address: "", city: "", description: "", is_active: true };

function LocationsTab({ companyId }: { companyId: string }) {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "create" | "edit">(null);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [form, setForm] = useState<typeof EMPTY_LOCATION>(EMPTY_LOCATION);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LocationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("locations").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setLocations(data ?? []);
    setLoading(false);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_LOCATION); setModal("create"); };
  const openEdit = (l: LocationRow) => { setEditing(l); setForm({ name: l.name, address: l.address ?? "", city: l.city ?? "", description: l.description ?? "", is_active: l.is_active }); setModal("edit"); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (modal === "create") {
      await supabase.from("locations").insert({ company_id: companyId, name: form.name.trim(), address: form.address.trim() || null, city: form.city.trim() || null, description: form.description.trim() || null, is_active: form.is_active });
    } else if (editing) {
      await supabase.from("locations").update({ name: form.name.trim(), address: form.address.trim() || null, city: form.city.trim() || null, description: form.description.trim() || null, is_active: form.is_active }).eq("id", editing.id);
    }
    setSaving(false); setModal(null); setEditing(null); load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("locations").delete().eq("id", deleteTarget.id);
    setDeleting(false); setDeleteTarget(null); load();
  };

  const f = (key: keyof typeof form) => ({ value: form[key] as string, onChange: (e: any) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  return (
    <>
      {modal && (
        <Modal title={modal === "create" ? "Nueva sucursal" : "Editar sucursal"} onClose={() => setModal(null)}>
          <Field label="Nombre *"><input {...f("name")} placeholder="Ej: Local Palermo" style={inputStyle} /></Field>
          <FormGrid>
            <Field label="Dirección"><input {...f("address")} placeholder="Av. Santa Fe 1234" style={inputStyle} /></Field>
            <Field label="Ciudad"><input {...f("city")} placeholder="Buenos Aires" style={inputStyle} /></Field>
          </FormGrid>
          <Field label="Descripción"><textarea {...f("description")} placeholder="Descripción opcional..." rows={2} style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <Field label="Estado">
            <select value={form.is_active ? "active" : "inactive"} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === "active" }))} style={selectStyle}>
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (saving || !form.name.trim()) ? 0.6 : 1 }}>
              {saving ? "Guardando..." : modal === "create" ? "Crear sucursal" : "Guardar cambios"}
            </button>
          </div>
        </Modal>
      )}
      {deleteTarget && <ConfirmDelete name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#475569" }}>{locations.length} sucursal{locations.length !== 1 ? "es" : ""}</p>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Nueva sucursal</button>
      </div>

      {loading ? <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando...</div> : locations.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <MapPin size={36} color="#1e293b" style={{ marginBottom: 12 }} />
          <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>No hay sucursales todavía.</p>
          <button onClick={openCreate} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Crear primera sucursal</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {locations.map((l) => (
            <div key={l.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{l.name}</p>
                  {l.address && <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{l.address}</p>}
                  {l.city && <p style={{ fontSize: 12, color: "#64748b" }}>{l.city}</p>}
                  {l.description && <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{l.description}</p>}
                </div>
                <Badge label={l.is_active ? "Activa" : "Inactiva"} colors={l.is_active ? { bg: "rgba(16,185,129,0.12)", text: "#10b981" } : { bg: "rgba(239,68,68,0.12)", text: "#ef4444" }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #1e293b" }}>
                <button onClick={() => openEdit(l)} style={{ ...BTN_SECONDARY_SM, flex: 1 }}><Edit2 size={12} /> Editar</button>
                <button onClick={() => setDeleteTarget(l)} style={{ ...BTN_DANGER_SM }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Tab: Assets ──────────────────────────────────────────────────────────────
const EMPTY_ASSET = { name: "", internal_code: "", category: "", subcategory: "", manufacturer: "", model: "", serial_number: "", status: "operative", criticality: "medium", location_id: "", notes: "" };

function AssetsTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "create" | "edit">(null);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [form, setForm] = useState<typeof EMPTY_ASSET>(EMPTY_ASSET);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: locs }] = await Promise.all([
      supabase.from("assets").select("id, name, category, subcategory, internal_code, manufacturer, model, serial_number, status, criticality, location_id, notes, created_at").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("locations").select("id, name").eq("company_id", companyId).eq("is_active", true),
    ]);
    setLocations(locs ?? []);
    const locMap: Record<string, string> = {};
    (locs ?? []).forEach((l) => { locMap[l.id] = l.name; });
    setAssets((data ?? []).map((a) => ({ ...a, _locationName: a.location_id ? locMap[a.location_id] : undefined })));
    setLoading(false);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_ASSET); setModal("create"); };
  const openEdit = (a: AssetRow) => {
    setEditing(a);
    setForm({ name: a.name, internal_code: a.internal_code ?? "", category: a.category ?? "", subcategory: a.subcategory ?? "", manufacturer: a.manufacturer ?? "", model: a.model ?? "", serial_number: a.serial_number ?? "", status: a.status, criticality: a.criticality, location_id: a.location_id ?? "", notes: a.notes ?? "" });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { company_id: companyId, name: form.name.trim(), internal_code: form.internal_code.trim() || null, category: form.category.trim() || null, subcategory: form.subcategory.trim() || null, manufacturer: form.manufacturer.trim() || null, model: form.model.trim() || null, serial_number: form.serial_number.trim() || null, status: form.status, criticality: form.criticality, location_id: form.location_id || null, notes: form.notes.trim() || null };
    if (modal === "create") await supabase.from("assets").insert(payload);
    else if (editing) await supabase.from("assets").update(payload).eq("id", editing.id);
    setSaving(false); setModal(null); setEditing(null); load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("assets").delete().eq("id", deleteTarget.id);
    setDeleting(false); setDeleteTarget(null); load();
  };

  const f = (key: keyof typeof form) => ({ value: form[key], onChange: (e: any) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  return (
    <>
      {modal && (
        <Modal title={modal === "create" ? "Nuevo activo" : "Editar activo"} onClose={() => setModal(null)}>
          <Field label="Nombre *"><input {...f("name")} placeholder="Ej: Aire acondicionado piso 2" style={inputStyle} /></Field>
          <FormGrid>
            <Field label="Código interno"><input {...f("internal_code")} placeholder="AC-001" style={inputStyle} /></Field>
            <Field label="Categoría">
              <select {...f("category")} style={selectStyle}>
                <option value="">Sin categoría</option>
                {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Fabricante"><input {...f("manufacturer")} placeholder="Carrier, Trane..." style={inputStyle} /></Field>
            <Field label="Modelo"><input {...f("model")} placeholder="XR15" style={inputStyle} /></Field>
            <Field label="N° de serie"><input {...f("serial_number")} placeholder="SN-123456" style={inputStyle} /></Field>
            <Field label="Sucursal">
              <select {...f("location_id")} style={selectStyle}>
                <option value="">Sin asignar</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select {...f("status")} style={selectStyle}>
                {ASSET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Criticidad">
              <select {...f("criticality")} style={selectStyle}>
                {ASSET_CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </FormGrid>
          <Field label="Notas"><textarea {...f("notes")} rows={2} placeholder="Notas adicionales..." style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (saving || !form.name.trim()) ? 0.6 : 1 }}>
              {saving ? "Guardando..." : modal === "create" ? "Crear activo" : "Guardar cambios"}
            </button>
          </div>
        </Modal>
      )}
      {deleteTarget && <ConfirmDelete name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: 13, color: "#475569" }}>{assets.length} activo{assets.length !== 1 ? "s" : ""}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <CSVImportExport companyId={companyId} companyName={companyName} importType="activos" onImportComplete={load} />
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Nuevo activo</button>
        </div>
      </div>

      {loading ? <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando...</div> : assets.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <Package size={36} color="#1e293b" style={{ marginBottom: 12 }} />
          <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>No hay activos registrados.</p>
          <button onClick={openCreate} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Registrar primer activo</button>
        </div>
      ) : (
        <div style={{ background: "#0f172a", borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>{["Activo", "Categoría / Ubicación", "Estado", "Criticidad", ""].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #1e293b" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {assets.map((a, i) => (
                <tr key={a.id} style={{ borderTop: i === 0 ? "none" : "1px solid #1e293b" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{a.name}</p>
                    {a.internal_code && <p style={{ fontSize: 11, color: "#475569" }}>#{a.internal_code}</p>}
                    {a.manufacturer && <p style={{ fontSize: 11, color: "#334155" }}>{a.manufacturer}{a.model ? ` · ${a.model}` : ""}</p>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {a.category && <p style={{ fontSize: 13, color: "#94a3b8" }}>{a.category}</p>}
                    {a._locationName && <p style={{ fontSize: 12, color: "#475569" }}>{a._locationName}</p>}
                    {!a.category && !a._locationName && <p style={{ fontSize: 13, color: "#334155" }}>—</p>}
                  </td>
                  <td style={{ padding: "12px 16px" }}><Badge label={a.status} colors={STATUS_COLORS[a.status] ?? STATUS_COLORS.inactive} /></td>
                  <td style={{ padding: "12px 16px" }}><Badge label={a.criticality} colors={PRIORITY_COLORS[a.criticality] ?? PRIORITY_COLORS.low} /></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(a)} title="Editar" style={BTN_ICON}><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteTarget(a)} title="Eliminar" style={{ ...BTN_ICON, color: "#ef4444" }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Tab: Work Orders ─────────────────────────────────────────────────────────
const EMPTY_WO = { title: "", description: "", type: "corrective", priority: "normal", status: "pending", asset_id: "", location_id: "", estimated_cost: "", due_date: "", notes: "" };

function WorkOrdersTab({ companyId }: { companyId: string }) {
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "create" | "edit">(null);
  const [editing, setEditing] = useState<WorkOrderRow | null>(null);
  const [form, setForm] = useState<typeof EMPTY_WO>(EMPTY_WO);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrderRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: wos }, { data: assetList }, { data: locList }] = await Promise.all([
      supabase.from("work_orders").select("id, title, description, type, priority, status, asset_id, location_id, estimated_cost, due_date, notes, created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100),
      supabase.from("assets").select("id, name").eq("company_id", companyId),
      supabase.from("locations").select("id, name").eq("company_id", companyId),
    ]);
    setAssets(assetList ?? []);
    setLocations(locList ?? []);
    const assetMap: Record<string, string> = {};
    (assetList ?? []).forEach((a) => { assetMap[a.id] = a.name; });
    setOrders((wos ?? []).map((w) => ({ ...w, _assetName: w.asset_id ? assetMap[w.asset_id] : undefined })));
    setLoading(false);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_WO); setModal("create"); };
  const openEdit = (w: WorkOrderRow) => {
    setEditing(w);
    setForm({ title: w.title, description: w.description ?? "", type: w.type, priority: w.priority, status: w.status, asset_id: w.asset_id ?? "", location_id: w.location_id ?? "", estimated_cost: w.estimated_cost ? String(w.estimated_cost) : "", due_date: w.due_date ? w.due_date.substring(0, 10) : "", notes: w.notes ?? "" });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { company_id: companyId, title: form.title.trim(), description: form.description.trim() || null, type: form.type, priority: form.priority, status: form.status, asset_id: form.asset_id || null, location_id: form.location_id || null, estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null, due_date: form.due_date || null, notes: form.notes.trim() || null };
    if (modal === "create") await supabase.from("work_orders").insert(payload);
    else if (editing) await supabase.from("work_orders").update(payload).eq("id", editing.id);
    setSaving(false); setModal(null); setEditing(null); load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("work_orders").delete().eq("id", deleteTarget.id);
    setDeleting(false); setDeleteTarget(null); load();
  };

  const f = (key: keyof typeof form) => ({ value: form[key], onChange: (e: any) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  return (
    <>
      {modal && (
        <Modal title={modal === "create" ? "Nueva orden de trabajo" : "Editar orden de trabajo"} onClose={() => setModal(null)}>
          <Field label="Título *"><input {...f("title")} placeholder="Ej: Reparación de aire acondicionado" style={inputStyle} /></Field>
          <Field label="Descripción"><textarea {...f("description")} rows={2} placeholder="Detalles de la tarea..." style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <FormGrid>
            <Field label="Tipo">
              <select {...f("type")} style={selectStyle}>
                {WO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Prioridad">
              <select {...f("priority")} style={selectStyle}>
                {WO_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select {...f("status")} style={selectStyle}>
                {WO_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Activo">
              <select {...f("asset_id")} style={selectStyle}>
                <option value="">Sin activo</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Sucursal">
              <select {...f("location_id")} style={selectStyle}>
                <option value="">Sin sucursal</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Costo estimado ($)"><input {...f("estimated_cost")} type="number" placeholder="0.00" style={inputStyle} /></Field>
            <Field label="Fecha límite"><input {...f("due_date")} type="date" style={inputStyle} /></Field>
          </FormGrid>
          <Field label="Notas"><textarea {...f("notes")} rows={2} placeholder="Notas internas..." style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (saving || !form.title.trim()) ? 0.6 : 1 }}>
              {saving ? "Guardando..." : modal === "create" ? "Crear OT" : "Guardar cambios"}
            </button>
          </div>
        </Modal>
      )}
      {deleteTarget && <ConfirmDelete name={deleteTarget.title} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#475569" }}>{orders.length} orden{orders.length !== 1 ? "es" : ""}</p>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Nueva OT</button>
      </div>

      {loading ? <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando...</div> : orders.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <ClipboardList size={36} color="#1e293b" style={{ marginBottom: 12 }} />
          <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>No hay órdenes de trabajo todavía.</p>
          <button onClick={openCreate} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Crear primera OT</button>
        </div>
      ) : (
        <div style={{ background: "#0f172a", borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>{["Título", "Tipo / Activo", "Estado", "Prioridad", "Vence", ""].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #1e293b" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {orders.map((w, i) => (
                <tr key={w.id} style={{ borderTop: i === 0 ? "none" : "1px solid #1e293b" }}>
                  <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                    <p style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</p>
                    {w.estimated_cost && <p style={{ fontSize: 11, color: "#475569" }}>${w.estimated_cost.toLocaleString("es-AR")}</p>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>{w.type}</p>
                    {w._assetName && <p style={{ fontSize: 12, color: "#475569" }}>{w._assetName}</p>}
                  </td>
                  <td style={{ padding: "12px 16px" }}><Badge label={w.status} colors={STATUS_COLORS[w.status] ?? STATUS_COLORS.cancelled} /></td>
                  <td style={{ padding: "12px 16px" }}><Badge label={w.priority} colors={PRIORITY_COLORS[w.priority] ?? PRIORITY_COLORS.low} /></td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{w.due_date ? fmtDate(w.due_date) : "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(w)} title="Editar" style={BTN_ICON}><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteTarget(w)} title="Eliminar" style={{ ...BTN_ICON, color: "#ef4444" }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Tab: Providers ──────────────────────────────────────────────────────────
const EMPTY_PROVIDER = { name: "", category: "", contact_name: "", phone: "", whatsapp: "", email: "", notes: "", is_active: true };

function ProvidersTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "create" | "edit">(null);
  const [editing, setEditing] = useState<ProviderRow | null>(null);
  const [form, setForm] = useState<typeof EMPTY_PROVIDER>(EMPTY_PROVIDER);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProviderRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("providers").select("id, name, category, contact_name, phone, whatsapp, email, rating, total_jobs, notes, is_active, created_at").eq("company_id", companyId).order("name", { ascending: true });
    setProviders(data ?? []);
    setLoading(false);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_PROVIDER); setModal("create"); };
  const openEdit = (p: ProviderRow) => {
    setEditing(p);
    setForm({ name: p.name, category: p.category ?? "", contact_name: p.contact_name ?? "", phone: p.phone ?? "", whatsapp: p.whatsapp ?? "", email: p.email ?? "", notes: p.notes ?? "", is_active: p.is_active });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { company_id: companyId, name: form.name.trim(), category: form.category.trim() || null, contact_name: form.contact_name.trim() || null, phone: form.phone.trim() || null, whatsapp: form.whatsapp.trim() || null, email: form.email.trim() || null, notes: form.notes.trim() || null, is_active: form.is_active };
    if (modal === "create") await supabase.from("providers").insert(payload);
    else if (editing) await supabase.from("providers").update(payload).eq("id", editing.id);
    setSaving(false); setModal(null); setEditing(null); load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("providers").delete().eq("id", deleteTarget.id);
    setDeleting(false); setDeleteTarget(null); load();
  };

  const f = (key: keyof typeof form) => ({ value: form[key] as string, onChange: (e: any) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  const StarRating = ({ value }: { value: number }) => (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map((s) => <Star key={s} size={11} color={s <= Math.round(value) ? "#f59e0b" : "#334155"} fill={s <= Math.round(value) ? "#f59e0b" : "none"} />)}
    </span>
  );

  return (
    <>
      {modal && (
        <Modal title={modal === "create" ? "Nuevo proveedor" : "Editar proveedor"} onClose={() => setModal(null)}>
          <Field label="Nombre *"><input {...f("name")} placeholder="Ej: Servicio Técnico ABC" style={inputStyle} /></Field>
          <Field label="Categoría">
            <select {...f("category")} style={selectStyle}>
              <option value="">Sin categoría</option>
              {PROVIDER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <FormGrid>
            <Field label="Contacto"><input {...f("contact_name")} placeholder="Juan Pérez" style={inputStyle} /></Field>
            <Field label="Email"><input {...f("email")} type="email" placeholder="info@proveedor.com" style={inputStyle} /></Field>
            <Field label="Teléfono"><input {...f("phone")} placeholder="+54 11 1234-5678" style={inputStyle} /></Field>
            <Field label="WhatsApp"><input {...f("whatsapp")} placeholder="+54 9 11 1234-5678" style={inputStyle} /></Field>
          </FormGrid>
          <Field label="Notas"><textarea {...f("notes")} rows={2} placeholder="Especialidades, condiciones, observaciones..." style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <Field label="Estado">
            <select value={form.is_active ? "active" : "inactive"} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === "active" }))} style={selectStyle}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (saving || !form.name.trim()) ? 0.6 : 1 }}>
              {saving ? "Guardando..." : modal === "create" ? "Crear proveedor" : "Guardar cambios"}
            </button>
          </div>
        </Modal>
      )}
      {deleteTarget && <ConfirmDelete name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: 13, color: "#475569" }}>{providers.length} proveedor{providers.length !== 1 ? "es" : ""}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <CSVImportExport companyId={companyId} companyName={companyName} importType="proveedores" onImportComplete={load} />
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Nuevo proveedor</button>
        </div>
      </div>

      {loading ? <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando...</div> : providers.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <Truck size={36} color="#1e293b" style={{ marginBottom: 12 }} />
          <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>No hay proveedores registrados.</p>
          <button onClick={openCreate} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><Plus size={14} /> Registrar primer proveedor</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {providers.map((p) => (
            <div key={p.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  {p.category && <p style={{ fontSize: 12, color: "#0ea5e9", marginTop: 2 }}>{p.category}</p>}
                </div>
                <Badge label={p.is_active ? "Activo" : "Inactivo"} colors={p.is_active ? { bg: "rgba(16,185,129,0.12)", text: "#10b981" } : { bg: "rgba(239,68,68,0.12)", text: "#ef4444" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {p.contact_name && <p style={{ fontSize: 12, color: "#94a3b8" }}>👤 {p.contact_name}</p>}
                {p.phone && <p style={{ fontSize: 12, color: "#64748b" }}>📞 {p.phone}</p>}
                {p.whatsapp && <p style={{ fontSize: 12, color: "#64748b" }}>💬 {p.whatsapp}</p>}
                {p.email && <p style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✉ {p.email}</p>}
                {p.total_jobs > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <StarRating value={p.rating} />
                    <p style={{ fontSize: 11, color: "#475569" }}>{p.total_jobs} trabajos</p>
                  </div>
                )}
              </div>
              {p.notes && <p style={{ fontSize: 11, color: "#475569", marginBottom: 10, borderTop: "1px solid #1e293b", paddingTop: 8 }}>{p.notes}</p>}
              <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid #1e293b" }}>
                <button onClick={() => openEdit(p)} style={{ ...BTN_SECONDARY_SM, flex: 1 }}><Edit2 size={12} /> Editar</button>
                <button onClick={() => setDeleteTarget(p)} style={{ ...BTN_DANGER_SM }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────────────
function StatsStrip({ companyId }: { companyId: string }) {
  const [counts, setCounts] = useState({ users: 0, assets: 0, orders: 0, locations: 0, providers: 0 });
  useEffect(() => {
    const load = async () => {
      const [{ count: u }, { count: a }, { count: w }, { count: l }, { count: pv }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("assets").select("*", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("locations").select("*", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("providers").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      ]);
      setCounts({ users: u ?? 0, assets: a ?? 0, orders: w ?? 0, locations: l ?? 0, providers: pv ?? 0 });
    };
    load();
  }, [companyId]);

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
      {[
        { icon: Users, label: "Usuarios", value: counts.users, color: "#0ea5e9" },
        { icon: Package, label: "Activos", value: counts.assets, color: "#10b981" },
        { icon: ClipboardList, label: "OTs", value: counts.orders, color: "#8b5cf6" },
        { icon: MapPin, label: "Sucursales", value: counts.locations, color: "#f59e0b" },
        { icon: Truck, label: "Proveedores", value: counts.providers, color: "#f43f5e" },
      ].map(({ icon: Icon, label, value, color }) => (
        <div key={label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, flex: "1 0 130px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={16} color={color} /></div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const { isSuperAdmin } = useAuth();
  const { setSelectedCompany } = useSelectedCompany();

  // ── Tab driven by URL ─────────────────────────────────────────────────────
  // The active tab is read from the ?tab= query param so that the left
  // SubSidebar (which sets the URL) and this page always stay in sync.
  // To add a new tab: (1) extend the Tab type, (2) add an item to the
  // SubSidebar in layout.tsx, (3) add the render block at the bottom.
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "overview";

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setCompany(data);
    setSelectedCompany({ id: data.id, name: data.name, plan: data.plan, is_active: data.is_active });
    setLoading(false);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const handleSaveCompany = async (updated: Partial<CompanyRow>) => {
    await supabase.from("companies").update(updated).eq("id", companyId);
    setCompany((prev) => prev ? { ...prev, ...updated } : prev);
  };

  const toggleActive = async () => {
    if (!company) return;
    setToggling(true);
    await supabase.from("companies").update({ is_active: !company.is_active }).eq("id", companyId);
    setCompany((prev) => prev ? { ...prev, is_active: !prev.is_active } : prev);
    setToggling(false);
  };

  if (loading) return <div style={{ padding: "48px 36px", color: "#475569", fontSize: 14 }}>Cargando empresa...</div>;

  if (notFound || !company) {
    return (
      <div style={{ padding: "48px 36px" }}>
        <button onClick={() => router.push("/admin/companies")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "none", border: "none", cursor: "pointer", marginBottom: 24 }}><ArrowLeft size={14} /> Volver a empresas</button>
        <p style={{ color: "#ef4444", fontSize: 15 }}>Empresa no encontrada.</p>
      </div>
    );
  }

  const planColors = PLAN_COLORS[company.plan] ?? PLAN_COLORS.trial;

  return (
    <div style={{ padding: "28px 36px", minHeight: "100vh" }}>
      {/* Back */}
      <button onClick={() => router.push("/admin/companies")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "none", border: "none", cursor: "pointer", marginBottom: 24 }}>
        <ArrowLeft size={14} /> Volver a empresas
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Building2 size={22} color="#fff" /></div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>{company.name}</h1>
              <Badge label={company.plan} colors={planColors} />
              <Badge label={company.is_active ? "Activa" : "Inactiva"} colors={company.is_active ? { bg: "rgba(16,185,129,0.12)", text: "#10b981" } : { bg: "rgba(239,68,68,0.12)", text: "#ef4444" }} />
            </div>
            <p style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>
              {[company.industry, company.city, company.country].filter(Boolean).join(" · ") || "Sin datos de industria/ubicación"}
            </p>
          </div>
        </div>
        <button onClick={toggleActive} disabled={toggling} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "1px solid #334155", background: company.is_active ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", color: company.is_active ? "#ef4444" : "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: toggling ? 0.5 : 1 }}>
          {company.is_active ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {company.is_active ? "Desactivar" : "Activar"}
        </button>
      </div>

      {/* Stats */}
      <StatsStrip companyId={companyId} />

      {/* Tab content — navegación manejada exclusivamente por el SubSidebar izquierdo
           via URL params (?tab=users, ?tab=assets, etc.) */}
      <div>
        {tab === "overview" && (<>{isSuperAdmin && <AdminInfoCard companyId={companyId} />}<OverviewTab company={company} onSave={handleSaveCompany} /></>)}
        {tab === "users" && <UsersTab companyId={companyId} />}
        {tab === "assets" && <AssetsTab companyId={companyId} companyName={company.name} />}
        {tab === "workorders" && <WorkOrdersTab companyId={companyId} />}
        {tab === "locations" && <LocationsTab companyId={companyId} />}
        {tab === "providers" && <ProvidersTab companyId={companyId} companyName={company.name} />}
      </div>
    </div>
  );
}
