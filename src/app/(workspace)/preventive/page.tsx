"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, ShieldCheck, AlertTriangle, Clock, CheckCircle2,
  Calendar, Wrench, ChevronRight, RefreshCw,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Card, CardContent } from "@/components/ui/card";

interface AssetWithPM {
  id: string;
  name: string;
  category: string | null;
  status: string;
  location_id: string | null;
  location_name?: string;
  last_maintenance_at: string | null;
  next_maintenance_at: string | null;
  maintenance_frequency_number: number | null;
  maintenance_frequency_unit: string | null;
  criticality: string;
}

const UNIT_LABEL: Record<string, string> = {
  days: "días",
  months: "meses",
  years: "años",
};

const CRITICALITY_CONFIG: Record<string, { label: string; className: string }> = {
  low:      { label: "Baja",     className: "badge badge-priority-low"    },
  medium:   { label: "Media",    className: "badge badge-priority-medium" },
  high:     { label: "Alta",     className: "badge badge-priority-high"   },
  critical: { label: "Crítica",  className: "badge badge-priority-urgent" },
};

type FilterMode = "todos" | "overdue" | "upcoming" | "ok" | "no_schedule";

const FILTERS: Array<{ key: FilterMode; label: string }> = [
  { key: "todos",       label: "Todos"         },
  { key: "overdue",     label: "Vencidos"      },
  { key: "upcoming",    label: "Próximos 30d"  },
  { key: "ok",          label: "Al día"        },
  { key: "no_schedule", label: "Sin programa"  },
];

function getAssetStatus(asset: AssetWithPM): FilterMode {
  if (!asset.maintenance_frequency_number || !asset.maintenance_frequency_unit) return "no_schedule";
  if (!asset.next_maintenance_at) return "no_schedule";
  const next = new Date(asset.next_maintenance_at);
  const now = new Date();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  if (next < now) return "overdue";
  if (next <= in30) return "upcoming";
  return "ok";
}

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function PreventivePage() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<AssetWithPM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("todos");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!profile?.company_id) { setIsLoading(false); return; }
      const { data: rawAssets } = await supabase
        .from("assets")
        .select("id, name, category, status, criticality, location_id, last_maintenance_at, next_maintenance_at, maintenance_frequency_number, maintenance_frequency_unit")
        .eq("company_id", profile.company_id)
        .neq("status", "inactive")
        .order("next_maintenance_at", { ascending: true, nullsFirst: false });

      const locationIds = [...new Set((rawAssets ?? []).map((a) => a.location_id).filter(Boolean))];
      const { data: locs } = locationIds.length
        ? await supabase.from("locations").select("id, name").in("id", locationIds)
        : { data: [] };
      const locMap = new Map((locs ?? []).map((l) => [l.id, l.name]));

      if (isMounted) {
        setAssets((rawAssets ?? []).map((a) => ({
          ...a,
          criticality: a.criticality ?? "medium",
          location_name: a.location_id ? locMap.get(a.location_id) : undefined,
        })));
        setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [profile?.company_id]);

  const withSchedule = assets.filter((a) => a.maintenance_frequency_number && a.maintenance_frequency_unit);
  const overdueCount  = withSchedule.filter((a) => getAssetStatus(a) === "overdue").length;
  const upcomingCount = withSchedule.filter((a) => getAssetStatus(a) === "upcoming").length;

  const filtered = filter === "todos"
    ? assets
    : assets.filter((a) => getAssetStatus(a) === filter);

  const createWorkOrder = (asset: AssetWithPM) => {
    const params = new URLSearchParams({ asset_id: asset.id, type: "preventive", title: `PM – ${asset.name}` });
    window.location.href = `/work-orders/new?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Mantenimiento Preventivo"
        subtitle={`${overdueCount} vencidos · ${upcomingCount} próximos en 30 días`}
        actions={
          <Link href="/work-orders/new" className="btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <Plus size={14} /> Nueva OT Preventiva
          </Link>
        }
      />

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Con programa",  value: withSchedule.length,                               icon: Calendar,      color: "var(--blue)"  },
          { label: "Vencidos",      value: overdueCount,                                       icon: AlertTriangle, color: "var(--red)"   },
          { label: "Próx. 30 días", value: upcomingCount,                                      icon: Clock,         color: "var(--yellow)"},
          { label: "Al día",        value: withSchedule.filter((a) => getAssetStatus(a) === "ok").length, icon: CheckCircle2, color: "var(--green)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="mantix-card">
            <CardContent style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <Icon size={20} color={color} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--t1)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {FILTERS.map(({ key, label }) => {
          const count = key === "todos" ? assets.length : assets.filter((a) => getAssetStatus(a) === key).length;
          return (
            <button key={key} className={`filter-chip ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
              {label}
              {key !== "todos" && (
                <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Card className="mantix-card">
          <CardContent className="p-5 text-[13px] text-muted">Cargando plan preventivo...</CardContent>
        </Card>
      ) : assets.length === 0 ? (
        <WorkspaceEmptyState
          title="Sin activos con mantenimiento preventivo"
          description="Configurá la frecuencia de mantenimiento en cada activo para ver el plan preventivo aquí."
          actionHref="/assets"
          actionLabel="Ir a Activos"
        />
      ) : filtered.length === 0 ? (
        <Card className="mantix-card">
          <CardContent style={{ padding: "40px 24px", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
            No hay activos en esta categoría.
          </CardContent>
        </Card>
      ) : (
        <Card className="mantix-card">
          <CardContent className="p-0">
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Ubicación</th>
                    <th>Frecuencia</th>
                    <th>Criticidad</th>
                    <th>Último PM</th>
                    <th>Próximo PM</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asset) => {
                    const pmStatus = getAssetStatus(asset);
                    const critCfg = CRITICALITY_CONFIG[asset.criticality] ?? { label: asset.criticality, className: "badge" };
                    const days = asset.next_maintenance_at ? daysUntil(asset.next_maintenance_at) : null;

                    return (
                      <tr key={asset.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Wrench size={13} color="var(--t3)" />
                            <Link href={`/assets/${asset.id}`} style={{ fontWeight: 600, color: "var(--t1)", textDecoration: "none" }}>
                              {asset.name}
                            </Link>
                          </div>
                          {asset.category && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{asset.category}</div>}
                        </td>
                        <td className="td-light">{asset.location_name ?? "—"}</td>
                        <td className="td-light">
                          {asset.maintenance_frequency_number && asset.maintenance_frequency_unit
                            ? `Cada ${asset.maintenance_frequency_number} ${UNIT_LABEL[asset.maintenance_frequency_unit] ?? asset.maintenance_frequency_unit}`
                            : <span style={{ color: "var(--t4)" }}>Sin programa</span>}
                        </td>
                        <td><span className={critCfg.className}>{critCfg.label}</span></td>
                        <td className="td-mono">
                          {asset.last_maintenance_at
                            ? new Date(asset.last_maintenance_at).toLocaleDateString("es-AR")
                            : <span style={{ color: "var(--t4)" }}>Nunca</span>}
                        </td>
                        <td>
                          {asset.next_maintenance_at ? (
                            <span style={{ fontSize: 12, color: pmStatus === "overdue" ? "var(--red)" : pmStatus === "upcoming" ? "var(--yellow)" : "var(--t2)" }}>
                              {pmStatus === "overdue" && <AlertTriangle size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />}
                              {new Date(asset.next_maintenance_at).toLocaleDateString("es-AR")}
                            </span>
                          ) : <span className="td-light">—</span>}
                        </td>
                        <td>
                          {pmStatus === "overdue" && (
                            <span className="badge badge-status-blocked">
                              Vencido {days !== null ? `(${Math.abs(days)}d)` : ""}
                            </span>
                          )}
                          {pmStatus === "upcoming" && (
                            <span className="badge badge-status-scheduled">
                              En {days}d
                            </span>
                          )}
                          {pmStatus === "ok" && (
                            <span className="badge badge-status-completed">Al día</span>
                          )}
                          {pmStatus === "no_schedule" && (
                            <span style={{ fontSize: 11, color: "var(--t4)" }}>Sin programa</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn-ghost btn-sm"
                              onClick={() => createWorkOrder(asset)}
                              title="Crear OT preventiva"
                              style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Plus size={11} /> OT
                            </button>
                            <Link href={`/assets/${asset.id}`} className="btn-ghost btn-sm btn-icon" title="Ver activo">
                              <ChevronRight size={13} />
                            </Link>
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

      {/* Info footer */}
      {!isLoading && assets.length > 0 && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--s2)", borderRadius: 10, fontSize: 12, color: "var(--t3)", display: "flex", alignItems: "center", gap: 8 }}>
          <RefreshCw size={13} />
          Las fechas de próximo PM se calculan desde el último mantenimiento registrado + la frecuencia configurada en cada activo.
          <Link href="/assets" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 600 }}>Configurar frecuencias →</Link>
        </div>
      )}
    </div>
  );
}
