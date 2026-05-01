"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WorkOrderDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  resolution_type: string | null;
  due_date: string | null;
  actual_cost: number | null;
  estimated_cost: number | null;
}

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [detail, setDetail] = useState<WorkOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      if (!profile?.company_id || !params.id) {
        if (isMounted) {
          setDetail(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const { data } = await supabase
        .from("work_orders")
        .select("id, title, description, status, priority, type, resolution_type, due_date, actual_cost, estimated_cost")
        .eq("company_id", profile.company_id)
        .eq("id", params.id)
        .maybeSingle();

      if (isMounted) {
        setDetail(data ?? null);
        setIsLoading(false);
      }
    };

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [params.id, profile?.company_id]);

  return (
    <div>
      <PageHeader
        actions={
          <Button asChild variant="secondary">
            <Link href="/work-orders">Volver</Link>
          </Button>
        }
        subtitle="Detalle real de orden de trabajo"
        title={detail?.title ?? "Orden de Trabajo"}
      />

      {isLoading ? (
        <Card className="mantix-card">
          <CardContent className="p-5 text-[13px] text-muted">Cargando detalle de la orden...</CardContent>
        </Card>
      ) : !detail ? (
        <WorkspaceEmptyState
          description="La orden solicitada no existe o no pertenece a tu empresa."
          title="No pudimos encontrar esta orden"
        />
      ) : (
        <Card className="mantix-card">
          <CardContent className="grid gap-4 p-5 xl:grid-cols-2">
            <div>
              <div className="text-[12px] text-muted-soft">Estado</div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{detail.status}</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-soft">Prioridad</div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{detail.priority}</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-soft">Tipo</div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{detail.type}</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-soft">Resolución</div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{detail.resolution_type ?? "Sin definir"}</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-soft">Vencimiento</div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">
                {detail.due_date ? new Date(detail.due_date).toLocaleDateString("es-AR") : "Sin fecha"}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-muted-soft">Costo estimado</div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">
                {detail.estimated_cost != null ? `$${detail.estimated_cost.toLocaleString("es-AR")}` : "Sin definir"}
              </div>
            </div>
            <div className="xl:col-span-2">
              <div className="text-[12px] text-muted-soft">Descripción</div>
              <div className="mt-1 text-[14px] leading-6 text-muted">
                {detail.description ?? "Sin descripción adicional."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
