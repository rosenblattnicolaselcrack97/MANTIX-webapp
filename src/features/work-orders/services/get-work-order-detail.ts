
export interface WorkOrderDetail {
  id: string;
  headerTitle: string;
  headerSubtitle: string;
  detailMeta: string[];
  generalInfo: Array<{ label: string; value: string; tone?: "brand" | "cyan" }>;
  checklist: Array<{ label: string; done: boolean }>;
  evidence: string[];
  providerReview: {
    name: string;
    rating: number;
  };
  history: Array<{ title: string; subtitle: string; date: string; tone: string }>;
  linkedOrders: Array<{ id: string; title: string; relation: string }>;
}

export async function getWorkOrderDetail(
  id: string,
): Promise<WorkOrderDetail | null> {
  return {
    id,
    headerTitle: `Orden #${id}`,
    headerSubtitle: "Detalle operativo sin datos mock",
    detailMeta: [],
    generalInfo: [],
    checklist: [],
    evidence: [],
    providerReview: {
      name: "Sin proveedor",
      rating: 0,
    },
    linkedOrders: [],
    history: [],
  };
}
