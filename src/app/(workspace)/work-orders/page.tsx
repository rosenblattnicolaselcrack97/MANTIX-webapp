"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  resolution_type: string | null;
  created_at: string;
  asset_name?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  scheduled: "Programada",
  completed: "Completada",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
};

export default function WorkOrdersPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<WorkOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadWorkOrders = async () => {
      if (!profile?.company_id) {
        if (isMounted) {
          setItems([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("id, title, asset_id, priority, status, resolution_type, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      const assetIds = [...new Set((workOrders ?? []).map((workOrder) => workOrder.asset_id).filter(Boolean))];
      const { data: assets } = assetIds.length
        ? await supabase.from("assets").select("id, name").in("id", assetIds)
        : { data: [] };

      const assetMap = new Map((assets ?? []).map((asset) => [asset.id, asset.name]));

      if (isMounted) {
        setItems(
          (workOrders ?? []).map((workOrder) => ({
            ...workOrder,
            asset_name: workOrder.asset_id ? assetMap.get(workOrder.asset_id) : undefined,
          })),
        );
        setIsLoading(false);
      }
    };

    void loadWorkOrders();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id]);

  const activeCount = items.filter((item) => item.status !== "completed" && item.status !== "cancelled").length;
  const urgentCount = items.filter((item) => item.priority === "urgent").length;

  return (
    <div>
      <PageHeader
        actions={
          <Button asChild>
            <Link href="/work-orders/new">Nueva Orden</Link>
          </Button>
        }
        subtitle={`${activeCount} activas · ${urgentCount} urgentes`}
        title="Órdenes de Trabajo"
      />

      {isLoading ? (
        <Card className="mantix-card">
          <CardContent className="p-5 text-[13px] text-muted">Cargando órdenes de trabajo...</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <WorkspaceEmptyState
          actionHref="/work-orders/new"
          actionLabel="Crear primera orden"
          description="Todavía no hay órdenes de trabajo registradas. Cuando empieces a operar, esta vista mostrará su estado, prioridad y activo asociado con datos reales."
          title="Todavía no hay órdenes de trabajo"
        />
      ) : (
        <Card className="mantix-card">
          <CardContent className="p-0">
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Descripción</th>
                    <th>Activo</th>
                    <th>Resolución</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="td-mono">{item.id.slice(0, 8)}</td>
                      <td className="font-semibold">{item.title}</td>
                      <td className="td-light">{item.asset_name ?? "Sin activo"}</td>
                      <td className="td-light">{item.resolution_type ?? "Sin definir"}</td>
                      <td className="td-light">{item.priority}</td>
                      <td>{STATUS_LABELS[item.status] ?? item.status}</td>
                      <td className="td-mono">{new Date(item.created_at).toLocaleDateString("es-AR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
