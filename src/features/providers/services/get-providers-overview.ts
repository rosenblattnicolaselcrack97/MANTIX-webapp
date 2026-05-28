import type { OverviewMetric, Provider } from "@/types/entities";

export interface ProvidersOverview {
  metrics: OverviewMetric[];
  items: Provider[];
  nextMilestone: string;
}

export async function getProvidersOverview(): Promise<ProvidersOverview> {
  return {
    metrics: [
      { label: "Activos", value: "0", tone: "brand" },
      {
        label: "Rating promedio",
        value: "0.0",
        tone: "success",
      },
      {
        label: "OT en curso",
        value: "0",
        tone: "warning",
      },
    ],
    items: [] as Provider[],
    nextMilestone:
      "Siguiente etapa: onboarding, evaluaciones y contratos vinculados a órdenes.",
  };
}
