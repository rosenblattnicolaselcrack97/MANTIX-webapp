import type { OverviewMetric, WorkOrder } from "@/types/entities";

export interface WorkOrdersOverview {
  metrics: OverviewMetric[];
  items: WorkOrder[];
  nextMilestone: string;
}

export async function getWorkOrdersOverview(): Promise<WorkOrdersOverview> {
  return {
    metrics: [
      { label: "Activas", value: "0", tone: "brand" },
      { label: "Alta prioridad", value: "0", tone: "danger" },
      { label: "Completadas", value: "0", tone: "success" },
    ],
    items: [] as WorkOrder[],
    nextMilestone:
      "Siguiente etapa: alta/edición conectada a backend y vista de detalle por orden.",
  };
}
