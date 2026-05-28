"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Clock, AlertTriangle, List, Calendar,
  Users, ChevronLeft, ChevronRight, Wrench,
} from "lucide-react";

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
  provider_id: string | null;
  priority: string;
  status: string;
  type: string | null;
  resolution_type: string | null;
  due_date: string | null;
  created_at: string;
  asset_name?: string;
  provider_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:       { label: "Borrador",   className: "badge badge-status-pending"     },
  pending:     { label: "Pendiente",  className: "badge badge-status-pending"     },
  assigned:    { label: "Asignada",   className: "badge badge-status-scheduled"   },
  in_progress: { label: "En curso",   className: "badge badge-status-in_progress" },
  paused:      { label: "Pausada",    className: "badge badge-status-blocked"     },
  blocked:     { label: "Bloqueada",  className: "badge badge-status-blocked"     },
  closed:      { label: "Cerrada",    className: "badge badge-status-completed"   },
  completed:   { label: "Completada", className: "badge badge-status-completed"   },
  cancelled:   { label: "Cancelada",  className: "badge badge-status-cancelled"   },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low:    { label: "Baja",    className: "badge badge-priority-low"    },
  medium: { label: "Media",   className: "badge badge-priority-medium" },
  high:   { label: "Alta",    className: "badge badge-priority-high"   },
  critical: { label: "Crítica", className: "badge badge-priority-urgent" },
  urgent: { label: "Urgente", className: "badge badge-priority-urgent" },
};

const PRIORITY_ORDER = ["critical", "urgent", "high", "medium", "low"];
const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítica", urgent: "Urgente", high: "Alta", medium: "Media", low: "Baja",
};

const STATUS_FILTERS = ["todos", "draft", "pending", "assigned", "in_progress", "paused", "closed", "cancelled"] as const;
const STATUS_FILTER_LABELS: Record<string, string> = {
  todos: "Todos", draft: "Borrador", pending: "Pendientes", assigned: "Asignadas", in_progress: "En curso",
  paused: "Pausadas", closed: "Cerradas", cancelled: "Canceladas",
};

type ViewMode = "pendientes" | "tabla" | "calendario" | "carga";

const VIEWS: Array<{ key: ViewMode; label: string; icon: React.ElementType }> = [
  { key: "pendientes", label: "Pendientes", icon: AlertTriangle },
  { key: "tabla",      label: "Tabla",      icon: List          },
  { key: "calendario", label: "Calendario", icon: Calendar      },
  { key: "carga",      label: "Carga",      icon: Users         },
];

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

export default function WorkOrdersPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<WorkOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("tabla");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!profile?.company_id) { if (isMounted) { setItems([]); setIsLoading(false); } return; }
      setIsLoading(true);
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("id, title, asset_id, provider_id, priority, status, type, resolution_type, due_date, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      const assetIds = [...new Set((workOrders ?? []).map((w) => w.asset_id).filter(Boolean))];
      const providerIds = [...new Set((workOrders ?? []).map((w) => w.provider_id).filter(Boolean))];

      const [{ data: assets }, { data: providers }] = await Promise.all([
        assetIds.length ? supabase.from("assets").select("id, name").in("id", assetIds) : { data: [] },
        providerIds.length ? supabase.from("providers").select("id, name").in("id", providerIds) : { data: [] },
      ]);

      const assetMap   = new Map((assets   ?? []).map((a) => [a.id, a.name]));
      const providerMap = new Map((providers ?? []).map((p) => [p.id, p.name]));

      if (isMounted) {
        setItems((workOrders ?? []).map((w) => ({
          ...w,
          asset_name:    w.asset_id    ? assetMap.get(w.asset_id)       : undefined,
          provider_name: w.provider_id ? providerMap.get(w.provider_id) : undefined,
        })));
        setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [profile?.company_id]);

  const filtered = statusFilter === "todos" ? items : items.filter((w) => w.status === statusFilter);
  const activeCount  = items.filter((w) => !["closed", "completed", "cancelled"].includes(w.status)).length;
  const urgentCount  = items.filter((w) => w.priority === "critical" || w.priority === "urgent").length;
  const pendingItems = items.filter((w) => !["closed", "completed", "cancelled"].includes(w.status));

  const isOverdue = (w: WorkOrderRow) =>
    w.due_date && !["closed", "completed", "cancelled"].includes(w.status) && new Date(w.due_date) < new Date();

  // ── Vista: Pendientes (cards by priority) ─────────────────────────────────
  function PendientesView() {
    const byPriority = PRIORITY_ORDER.map((p) => ({
      priority: p,
      items: pendingItems.filter((w) => w.priority === p),
    })).filter((g) => g.items.length > 0);

    if (pendingItems.length === 0) {
      return (
        <Card className="mantix-card">
          <CardContent style={{ padding: "48px 24px", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
            No hay órdenes activas.
          </CardContent>
        </Card>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {byPriority.map(({ priority, items: wos }) => {
          const priCfg = PRIORITY_CONFIG[priority] ?? { label: priority, className: "badge" };
          return (
            <div key={priority}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span className={priCfg.className}>{PRIORITY_LABELS[priority]}</span>
                <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 600 }}>{wos.length} orden{wos.length !== 1 ? "es" : ""}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {wos.map((item) => {
                  const overdue = isOverdue(item);
                  const stsCfg = STATUS_CONFIG[item.status] ?? { label: item.status, className: "badge" };
                  return (
                    <Link key={item.id} href={`/work-orders/${item.id}`} style={{ textDecoration: "none" }}>
                      <Card className="mantix-card" style={{ cursor: "pointer", transition: "transform 0.1s", border: overdue ? "1px solid var(--red)" : undefined }}>
                        <CardContent style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", lineHeight: 1.4, flex: 1 }}>{item.title}</span>
                            {overdue && <AlertTriangle size={14} color="var(--red)" style={{ flexShrink: 0, marginLeft: 8 }} />}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                            <span className={stsCfg.className} style={{ fontSize: 10 }}>{stsCfg.label}</span>
                            {item.type && <span style={{ fontSize: 10, color: "var(--t3)", textTransform: "capitalize" }}>{item.type}</span>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {item.asset_name && <span style={{ fontSize: 11, color: "var(--t2)" }}><Wrench size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />{item.asset_name}</span>}
                            {item.provider_name && <span style={{ fontSize: 11, color: "var(--t3)" }}><Users size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />{item.provider_name}</span>}
                            {item.due_date && (
                              <span style={{ fontSize: 11, color: overdue ? "var(--red)" : "var(--t3)" }}>
                                <Clock size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
                                {new Date(item.due_date).toLocaleDateString("es-AR")}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Vista: Tabla ───────────────────────────────────────────────────────────
  function TablaView() {
    return (
      <>
        <div className="filter-bar">
          {STATUS_FILTERS.map((s) => (
            <button key={s} className={`filter-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
              {STATUS_FILTER_LABELS[s]}
              {s !== "todos" && (
                <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}>
                  {items.filter((w) => w.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <Card className="mantix-card">
          <CardContent className="p-0">
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Descripción</th>
                    <th>Activo</th>
                    <th>Proveedor</th>
                    <th>Tipo</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Vence</th>
                    <th>Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: "32px 16px", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>Sin resultados para este filtro.</td></tr>
                  ) : filtered.map((item) => {
                    const overdue = isOverdue(item);
                    const stsCfg  = STATUS_CONFIG[item.status]   ?? { label: item.status,   className: "badge" };
                    const priCfg  = PRIORITY_CONFIG[item.priority] ?? { label: item.priority, className: "badge" };
                    return (
                      <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => window.location.href = `/work-orders/${item.id}`}>
                        <td className="td-mono">{item.id.slice(0, 8)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="font-semibold" style={{ color: "var(--t1)" }}>{item.title}</span>
                            {overdue && <AlertTriangle size={13} color="var(--red)" />}
                          </div>
                        </td>
                        <td className="td-light">{item.asset_name ?? "—"}</td>
                        <td className="td-light">{item.provider_name ?? "—"}</td>
                        <td className="td-light" style={{ textTransform: "capitalize" }}>{item.type ?? "—"}</td>
                        <td><span className={priCfg.className}>{priCfg.label}</span></td>
                        <td><span className={stsCfg.className}>{stsCfg.label}</span></td>
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
      </>
    );
  }

  // ── Vista: Calendario ──────────────────────────────────────────────────────
  function CalendarioView() {
    const year  = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay  = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Index WOs by day-of-month (based on due_date)
    const byDay: Record<number, WorkOrderRow[]> = {};
    items.forEach((w) => {
      if (!w.due_date) return;
      const d = new Date(w.due_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(w);
      }
    });

    const sinFecha = items.filter((w) => !w.due_date && w.status !== "completed" && w.status !== "cancelled");
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <button className="btn-ghost btn-sm btn-icon" onClick={() => setCalDate(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--t1)", minWidth: 180, textAlign: "center" }}>{MONTH_NAMES[month]} {year}</span>
          <button className="btn-ghost btn-sm btn-icon" onClick={() => setCalDate(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
          <button className="btn-ghost btn-sm" onClick={() => setCalDate(new Date())} style={{ fontSize: 12, marginLeft: 8 }}>Hoy</button>
        </div>

        <Card className="mantix-card">
          <CardContent className="p-0">
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
              {DAY_NAMES.map((d) => (
                <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase" }}>{d}</div>
              ))}
            </div>
            {/* Weeks */}
            {Array.from({ length: cells.length / 7 }, (_, wi) => (
              <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: wi < cells.length / 7 - 1 ? "1px solid var(--border)" : "none" }}>
                {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
                  const isToday = day !== null && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                  const wos = day ? (byDay[day] ?? []) : [];
                  return (
                    <div key={di} style={{ minHeight: 90, padding: "6px 4px", borderRight: di < 6 ? "1px solid var(--border)" : "none", background: isToday ? "rgba(30,122,255,0.06)" : "transparent" }}>
                      {day !== null && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, marginBottom: 4, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: isToday ? "50%" : 0, background: isToday ? "var(--blue)" : "transparent", color: isToday ? "#fff" : "var(--t2)" }}>
                            {day}
                          </div>
                          {wos.slice(0, 3).map((w) => {
                            const overdue = isOverdue(w);
                            return (
                              <Link key={w.id} href={`/work-orders/${w.id}`} style={{ display: "block", textDecoration: "none", marginBottom: 2 }}>
                                <div style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, background: overdue ? "rgba(239,68,68,0.15)" : "var(--s3)", color: overdue ? "var(--red)" : "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                                  {w.title}
                                </div>
                              </Link>
                            );
                          })}
                          {wos.length > 3 && <div style={{ fontSize: 10, color: "var(--t3)", paddingLeft: 3 }}>+{wos.length - 3} más</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sin fecha */}
        {sinFecha.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Sin fecha de vencimiento ({sinFecha.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sinFecha.map((w) => {
                const stsCfg = STATUS_CONFIG[w.status] ?? { label: w.status, className: "badge" };
                return (
                  <Link key={w.id} href={`/work-orders/${w.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "6px 12px", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--t2)" }}>
                      {w.title} <span className={stsCfg.className} style={{ fontSize: 10, marginLeft: 6 }}>{stsCfg.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vista: Carga laboral ───────────────────────────────────────────────────
  function CargaView() {
    // Group by provider
    const grouped: Record<string, { name: string; items: WorkOrderRow[] }> = {};
    items.forEach((w) => {
      const key  = w.provider_id ?? "__none__";
      const name = w.provider_name ?? "Sin proveedor asignado";
      if (!grouped[key]) grouped[key] = { name, items: [] };
      grouped[key].items.push(w);
    });

    const entries = Object.entries(grouped).sort((a, b) => b[1].items.length - a[1].items.length);

    if (entries.length === 0) {
      return (
        <Card className="mantix-card">
          <CardContent style={{ padding: "48px 24px", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
            No hay órdenes de trabajo.
          </CardContent>
        </Card>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {entries.map(([key, group]) => {
          const activeWos   = group.items.filter((w) => w.status !== "completed" && w.status !== "cancelled");
          const overdueWos  = group.items.filter((w) => isOverdue(w));
          const completedWos = group.items.filter((w) => w.status === "completed");

          return (
            <Card key={key} className="mantix-card">
              <CardContent style={{ padding: "16px 20px" }}>
                {/* Provider header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--s3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Users size={16} color="var(--t2)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>{group.name}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                        {group.items.length} total · {activeWos.length} activas · {completedWos.length} completadas
                        {overdueWos.length > 0 && <span style={{ color: "var(--red)", fontWeight: 600 }}> · {overdueWos.length} vencidas</span>}
                      </div>
                    </div>
                  </div>
                  {/* Workload bar */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {["pending","in_progress","scheduled","blocked","completed"].map((s) => {
                      const cnt = group.items.filter((w) => w.status === s).length;
                      if (!cnt) return null;
                      const cfg = STATUS_CONFIG[s];
                      return <span key={s} className={cfg.className} style={{ fontSize: 10 }}>{cfg.label} {cnt}</span>;
                    })}
                  </div>
                </div>

                {/* Orders list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.items.slice(0, 5).map((w) => {
                    const overdue = isOverdue(w);
                    const stsCfg  = STATUS_CONFIG[w.status]    ?? { label: w.status,   className: "badge" };
                    const priCfg  = PRIORITY_CONFIG[w.priority] ?? { label: w.priority, className: "badge" };
                    return (
                      <Link key={w.id} href={`/work-orders/${w.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--s2)", borderRadius: 8, border: overdue ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent" }}>
                          <span style={{ fontSize: 12, color: "var(--t1)", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</span>
                          {w.asset_name && <span style={{ fontSize: 11, color: "var(--t3)", flexShrink: 0 }}>{w.asset_name}</span>}
                          <span className={priCfg.className} style={{ fontSize: 10, flexShrink: 0 }}>{priCfg.label}</span>
                          <span className={stsCfg.className} style={{ fontSize: 10, flexShrink: 0 }}>{stsCfg.label}</span>
                          {w.due_date && <span style={{ fontSize: 11, color: overdue ? "var(--red)" : "var(--t3)", flexShrink: 0 }}>{new Date(w.due_date).toLocaleDateString("es-AR")}</span>}
                        </div>
                      </Link>
                    );
                  })}
                  {group.items.length > 5 && (
                    <div style={{ fontSize: 12, color: "var(--t3)", textAlign: "center", padding: "4px 0" }}>
                      +{group.items.length - 5} órdenes más
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Órdenes de Trabajo"
        subtitle={`${activeCount} activas · ${urgentCount} urgentes`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="view-switcher">
              {VIEWS.map(({ key, label, icon: Icon }) => (
                <button key={key} className={`view-switcher-btn ${view === key ? "active" : ""}`} onClick={() => setView(key)}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <Button asChild>
              <Link href="/work-orders/new"><Plus size={14} /> Nueva Orden</Link>
            </Button>
          </div>
        }
      />

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
      ) : (
        <>
          {view === "pendientes" && PendientesView()}
          {view === "tabla"      && TablaView()}
          {view === "calendario" && CalendarioView()}
          {view === "carga"      && CargaView()}
        </>
      )}
    </div>
  );
}
