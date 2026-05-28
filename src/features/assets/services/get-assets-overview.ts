import type { Asset, OverviewMetric } from "@/types/entities";

export interface AssetsOverview {
  metrics: OverviewMetric[];
  items: Asset[];
  alertCount: number;
  nextMilestone: string;
}

export async function getAssetsOverview(): Promise<AssetsOverview> {
  return {
    metrics: [
      {
        label: "Activos trazados",
        value: "0",
        tone: "brand",
      },
      {
        label: "Con observación",
        value: "0",
        tone: "warning",
      },
      {
        label: "Alertas abiertas",
        value: "0",
        tone: "danger",
      },
    ],
    items: [] as Asset[],
    alertCount: 0,
    nextMilestone:
      "Siguiente etapa: ficha por activo, historial completo y mantenimiento preventivo editable.",
  };
}
