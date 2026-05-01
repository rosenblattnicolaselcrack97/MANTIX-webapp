"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, Pencil, Trash2, Boxes, ClipboardList, BarChart3 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

type CategoryType = "asset" | "work_order" | "part";

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const TABS: Array<{ key: CategoryType; label: string; icon: React.ElementType; description: string }> = [
  { key: "asset", label: "Activos", icon: Boxes, description: "Clasificá tus equipos e instalaciones" },
  { key: "work_order", label: "Órdenes de trabajo", icon: ClipboardList, description: "Tipos y categorías de intervenciones" },
  { key: "part", label: "Repuestos", icon: BarChart3, description: "Grupos de materiales e insumos" },
];

const PRESET_COLORS = [
  "#1e7aff", "#00c6ff", "#00d68f", "#ffb800", "#ff6b35", "#ff3d5a",
  "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#6366f1", "#ec4899",
];

export default function CategoriasPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<CategoryType>("asset");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#1e7aff");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!profile?.company_id) { setIsLoading(false); return; }
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name", { ascending: true });
      if (isMounted) { setCategories((data ?? []) as Category[]); setIsLoading(false); }
    };
    void load();
    return () => { isMounted = false; };
  }, [profile?.company_id]);

  const filtered = categories.filter((c) => c.type === activeTab);

  const openCreate = () => {
    setEditing(null);
    setFormName(""); setFormDescription(""); setFormColor("#1e7aff");
    setSaveError(null);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormName(cat.name); setFormDescription(cat.description ?? ""); setFormColor(cat.color);
    setSaveError(null);
    setShowModal(true);
  };

  const save = async () => {
    if (!profile?.company_id || !formName.trim()) { setSaveError("El nombre es requerido."); return; }
    setIsSaving(true); setSaveError(null);

    if (editing) {
      const { error } = await supabase.from("categories")
        .update({ name: formName.trim(), description: formDescription.trim() || null, color: formColor })
        .eq("id", editing.id);
      if (error) { setSaveError(error.message); setIsSaving(false); return; }
      setCategories((prev) => prev.map((c) => c.id === editing.id ? { ...c, name: formName.trim(), description: formDescription.trim() || null, color: formColor } : c));
    } else {
      const { data, error } = await supabase.from("categories").insert({
        company_id: profile.company_id,
        name: formName.trim(),
        description: formDescription.trim() || null,
        color: formColor,
        type: activeTab,
        is_active: true,
      }).select().single();
      if (error) { setSaveError(error.message); setIsSaving(false); return; }
      setCategories((prev) => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    }

    setShowModal(false);
    setIsSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría? No afecta los registros ya categorizados.")) return;
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleActive = async (cat: Category) => {
    await supabase.from("categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
  };

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const total = categories.length;

  return (
    <div>
      <PageHeader
        title="Categorías"
        subtitle={`${total} categorías en total`}
        actions={
          <button className="btn-primary btn-sm" onClick={openCreate}>
            <Plus size={14} /> Nueva categoría
          </button>
        }
      />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = categories.filter((c) => c.type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`filter-chip ${activeTab === tab.key ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Icon size={13} />
              {tab.label}
              <span style={{ marginLeft: 2, padding: "1px 6px", borderRadius: 999, background: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "var(--s3)", fontSize: 10, fontWeight: 700 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 90, background: "var(--s2)", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="mantix-card">
          <CardContent style={{ padding: "48px 24px", textAlign: "center" }}>
            <Tag size={36} color="var(--t3)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t2)", marginBottom: 6 }}>
              Sin categorías de {currentTab.label.toLowerCase()}
            </div>
            <div style={{ fontSize: 13, color: "var(--t3)", marginBottom: 18 }}>{currentTab.description}</div>
            <button className="btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} /> Crear primera categoría
            </button>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
          {filtered.map((cat) => (
            <Card key={cat.id} className="mantix-card" style={{ opacity: cat.is_active ? 1 : 0.55 }}>
              <CardContent style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: cat.color, flexShrink: 0, boxShadow: `0 0 0 3px ${cat.color}28` }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>{cat.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-ghost btn-sm btn-icon" onClick={() => openEdit(cat)} title="Editar">
                      <Pencil size={12} color="var(--t2)" />
                    </button>
                    <button className="btn-ghost btn-sm btn-icon" onClick={() => deleteCategory(cat.id)} title="Eliminar">
                      <Trash2 size={12} color="var(--red)" />
                    </button>
                  </div>
                </div>

                {cat.description && (
                  <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.5, marginBottom: 10 }}>{cat.description}</div>
                )}

                <button
                  onClick={() => toggleActive(cat)}
                  style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, border: "none", cursor: "pointer", background: cat.is_active ? "rgba(0,214,143,0.12)" : "var(--s3)", color: cat.is_active ? "var(--green)" : "var(--t3)" }}
                >
                  {cat.is_active ? "Activa" : "Inactiva"}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-title">{editing ? "Editar categoría" : "Nueva categoría"}</div>
            <div className="modal-subtitle">
              {editing ? "Modificá el nombre o color." : `Categoría de ${currentTab.label.toLowerCase()}.`}
            </div>

            <div className="form-stack">
              <label>
                <span className="form-label">Nombre</span>
                <input className="form-control" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Equipos eléctricos" autoFocus />
              </label>

              <label>
                <span className="form-label">Descripción (opcional)</span>
                <textarea className="form-control" rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Para qué se usa esta categoría" />
              </label>

              <div>
                <span className="form-label">Color</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: formColor === c ? `3px solid var(--t1)` : "2px solid transparent", cursor: "pointer", outline: "none", boxShadow: formColor === c ? `0 0 0 2px ${c}` : "none" }}
                    />
                  ))}
                  <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} title="Color personalizado" style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", cursor: "pointer", padding: 0 }} />
                </div>
              </div>
            </div>

            {saveError && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>
                {saveError}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={save} disabled={isSaving}>
                {isSaving ? "Guardando..." : editing ? "Guardar cambios" : "Crear categoría"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
