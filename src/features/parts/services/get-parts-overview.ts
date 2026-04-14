import { trackedAssets } from "@/data/mock/dashboard";
import { partInventory } from "@/data/mock/parts";
import type { OverviewMetric, PartItem } from "@/types/entities";

export interface PartsOverview {
  metrics: OverviewMetric[];
  items: PartItem[];
}

export async function getPartsOverview(): Promise<PartsOverview> {
  const lowStock = partInventory.filter((item) => item.stock <= item.minStock).length;
  const criticalItems = partInventory.filter(
    (item) => item.criticality === "high",
  ).length;

  return {
    metrics: [
      { label: "Ítems cargados", value: String(partInventory.length), tone: "brand" },
      { label: "Stock bajo", value: String(lowStock), tone: "warning" },
      {
        label: "Activos cubiertos",
        value: String(trackedAssets.length),
        tone: "success",
      },
      { label: "Críticos", value: String(criticalItems), tone: "danger" },
    ],
    items: partInventory,
  };
}
