"use client";

import { useEffect, useState } from "react";
import { Zap, Plus, Power, PowerOff, Trash2, ChevronRight, Bell, ClipboardList, UserCheck, RefreshCw } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  work_order_status_change: "OT cambia de estado",
  asset_status_change: "Activo cambia de estado",
  stock_low: "Stock cae por debajo del mínimo",
  schedule: "Programación periódica",
  work_order_overdue: "OT vencida",
  asset_critical: "Activo en estado crítico",
};

const ACTION_LABELS: Record<string, string> = {
  create_work_order: "Crear orden de trabajo",
  send_notification: "Enviar notificación",
  update_status: "Actualizar estado",
  assign_user: "Asignar responsable",
  send_email: "Enviar email",
};

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  work_order_status_change: ClipboardList,
  asset_status_change: RefreshCw,
  stock_low: Bell,
  schedule: RefreshCw,
  work_order_overdue: Bell,
  asset_critical: Bell,
};

const PREDEFINED: Array<{
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
}> = [
  {
    name: "OT urgente → notificar admin",
    description: "Cuando una orden se marca como urgente, notifica al administrador de empresa.",
    trigger_type: "work_order_status_change",
    trigger_config: { priority: "urgent" },
    action_type: "send_notification",
    action_config: { target: "company_admin", message: "Nueva OT urgente creada" },
  },
  {
    name: "Activo crítico → crear OT correctiva",
    description: "Cuando un activo pasa a estado crítico, genera automáticamente una orden de trabajo correctiva.",
    trigger_type: "asset_critical",
    trigger_config: { status: "critical" },
    action_type: "create_work_order",
    action_config: { type: "corrective", priority: "urgent", title: "Intervención urgente - Activo crítico" },
  },
  {
    name: "Stock bajo mínimo → alertar",
    description: "Cuando el stock de un repuesto baja del mínimo configurado, envía una alerta.",
    trigger_type: "stock_low",
    trigger_config: {},
    action_type: "send_notification",
    action_config: { target: "company_admin", message: "Repuesto con stock bajo mínimo" },
  },
  {
    name: "OT vencida → reasignar",
    description: "Cuando una OT supera su fecha límite sin completarse, notifica y reasigna al supervisor.",
    trigger_type: "work_order_overdue",
    trigger_config: {},
    action_type: "send_notification",
    action_config: { target: "company_admin", message: "Orden de trabajo vencida sin completar" },
  },
  {
    name: "OT completada → notificar cliente",
    description: "Cuando una OT se marca como completada, envía un email de confirmación.",
    trigger_type: "work_order_status_change",
    trigger_config: { status: "completed" },
    action_type: "send_email",
    action_config: { subject: "Orden de trabajo completada", template: "completion" },
  },
];

export default function AutomatizacionesPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPredefined, setShowPredefined] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("work_order_status_change");
  const [actionType, setActionType] = useState("send_notification");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!profile?.company_id) { setIsLoading(false); return; }
      const { data } = await supabase
        .from("automations")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      if (isMounted) { setItems((data ?? []) as Automation[]); setIsLoading(false); }
    };
    void load();
    return () => { isMounted = false; };
  }, [profile?.company_id]);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("automations").update({ is_active: !current }).eq("id", id);
    setItems((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("¿Eliminar esta automatización?")) return;
    await supabase.from("automations").delete().eq("id", id);
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  const saveNew = async () => {
    if (!profile?.company_id || !name.trim()) { setSaveError("Nombre requerido."); return; }
    setIsSaving(true); setSaveError(null);
    const { data, error } = await supabase.from("automations").insert({
      company_id: profile.company_id,
      name: name.trim(),
      description: description.trim() || null,
      trigger_type: triggerType,
      trigger_config: {},
      action_type: actionType,
      action_config: {},
      is_active: true,
      created_by: profile.id,
    }).select().single();
    if (error) { setSaveError(error.message); setIsSaving(false); return; }
    setItems((prev) => [data as Automation, ...prev]);
    setShowModal(false);
    setName(""); setDescription(""); setTriggerType("work_order_status_change"); setActionType("send_notification");
    setIsSaving(false);
  };

  const addPredefined = async (preset: typeof PREDEFINED[number]) => {
    if (!profile?.company_id) return;
    const { data, error } = await supabase.from("automations").insert({
      company_id: profile.company_id,
      name: preset.name,
      description: preset.description,
      trigger_type: preset.trigger_type,
      trigger_config: preset.trigger_config,
      action_type: preset.action_type,
      action_config: preset.action_config,
      is_active: true,
      created_by: profile.id,
    }).select().single();
    if (!error && data) setItems((prev) => [data as Automation, ...prev]);
  };

  const activeCount = items.filter((a) => a.is_active).length;

  return (
    <div>
      <PageHeader
        title="Automatizaciones"
        subtitle={`${items.length} reglas · ${activeCount} activas`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary btn-sm" onClick={() => setShowPredefined(true)}>
              Usar plantilla
            </button>
            <button className="btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Nueva regla
            </button>
          </div>
        }
      />

      {/* Explicación */}
      <div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(30,122,255,0.06)", border: "1px solid rgba(30,122,255,0.15)", borderRadius: 12, fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--blue)" }}>¿Qué son las automatizaciones?</strong> — Son reglas que se ejecutan automáticamente cuando ocurre un evento en el sistema (cambio de estado, stock bajo, OT vencida, etc.) y disparan una acción (crear OT, notificar, asignar).
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 80, background: "var(--s2)", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      ) : items.length === 0 ? (
        <Card className="mantix-card">
          <CardContent style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⚡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", marginBottom: 6 }}>
              No hay automatizaciones configuradas
            </div>
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 20 }}>
              Empezá con una plantilla predefinida o creá una regla personalizada.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn-secondary" onClick={() => setShowPredefined(true)}>
                Ver plantillas
              </button>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={14} /> Crear regla
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item) => {
            const TrigIcon = TRIGGER_ICONS[item.trigger_type] ?? Zap;
            return (
              <Card key={item.id} className="mantix-card" style={{ opacity: item.is_active ? 1 : 0.6 }}>
                <CardContent style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: item.is_active ? "rgba(30,122,255,0.12)" : "var(--s3)", border: `1px solid ${item.is_active ? "rgba(30,122,255,0.25)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TrigIcon size={17} color={item.is_active ? "var(--blue)" : "var(--t3)"} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 6 }}>{item.description}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span className="badge" style={{ background: "rgba(30,122,255,0.10)", color: "var(--blue)", fontSize: 10 }}>
                        CUANDO: {TRIGGER_LABELS[item.trigger_type] ?? item.trigger_type}
                      </span>
                      <ChevronRight size={12} color="var(--t3)" />
                      <span className="badge" style={{ background: "rgba(0,214,143,0.10)", color: "var(--green)", fontSize: 10 }}>
                        ACCIÓN: {ACTION_LABELS[item.action_type] ?? item.action_type}
                      </span>
                      {item.run_count > 0 && (
                        <span style={{ fontSize: 11, color: "var(--t3)" }}>· {item.run_count} ejecuciones</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className={item.is_active ? "btn-success btn-sm" : "btn-ghost btn-sm"}
                      title={item.is_active ? "Desactivar" : "Activar"}
                    >
                      {item.is_active ? <Power size={13} /> : <PowerOff size={13} />}
                      {item.is_active ? "Activa" : "Inactiva"}
                    </button>
                    <button
                      onClick={() => deleteAutomation(item.id)}
                      className="btn-ghost btn-sm btn-icon"
                      title="Eliminar"
                    >
                      <Trash2 size={14} color="var(--red)" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal nueva regla */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Nueva automatización</div>
            <div className="modal-subtitle">Configurá el disparador y la acción de esta regla.</div>

            <div className="form-stack">
              <label>
                <span className="form-label">Nombre de la regla</span>
                <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: OT urgente → notificar admin" />
              </label>

              <label>
                <span className="form-label">Descripción (opcional)</span>
                <textarea className="form-control" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿Qué hace esta regla?" />
              </label>

              <label>
                <span className="form-label">Disparador (CUANDO...)</span>
                <select className="form-control" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>

              <label>
                <span className="form-label">Acción (ENTONCES...)</span>
                <select className="form-control" value={actionType} onChange={(e) => setActionType(e.target.value)}>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>

            {saveError && <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>{saveError}</div>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={saveNew} disabled={isSaving}>{isSaving ? "Guardando..." : "Crear regla"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal plantillas */}
      {showPredefined && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPredefined(false)}>
          <div className="modal-box" style={{ maxWidth: 620 }}>
            <div className="modal-title">Plantillas de automatización</div>
            <div className="modal-subtitle">Seleccioná una plantilla para agregarla a tus reglas.</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              {PREDEFINED.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--s2)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--t2)" }}>{p.description}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <span className="badge" style={{ background: "rgba(30,122,255,0.10)", color: "var(--blue)", fontSize: 10 }}>
                        {TRIGGER_LABELS[p.trigger_type] ?? p.trigger_type}
                      </span>
                      <ChevronRight size={10} color="var(--t3)" style={{ marginTop: 2 }} />
                      <span className="badge" style={{ background: "rgba(0,214,143,0.10)", color: "var(--green)", fontSize: 10 }}>
                        {ACTION_LABELS[p.action_type] ?? p.action_type}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-primary btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={async () => { await addPredefined(p); }}
                  >
                    <Plus size={13} /> Agregar
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPredefined(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
