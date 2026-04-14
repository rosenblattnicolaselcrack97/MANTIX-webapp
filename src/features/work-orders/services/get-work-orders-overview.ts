import { dashboardWorkOrders } from "@/data/mock/dashboard";
import type { OverviewMetric, WorkOrder } from "@/types/entities";

export interface WorkOrdersOverview {
  metrics: OverviewMetric[];
  items: WorkOrder[];
  nextMilestone: string;
}

export async function getWorkOrdersOverview(): Promise<WorkOrdersOverview> {
  const openOrders = dashboardWorkOrders.filter(
    (order) => order.status === "open" || order.status === "in_progress",
  ).length;
  const urgentOrders = dashboardWorkOrders.filter(
    (order) => order.priority === "urgent" || order.priority === "high",
  ).length;
  const completedOrders = dashboardWorkOrders.filter(
    (order) => order.status === "completed",
  ).length;

  return {
    metrics: [
      { label: "Activas", value: String(openOrders), tone: "brand" },
      { label: "Alta prioridad", value: String(urgentOrders), tone: "danger" },
      { label: "Completadas", value: String(completedOrders), tone: "success" },
    ],
    items: dashboardWorkOrders,
    nextMilestone:
      "Siguiente etapa: alta/edición conectada a backend y vista de detalle por orden.",
  };
}
