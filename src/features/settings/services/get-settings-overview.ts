import type { OverviewMetric } from "@/types/entities";

export interface SettingsOverview {
  metrics: OverviewMetric[];
  nextMilestone: string;
}

export async function getSettingsOverview(): Promise<SettingsOverview> {
  return {
    metrics: [
      { label: "Perfiles previstos", value: "3", tone: "brand" },
      { label: "Integraciones futuras", value: "2", tone: "warning" },
      { label: "Políticas críticas", value: "5", tone: "danger" },
    ],
    nextMilestone:
      "Siguiente etapa: preferencias del workspace, roles y conexiones externas.",
  };
}
