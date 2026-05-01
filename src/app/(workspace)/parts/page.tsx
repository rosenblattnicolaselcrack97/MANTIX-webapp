"use client";

import { useEffect, useState } from "react";
import {
  Plus, Package, AlertTriangle, Pencil, Trash2, Search, X,
  TrendingDown, BarChart3,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Card, CardContent } from "@/components/ui/card";

interface Part {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string | null;
  stock_current: number;
  stock_min: number;
  stock_max: number | null;
  unit_cost: number | null;
  location_id: string | null;
  location_name?: string;
  supplier_id: string | null;
  supplier_name?: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

const UNITS = ["unidad", "kg", "lt", "m", "m2", "m3", "rollo", "caja", "par", "juego", "otro"];

type StockFilter = "todos" | "low" | "ok";

const STOCK_FILTERS: Array<{ key: StockFilter; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "low",   label: "Stock bajo" },
  { key: "ok",    label: "Stock OK"   },
];

function stockStatus(part: Part): "low" | "ok" | "empty" {
  if (part.stock_current <= 0) return "empty";
  if (part.stock_current < part.stock_min) return "low";
  return "ok";
}

export default function PartsPage() {
  const { profile } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<StockFilter>("todos");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formUnit, setFormUnit] = useState("unidad");
  const [formStockCurrent, setFormStockCurrent] = useState("0");
  const [formStockMin, setFormStockMin] = useState("1");
  const [formStockMax, setFormStockMax] = useState("");
  const [formUnitCost, setFormUnitCost] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!profile?.company_id) { setIsLoading(false); return; }
      const { data: rawParts } = await supabase
        .from("parts")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name", { ascending: true });

      const locationIds = [...new Set((rawParts ?? []).map((p: Part) => p.location_id).filter(Boolean))];
      const { data: locs } = locationIds.length
        ? await supabase.from("locations").select("id, name").in("id", locationIds)
        : { data: [] };
      const locMap = new Map((locs ?? []).map((l) => [l.id, l.name]));

      if (isMounted) {
        setParts((rawParts ?? []).map((p: Part) => ({
          ...p,
          location_name: p.location_id ? locMap.get(p.location_id) : undefined,
        })));
        setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [profile?.company_id]);

  const totalValue = parts.reduce((sum, p) => sum + (p.stock_current * (p.unit_cost ?? 0)), 0);
  const lowStockCount = parts.filter((p) => stockStatus(p) !== "ok").length;

  const filtered = parts.filter((p) => {
    if (stockFilter === "low" && stockStatus(p) === "ok") return false;
    if (stockFilter === "ok"  && stockStatus(p) !== "ok") return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const resetForm = () => {
    setFormName(""); setFormSku(""); setFormCategory(""); setFormUnit("unidad");
    setFormStockCurrent("0"); setFormStockMin("1"); setFormStockMax(""); setFormUnitCost(""); setFormNotes("");
    setSaveError(null);
  };

  const openCreate = () => { setEditing(null); resetForm(); setShowModal(true); };
  const openEdit = (p: Part) => {
    setEditing(p);
    setFormName(p.name); setFormSku(p.sku ?? ""); setFormCategory(p.category ?? ""); setFormUnit(p.unit ?? "unidad");
    setFormStockCurrent(String(p.stock_current)); setFormStockMin(String(p.stock_min));
    setFormStockMax(p.stock_max != null ? String(p.stock_max) : "");
    setFormUnitCost(p.unit_cost != null ? String(p.unit_cost) : "");
    setFormNotes(p.notes ?? ""); setSaveError(null); setShowModal(true);
  };

  const save = async () => {
    if (!profile?.company_id || !formName.trim()) { setSaveError("El nombre es requerido."); return; }
    setIsSaving(true); setSaveError(null);
    const payload = {
      name: formName.trim(),
      sku: formSku.trim() || null,
      category: formCategory.trim() || null,
      unit: formUnit,
      stock_current: parseFloat(formStockCurrent) || 0,
      stock_min: parseFloat(formStockMin) || 0,
      stock_max: formStockMax ? parseFloat(formStockMax) : null,
      unit_cost: formUnitCost ? parseFloat(formUnitCost) : null,
      notes: formNotes.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from("parts").update(payload).eq("id", editing.id);
      if (error) { setSaveError(error.message); setIsSaving(false); return; }
      setParts((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...payload } : p));
    } else {
      const { data, error } = await supabase.from("parts").insert({
        company_id: profile.company_id,
        is_active: true,
        ...payload,
      }).select().single();
      if (error) { setSaveError(error.message); setIsSaving(false); return; }
      setParts((prev) => [...prev, data as Part].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setShowModal(false); setIsSaving(false);
  };

  const deletePart = async (id: string) => {
    if (!confirm("¿Eliminar este repuesto del inventario?")) return;
    await supabase.from("parts").delete().eq("id", id);
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const adjustStock = async (part: Part, delta: number) => {
    const newStock = Math.max(0, part.stock_current + delta);
    await supabase.from("parts").update({ stock_current: newStock }).eq("id", part.id);
    setParts((prev) => prev.map((p) => p.id === part.id ? { ...p, stock_current: newStock } : p));
  };

  return (
    <div>
      <PageHeader
        title="Stock y Repuestos"
        subtitle={`${parts.length} ítems · ${lowStockCount} con stock bajo · $${totalValue.toLocaleString("es-AR", { minimumFractionDigits: 0 })} en inventario`}
        actions={
          <button className="btn-primary btn-sm" onClick={openCreate}>
            <Plus size={14} /> Agregar repuesto
          </button>
        }
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total ítems",   value: parts.length,                            icon: Package,      color: "var(--blue)"  },
          { label: "Stock bajo",    value: parts.filter((p) => stockStatus(p) === "low").length,   icon: TrendingDown, color: "var(--yellow)"},
          { label: "Sin stock",     value: parts.filter((p) => stockStatus(p) === "empty").length, icon: AlertTriangle, color: "var(--red)"  },
          { label: "Valor total",   value: `$${Math.round(totalValue).toLocaleString("es-AR")}`,   icon: BarChart3,    color: "var(--green)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="mantix-card">
            <CardContent style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <Icon size={20} color={color} />
              <div>
                <div style={{ fontSize: typeof value === "string" && value.length > 6 ? 16 : 22, fontWeight: 800, color: "var(--t1)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div className="filter-bar" style={{ marginBottom: 0, flex: 1 }}>
          {STOCK_FILTERS.map(({ key, label }) => (
            <button key={key} className={`filter-chip ${stockFilter === key ? "active" : ""}`} onClick={() => setStockFilter(key)}>
              {label}
              {key !== "todos" && (
                <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}>
                  {key === "low" ? lowStockCount : parts.filter((p) => stockStatus(p) === "ok").length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", minWidth: 200 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--t3)" }} />
          <input
            className="form-control"
            style={{ paddingLeft: 30, paddingRight: search ? 30 : 12, height: 34, fontSize: 13 }}
            placeholder="Buscar por nombre, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t3)" }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card className="mantix-card">
          <CardContent className="p-5 text-[13px] text-muted">Cargando inventario...</CardContent>
        </Card>
      ) : parts.length === 0 ? (
        <WorkspaceEmptyState
          title="Sin repuestos en inventario"
          description="Agregá repuestos y materiales para hacer seguimiento del stock y vincularlo a órdenes de trabajo."
          actionLabel="Agregar primer repuesto"
        />
      ) : filtered.length === 0 ? (
        <Card className="mantix-card">
          <CardContent style={{ padding: "40px 24px", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
            No hay repuestos que coincidan con el filtro.
          </CardContent>
        </Card>
      ) : (
        <Card className="mantix-card">
          <CardContent className="p-0">
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                    <th>Costo unit.</th>
                    <th>Valor total</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((part) => {
                    const ss = stockStatus(part);
                    return (
                      <tr key={part.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Package size={13} color="var(--t3)" />
                            <span style={{ fontWeight: 600, color: "var(--t1)" }}>{part.name}</span>
                          </div>
                          {part.notes && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{part.notes}</div>}
                        </td>
                        <td className="td-mono">{part.sku ?? "—"}</td>
                        <td className="td-light">{part.category ?? "—"}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              onClick={() => adjustStock(part, -1)}
                              style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "var(--s2)", cursor: "pointer", fontSize: 14, lineHeight: 1, color: "var(--t2)" }}
                            >−</button>
                            <span style={{ fontWeight: 700, color: ss === "empty" ? "var(--red)" : ss === "low" ? "var(--yellow)" : "var(--t1)", minWidth: 28, textAlign: "center" }}>
                              {part.stock_current}
                            </span>
                            <button
                              onClick={() => adjustStock(part, 1)}
                              style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "var(--s2)", cursor: "pointer", fontSize: 14, lineHeight: 1, color: "var(--t2)" }}
                            >+</button>
                            <span style={{ fontSize: 11, color: "var(--t3)" }}>{part.unit}</span>
                          </div>
                        </td>
                        <td className="td-light">{part.stock_min} {part.unit}</td>
                        <td className="td-light">
                          {part.unit_cost != null ? `$${part.unit_cost.toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td className="td-light">
                          {part.unit_cost != null ? `$${(part.stock_current * part.unit_cost).toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td>
                          {ss === "empty" && <span className="badge badge-status-blocked">Sin stock</span>}
                          {ss === "low"   && <span className="badge badge-status-pending">Stock bajo</span>}
                          {ss === "ok"    && <span className="badge badge-status-completed">OK</span>}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn-ghost btn-sm btn-icon" onClick={() => openEdit(part)} title="Editar">
                              <Pencil size={12} color="var(--t2)" />
                            </button>
                            <button className="btn-ghost btn-sm btn-icon" onClick={() => deletePart(part.id)} title="Eliminar">
                              <Trash2 size={12} color="var(--red)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-title">{editing ? "Editar repuesto" : "Nuevo repuesto"}</div>
            <div className="modal-subtitle">{editing ? "Modificá los datos del ítem." : "Completá la información del repuesto o material."}</div>

            <div className="form-stack">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <span className="form-label">Nombre *</span>
                  <input className="form-control" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Filtro de aceite" autoFocus />
                </label>
                <label>
                  <span className="form-label">SKU / Código</span>
                  <input className="form-control" value={formSku} onChange={(e) => setFormSku(e.target.value)} placeholder="Ej: FLT-001" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <span className="form-label">Categoría</span>
                  <input className="form-control" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Ej: Lubricantes" />
                </label>
                <label>
                  <span className="form-label">Unidad</span>
                  <select className="form-control" value={formUnit} onChange={(e) => setFormUnit(e.target.value)}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <label>
                  <span className="form-label">Stock actual</span>
                  <input className="form-control" type="number" min="0" value={formStockCurrent} onChange={(e) => setFormStockCurrent(e.target.value)} />
                </label>
                <label>
                  <span className="form-label">Stock mínimo</span>
                  <input className="form-control" type="number" min="0" value={formStockMin} onChange={(e) => setFormStockMin(e.target.value)} />
                </label>
                <label>
                  <span className="form-label">Stock máximo</span>
                  <input className="form-control" type="number" min="0" value={formStockMax} onChange={(e) => setFormStockMax(e.target.value)} placeholder="Opcional" />
                </label>
              </div>

              <label>
                <span className="form-label">Costo unitario ($)</span>
                <input className="form-control" type="number" min="0" step="0.01" value={formUnitCost} onChange={(e) => setFormUnitCost(e.target.value)} placeholder="0.00" />
              </label>

              <label>
                <span className="form-label">Notas</span>
                <textarea className="form-control" rows={2} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Información adicional, proveedor habitual, etc." />
              </label>
            </div>

            {saveError && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>
                {saveError}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={save} disabled={isSaving}>
                {isSaving ? "Guardando..." : editing ? "Guardar cambios" : "Crear repuesto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
