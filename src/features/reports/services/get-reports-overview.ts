import {
  dashboardKpis,
  dashboardWorkOrders,
  trackedAssets,
} from "@/data/mock/dashboard";
import { mantixCompany } from "@/data/mock/platform";
import type { OverviewMetric } from "@/types/entities";

export interface ReportsOverview {
  metrics: OverviewMetric[];
  nextMilestone: string;
}

export async function getReportsOverview(): Promise<ReportsOverview> {
  const availability =
    100 -
    Math.round(
      (trackedAssets.filter((asset) => asset.status === "critical").length /
        trackedAssets.length) *
        100,
    );
  const completedOrders = dashboardWorkOrders.filter(
    (order) => order.status === "completed",
  ).length;
  const compliance =
    dashboardKpis.find((kpi) => kpi.id === "kpi-compliance")?.value ??
    `${mantixCompany.complianceScore}%`;

  return {
    metrics: [
      { label: "Cumplimiento", value: compliance, tone: "success" },
      {
        label: "Disponibilidad estimada",
        value: `${availability}%`,
        tone: "brand",
      },
      { label: "OT cerradas", value: String(completedOrders), tone: "warning" },
    ],
    nextMilestone:
      "Siguiente etapa: dashboards analíticos, exportables y cortes por sede/categoría.",
  };
}
