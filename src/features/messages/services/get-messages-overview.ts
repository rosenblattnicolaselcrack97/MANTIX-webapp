import type { Message, OverviewMetric } from "@/types/entities";

export interface MessagesOverview {
  metrics: OverviewMetric[];
  items: Message[];
  nextMilestone: string;
}

export async function getMessagesOverview(): Promise<MessagesOverview> {
  return {
    metrics: [
      { label: "Sin leer", value: "0", tone: "danger" },
      {
        label: "Hilos con proveedores",
        value: "0",
        tone: "brand",
      },
      {
        label: "Conversaciones activas",
        value: "0",
        tone: "warning",
      },
    ],
    items: [] as Message[],
    nextMilestone:
      "Siguiente etapa: inbox real, filtros por canal y adjuntos por conversación.",
  };
}
