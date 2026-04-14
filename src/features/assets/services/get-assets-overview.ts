import { dashboardAlerts, trackedAssets } from "@/data/mock/dashboard";
import type { Asset, OverviewMetric } from "@/types/entities";

export interface AssetsOverview {
  metrics: OverviewMetric[];
  items: Asset[];
  alertCount: number;
  nextMilestone: string;
}

export async function getAssetsOverview(): Promise<AssetsOverview> {
  const criticalAssets = trackedAssets.filter(
    (asset) => asset.status === "critical" || asset.status === "warning",
  ).length;

  return {
    metrics: [
      {
        label: "Activos trazados",
        value: String(trackedAssets.length),
        tone: "brand",
      },
      {
        label: "Con observación",
        value: String(criticalAssets),
        tone: "warning",
      },
      {
        label: "Alertas abiertas",
        value: String(dashboardAlerts.length),
        tone: "danger",
      },
    ],
    items: trackedAssets,
    alertCount: dashboardAlerts.length,
    nextMilestone:
      "Siguiente etapa: ficha por activo, historial completo y mantenimiento preventivo editable.",
  };
}
