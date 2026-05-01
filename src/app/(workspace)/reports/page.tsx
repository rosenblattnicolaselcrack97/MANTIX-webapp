"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [workOrderCount, setWorkOrderCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadReportReadiness = async () => {
      if (!profile?.company_id) {
        if (isMounted) {
          setWorkOrderCount(0);
          setFailureCount(0);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const [{ count: workOrders }, { count: failures }] = await Promise.all([
        supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id),
        supabase.from("failure_events").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id),
      ]);

      if (isMounted) {
        setWorkOrderCount(workOrders ?? 0);
        setFailureCount(failures ?? 0);
        setIsLoading(false);
      }
    };

    void loadReportReadiness();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id]);

  return (
    <div>
      <PageHeader
        subtitle="Analítica basada en datos reales"
        title="Reportes y Análisis"
      />

      {isLoading ? (
        <Card className="mantix-card">
          <CardContent className="p-5 text-[13px] text-muted">Preparando reportes...</CardContent>
        </Card>
      ) : workOrderCount === 0 && failureCount === 0 ? (
        <WorkspaceEmptyState
          description="Todavía no hay suficiente operación registrada para generar métricas confiables. Cuando cargues órdenes de trabajo y eventos de falla, Mantix podrá calcular reportes reales sin inventar KPIs."
          title="Aún no hay datos para reportes"
        />
      ) : (
        <Card className="mantix-card">
          <CardContent className="p-5 text-[14px] text-muted">
            Hay {workOrderCount} órdenes de trabajo y {failureCount} eventos de falla registrados.
            La siguiente iteración puede construir MTTR, MTBF y costos reales sobre esta base ya no contaminada por datos ficticios.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
