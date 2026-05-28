import type { OverviewMetric, PartItem } from "@/types/entities";

export interface PartsOverview {
  metrics: OverviewMetric[];
  items: PartItem[];
}

export async function getPartsOverview(): Promise<PartsOverview> {
  return {
    metrics: [
      { label: "Ítems cargados", value: "0", tone: "brand" },
      { label: "Stock bajo", value: "0", tone: "warning" },
      {
        label: "Activos cubiertos",
        value: "0",
        tone: "success",
      },
      { label: "Críticos", value: "0", tone: "danger" },
    ],
    items: [] as PartItem[],
  };
}
