"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardMetric {
  label: string;
  value: number;
}

interface DashboardWorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

interface DashboardAsset {
  id: string;
  name: string;
  status: string;
  next_maintenance_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  scheduled: "Programada",
  completed: "Completada",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  operative: "Operativo",
  review: "Revisar",
  critical: "Crítico",
  inactive: "Inactivo",
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [recentWorkOrders, setRecentWorkOrders] = useState<DashboardWorkOrder[]>([]);
  const [attentionAssets, setAttentionAssets] = useState<DashboardAsset[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      if (!profile?.company_id) {
        if (isMounted) {
          setMetrics([]);
          setRecentWorkOrders([]);
          setAttentionAssets([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const companyFilter = profile.company_id;
      const [
        { count: assetsCount },
        { count: providersCount },
        { data: workOrders },
        { data: assets },
      ] = await Promise.all([
        supabase.from("assets").select("id", { count: "exact", head: true }).eq("company_id", companyFilter),
        supabase.from("providers").select("id", { count: "exact", head: true }).eq("company_id", companyFilter),
        supabase
          .from("work_orders")
          .select("id, title, status, priority, created_at")
          .eq("company_id", companyFilter)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("assets")
          .select("id, name, status, next_maintenance_at")
          .eq("company_id", companyFilter)
          .in("status", ["critical", "review", "inactive"])
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

      const openWorkOrders = (workOrders ?? []).filter(
        (workOrder) => workOrder.status === "pending" || workOrder.status === "in_progress" || workOrder.status === "scheduled",
      ).length;

      if (isMounted) {
        setMetrics([
          { label: "Activos", value: assetsCount ?? 0 },
          { label: "Órdenes activas", value: openWorkOrders },
          { label: "Proveedores", value: providersCount ?? 0 },
        ]);
        setRecentWorkOrders(workOrders ?? []);
        setAttentionAssets(assets ?? []);
        setIsLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id]);

  const hasOperationalData = useMemo(
    () => metrics.some((metric) => metric.value > 0),
    [metrics],
  );

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/assets/new">Nuevo Activo</Link>
            </Button>
            <Button asChild>
              <Link href="/work-orders/new">Nueva Orden</Link>
            </Button>
          </>
        }
        subtitle="Resumen operativo conectado a datos reales"
        title="Dashboard"
      />

      {isLoading ? (
        <div className="kpi-grid">
          {[0, 1, 2].map((item) => (
            <div className="kpi-card" key={item}>
              <div className="kpi-number">...</div>
              <div className="kpi-label">Cargando</div>
            </div>
          ))}
        </div>
      ) : !hasOperationalData ? (
        <WorkspaceEmptyState
          actionHref="/assets/new"
          actionLabel="Crear primer activo"
          description="Todavía no hay activos, órdenes de trabajo ni proveedores cargados para esta empresa. El dashboard se completará automáticamente a medida que empieces a operar en Mantix."
          title="Tu operación todavía está vacía"
        />
      ) : (
        <>
          <div className="kpi-grid">
            {metrics.map((metric) => (
              <div className="kpi-card" key={metric.label}>
                <div className="kpi-number">{metric.value}</div>
                <div className="kpi-label">{metric.label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">Órdenes recientes</div>
                </div>
                {recentWorkOrders.length === 0 ? (
                  <p className="text-[13px] text-muted">Todavía no hay órdenes de trabajo registradas.</p>
                ) : (
                  <div className="table-shell">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Título</th>
                          <th>Estado</th>
                          <th>Prioridad</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentWorkOrders.map((workOrder) => (
                          <tr key={workOrder.id}>
                            <td className="td-mono">{workOrder.id.slice(0, 8)}</td>
                            <td className="font-semibold">{workOrder.title}</td>
                            <td>{STATUS_LABELS[workOrder.status] ?? workOrder.status}</td>
                            <td className="td-light">{workOrder.priority}</td>
                            <td className="td-mono">
                              {new Date(workOrder.created_at).toLocaleDateString("es-AR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">Activos con atención requerida</div>
                </div>
                {attentionAssets.length === 0 ? (
                  <p className="text-[13px] text-muted">No hay activos en revisión, críticos o inactivos.</p>
                ) : (
                  <div className="space-y-3">
                    {attentionAssets.map((asset) => (
                      <div className="rounded-[10px] border border-line bg-surface-alt p-3" key={asset.id}>
                        <div className="text-[13px] font-semibold text-foreground">{asset.name}</div>
                        <div className="mt-1 text-[12px] text-muted">
                          {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                          {asset.next_maintenance_at
                            ? ` · Próximo mantenimiento ${new Date(asset.next_maintenance_at).toLocaleDateString("es-AR")}`
                            : " · Sin próximo mantenimiento definido"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
