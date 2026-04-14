import { messages } from "@/data/mock/platform";
import type { Message, OverviewMetric } from "@/types/entities";

export interface MessagesOverview {
  metrics: OverviewMetric[];
  items: Message[];
  nextMilestone: string;
}

export async function getMessagesOverview(): Promise<MessagesOverview> {
  const unreadMessages = messages.filter((message) => message.unread).length;
  const providerThreads = messages.filter(
    (message) => message.channel === "provider",
  ).length;

  return {
    metrics: [
      { label: "Sin leer", value: String(unreadMessages), tone: "danger" },
      {
        label: "Hilos con proveedores",
        value: String(providerThreads),
        tone: "brand",
      },
      {
        label: "Conversaciones activas",
        value: String(messages.length),
        tone: "warning",
      },
    ],
    items: messages,
    nextMilestone:
      "Siguiente etapa: inbox real, filtros por canal y adjuntos por conversación.",
  };
}
