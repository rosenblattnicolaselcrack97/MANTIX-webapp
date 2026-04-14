import { providers } from "@/data/mock/platform";
import type { OverviewMetric, Provider } from "@/types/entities";

export interface ProvidersOverview {
  metrics: OverviewMetric[];
  items: Provider[];
  nextMilestone: string;
}

export async function getProvidersOverview(): Promise<ProvidersOverview> {
  const activeProviders = providers.filter(
    (provider) => provider.status === "active",
  ).length;
  const averageRating =
    providers.reduce((total, provider) => total + provider.rating, 0) /
    providers.length;

  return {
    metrics: [
      { label: "Activos", value: String(activeProviders), tone: "brand" },
      {
        label: "Rating promedio",
        value: averageRating.toFixed(1),
        tone: "success",
      },
      {
        label: "OT en curso",
        value: String(
          providers.reduce(
            (total, provider) => total + provider.activeOrders,
            0,
          ),
        ),
        tone: "warning",
      },
    ],
    items: providers,
    nextMilestone:
      "Siguiente etapa: onboarding, evaluaciones y contratos vinculados a órdenes.",
  };
}
