// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardList, RefreshCw, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface WorkOrderRow {
  id: string;
  wo_number: string | null;
  title: string;
  type: string;
  priority: string;
  status: string;
  company_id: string;
  created_at: string;
  due_date: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  _companyName?: string;
  _dataConsent?: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  in_progress: { bg: "rgba(14,165,233,0.12)", text: "#0ea5e9" },
  scheduled: { bg: "rgba(139,92,246,0.12)", text: "#8b5cf6" },
  completed: { bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  blocked: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
  cancelled: { bg: "rgba(100,116,139,0.15)", text: "#64748b" },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "rgba(100,116,139,0.15)", text: "#64748b" },
  normal: { bg: "rgba(14,165,233,0.10)", text: "#7dd3fc" },
  high: { bg: "rgba(249,115,22,0.12)", text: "#f97316" },
  urgent: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
};

const TYPE_LABELS: Record<string, string> = {
  corrective: "Correctivo",
  preventive: "Preventivo",
  predictive: "Predictivo",
  emergency: "Emergencia",
};

export default function AdminWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const loadWorkOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("work_orders")
      .select("id, wo_number, title, type, priority, status, company_id, created_at, due_date, estimated_cost, actual_cost")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) { setLoading(false); return; }

    const companyIds = [...new Set(data.map((w) => w.company_id))];
    const { data: companies } = companyIds.length > 0
      ? await supabase.from("companies").select("id, name, data_sharing_consent").in("id", companyIds)
      : { data: [] };

    const companyMap: Record<string, { name: string; consent: boolean }> = {};
    (companies ?? []).forEach((c) => { companyMap[c.id] = { name: c.name, consent: c.data_sharing_consent }; });

    setWorkOrders(data.map((w) => ({
      ...w,
      _companyName: companyMap[w.company_id]?.name,
      _dataConsent: companyMap[w.company_id]?.consent,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadWorkOrders(); }, [loadWorkOrders]);

  const filtered = workOrders.filter((w) => {
    const matchSearch = !search || (w._companyName ?? "").toLowerCase().includes(search.toLowerCase()) || (w._dataConsent && w.title.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    const matchType = filterType === "all" || w.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <ClipboardList size={20} color="#ef4444" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Órdenes de trabajo</h1>
          </div>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Todas las OTs. El título y costos solo son visibles si la empresa habilitó el acceso a datos.
          </p>
        </div>
        <button onClick={loadWorkOrders} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por empresa o título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 300, padding: "9px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, outline: "none" }}>
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En progreso</option>
          <option value="scheduled">Programada</option>
          <option value="completed">Completada</option>
          <option value="blocked">Bloqueada</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, outline: "none" }}>
          <option value="all">Todos los tipos</option>
          <option value="corrective">Correctivo</option>
          <option value="preventive">Preventivo</option>
          <option value="predictive">Predictivo</option>
          <option value="emergency">Emergencia</option>
        </select>
      </div>

      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando órdenes de trabajo...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>Sin resultados.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["OT #", "Título", "Empresa", "Tipo", "Prioridad", "Estado", "Costo estimado", "Fecha"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, i) => {
                  const statusColor = STATUS_COLORS[w.status] ?? STATUS_COLORS.pending;
                  const priorityColor = PRIORITY_COLORS[w.priority] ?? PRIORITY_COLORS.normal;
                  return (
                    <tr key={w.id} style={{ borderTop: i === 0 ? "none" : "1px solid #0f172a" }}>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569", fontFamily: "monospace" }}>
                        {w.wo_number ?? w.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "14px 16px", maxWidth: 240 }}>
                        {w._dataConsent ? (
                          <p style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</p>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#334155", fontSize: 12 }}>
                            <EyeOff size={12} /> Contenido privado
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{w._companyName ?? "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{TYPE_LABELS[w.type] ?? w.type}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: priorityColor.bg, color: priorityColor.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {w.priority}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: statusColor.bg, color: statusColor.text, whiteSpace: "nowrap" }}>
                          {w.status.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13 }}>
                        {w._dataConsent && w.estimated_cost != null ? (
                          <span style={{ color: "#94a3b8" }}>${w.estimated_cost.toLocaleString("es-AR")}</span>
                        ) : (
                          <span style={{ color: "#334155", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                        {new Date(w.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
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
        💡 Los títulos y costos de OTs solo se muestran cuando la empresa habilitó el consentimiento de datos en la sección Empresas.
        Mostrando últimas 200 OTs.
      </p>
    </div>
  );
}
