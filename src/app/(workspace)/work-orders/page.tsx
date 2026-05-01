"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { List, LayoutGrid, Plus, Clock, AlertTriangle } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WorkOrderRow {
  id: string;
  title: string;
  asset_id: string | null;
  priority: string;
  status: string;
  type: string | null;
  resolution_type: string | null;
  due_date: string | null;
  created_at: string;
  asset_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pendiente",  className: "badge badge-status-pending"     },
  in_progress: { label: "En curso",   className: "badge badge-status-in_progress" },
  scheduled:   { label: "Programada", className: "badge badge-status-scheduled"   },
  blocked:     { label: "Bloqueada",  className: "badge badge-status-blocked"     },
  completed:   { label: "Completada", className: "badge badge-status-completed"   },
  cancelled:   { label: "Cancelada",  className: "badge badge-status-cancelled"   },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low:    { label: "Baja",    className: "badge badge-priority-low"    },
  medium: { label: "Media",   className: "badge badge-priority-medium" },
  high:   { label: "Alta",    className: "badge badge-priority-high"   },
  urgent: { label: "Urgente", className: "badge badge-priority-urgent" },
};

const KANBAN_COLS: Array<{ key: string; label: string; color: string }> = [
  { key: "pending",     label: "Pendiente",   color: "var(--yellow)" },
  { key: "scheduled",   label: "Programada",  color: "var(--cyan)"   },
  { key: "in_progress", label: "En curso",    color: "var(--blue)"   },
  { key: "blocked",     label: "Bloqueada",   color: "var(--red)"    },
  { key: "completed",   label: "Completada",  color: "var(--green)"  },
];

const STATUS_FILTERS = ["todos", "pending", "in_progress", "scheduled", "blocked", "completed", "cancelled"] as const;
const STATUS_FILTER_LABELS: Record<string, string> = {
  todos: "Todos", pending: "Pendientes", in_progress: "En curso",
  scheduled: "Programadas", blocked: "Bloqueadas", completed: "Completadas", cancelled: "Canceladas",
};

type ViewMode = "list" | "kanban";

export default function WorkOrdersPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<WorkOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!profile?.company_id) { if (isMounted) { setItems([]); setIsLoading(false); } return; }
      setIsLoading(true);
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("id, title, asset_id, priority, status, type, resolution_type, due_date, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      const assetIds = [...new Set((workOrders ?? []).map((w) => w.asset_id).filter(Boolean))];
      const { data: assets } = assetIds.length
        ? await supabase.from("assets").select("id, name").in("id", assetIds)
        : { data: [] };
      const assetMap = new Map((assets ?? []).map((a) => [a.id, a.name]));

      if (isMounted) {
        setItems((workOrders ?? []).map((w) => ({ ...w, asset_name: w.asset_id ? assetMap.get(w.asset_id) : undefined })));
        setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [profile?.company_id]);

  const filtered = statusFilter === "todos" ? items : items.filter((w) => w.status === statusFilter);
  const activeCount = items.filter((w) => w.status !== "completed" && w.status !== "cancelled").length;
  const urgentCount = items.filter((w) => w.priority === "urgent").length;

  const isOverdue = (w: WorkOrderRow) =>
    w.due_date && w.status !== "completed" && w.status !== "cancelled" && new Date(w.due_date) < new Date();

  return (
    <div>
      <PageHeader
        title="Órdenes de Trabajo"
        subtitle={`${activeCount} activas · ${urgentCount} urgentes`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="view-switcher">
              <button className={`view-switcher-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
                <List size={13} /> Lista
              </button>
              <button className={`view-switcher-btn ${view === "kanban" ? "active" : ""}`} onClick={() => setView("kanban")}>
                <LayoutGrid size={13} /> Kanban
              </button>
            </div>
            <Button asChild>
              <Link href="/work-orders/new"><Plus size={14} /> Nueva Orden</Link>
            </Button>
          </div>
        }
      />

      {/* Filtros de estado */}
      <div className="filter-bar">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`filter-chip ${statusFilter === s ? "active" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {STATUS_FILTER_LABELS[s]}
            {s !== "todos" && (
              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}>
                {items.filter((w) => w.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card className="mantix-card">
          <CardContent className="p-5 text-[13px] text-muted">Cargando órdenes de trabajo...</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <WorkspaceEmptyState
          actionHref="/work-orders/new"
          actionLabel="Crear primera orden"
          description="Todavía no hay órdenes de trabajo. Creá la primera para empezar a operar."
          title="Sin órdenes de trabajo"
        />
      ) : view === "list" ? (
        /* ── Vista Lista ─────────────────────────── */
        <Card className="mantix-card">
          <CardContent className="p-0">
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Descripción</th>
                    <th>Activo</th>
                    <th>Tipo</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Vence</th>
                    <th>Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const overdue = isOverdue(item);
                    const statusCfg = STATUS_CONFIG[item.status] ?? { label: item.status, className: "badge" };
                    const priorityCfg = PRIORITY_CONFIG[item.priority] ?? { label: item.priority, className: "badge" };
                    return (
                      <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => window.location.href = `/work-orders/${item.id}`}>
                        <td className="td-mono">{item.id.slice(0, 8)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="font-semibold" style={{ color: "var(--t1)" }}>{item.title}</span>
                            {overdue && <AlertTriangle size={13} color="var(--red)" />}
                          </div>
                        </td>
                        <td className="td-light">{item.asset_name ?? "Sin activo"}</td>
                        <td className="td-light" style={{ textTransform: "capitalize" }}>{item.type ?? "—"}</td>
                        <td><span className={priorityCfg.className}>{priorityCfg.label}</span></td>
                        <td><span className={statusCfg.className}>{statusCfg.label}</span></td>
                        <td>
                          {item.due_date ? (
                            <span style={{ fontSize: 12, color: overdue ? "var(--red)" : "var(--t2)" }}>
                              {overdue && <Clock size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />}
                              {new Date(item.due_date).toLocaleDateString("es-AR")}
                            </span>
                          ) : <span className="td-light">—</span>}
                        </td>
                        <td className="td-mono">{new Date(item.created_at).toLocaleDateString("es-AR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── Vista Kanban ────────────────────────── */
        <div className="kanban-board">
          {KANBAN_COLS.map((col) => {
            const colItems = items.filter((w) => w.status === col.key);
            return (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <div className="kanban-col-title">
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, display: "inline-block" }} />
                    {col.label}
                  </div>
                  <span className="kanban-col-count">{colItems.length}</span>
                </div>
                {colItems.map((item) => {
                  const priorityCfg = PRIORITY_CONFIG[item.priority] ?? { label: item.priority, className: "badge" };
                  const overdue = isOverdue(item);
                  return (
                    <Link key={item.id} href={`/work-orders/${item.id}`} className="kanban-card">
                      <div className="kanban-card-title">{item.title}</div>
                      <div className="kanban-card-meta">
                        <span className={priorityCfg.className} style={{ fontSize: 10 }}>{priorityCfg.label}</span>
                        {item.asset_name && <span>{item.asset_name}</span>}
                        {overdue && <span style={{ color: "var(--red)", fontWeight: 600 }}>⚠ Vencida</span>}
                      </div>
                      {item.due_date && (
                        <div style={{ marginTop: 6, fontSize: 11, color: overdue ? "var(--red)" : "var(--t3)" }}>
                          <Clock size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                          {new Date(item.due_date).toLocaleDateString("es-AR")}
                        </div>
                      )}
                    </Link>
                  );
                })}
                {colItems.length === 0 && (
                  <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12, color: "var(--t3)", border: "1px dashed var(--border)", borderRadius: 10 }}>
                    Sin órdenes
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
