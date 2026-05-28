import type { OverviewMetric } from "@/types/entities";

export interface ReportsOverview {
  metrics: OverviewMetric[];
  nextMilestone: string;
}

export async function getReportsOverview(): Promise<ReportsOverview> {
  return {
    metrics: [
      { label: "Cumplimiento", value: "0%", tone: "success" },
      {
        label: "Disponibilidad estimada",
        value: "0%",
        tone: "brand",
      },
      { label: "OT cerradas", value: "0", tone: "warning" },
    ],
    nextMilestone:
      "Siguiente etapa: dashboards analíticos, exportables y cortes por sede/categoría.",
  };
}
