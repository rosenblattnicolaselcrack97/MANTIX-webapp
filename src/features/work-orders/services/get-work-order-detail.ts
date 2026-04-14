import { dashboardWorkOrders } from "@/data/mock/dashboard";
import { providers } from "@/data/mock/platform";

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
  const workOrder = dashboardWorkOrders.find((item) => item.id === id);

  if (!workOrder) {
    return null;
  }

  const provider = providers.find((entry) =>
    workOrder.assignee
      .toLowerCase()
      .includes(entry.name.toLowerCase().split(" ")[0]),
  );

  const linkedOrders = [
    ...(workOrder.followsWorkOrderId
      ? dashboardWorkOrders
          .filter((item) => item.id === workOrder.followsWorkOrderId)
          .map((item) => ({
            id: item.id,
            title: item.title,
            relation: "Esta OT continua a",
          }))
      : []),
    ...dashboardWorkOrders
      .filter((item) => item.followsWorkOrderId === workOrder.id)
      .map((item) => ({
        id: item.id,
        title: item.title,
        relation: "Luego continua con",
      })),
  ];

  return {
    id: workOrder.id,
    headerTitle: `Orden #${workOrder.id.replace("OT-", "")} - ${workOrder.title}`,
    headerSubtitle: `${workOrder.assetName} · Creada ${workOrder.dueLabel.toLowerCase()} por Juan Perez`,
    detailMeta: [
      "Alta prioridad",
      `${workOrder.assignee} (${workOrder.resolution === "external" ? "ext." : "interno"})`,
      workOrder.site,
      "2h 15m trabajadas",
      workOrder.resolution === "external" ? "Resolucion externa" : "Resolucion interna",
    ],
    generalInfo: [
      { label: "Activo", value: workOrder.assetName },
      { label: "Rubro", value: workOrder.trade ?? "General" },
      { label: "Tecnico / Proveedor", value: workOrder.assignee },
      {
        label: "Resolucion",
        value: workOrder.resolution === "external" ? "Externa" : "Interna",
        tone: workOrder.resolution === "external" ? "cyan" : "brand",
      },
      { label: "Horas", value: "2h 15m" },
    ],
    checklist: [
      { label: "Diagnostico inicial", done: true },
      { label: "Aislamiento de zona", done: true },
      { label: "Resolucion tecnica", done: false },
      { label: "Prueba de funcionamiento", done: false },
    ],
    evidence: ["📷", "🔩", "🔧", "＋"],
    providerReview: {
      name: provider?.name ?? workOrder.assignee,
      rating: 4,
    },
    linkedOrders,
    history: [
      {
        title: `${workOrder.title} (actual)`,
        subtitle: "En curso",
        date: "Hoy",
        tone: "var(--blue)",
      },
      {
        title: "Mant. preventivo",
        subtitle: "Completo",
        date: "Hace 12 dias",
        tone: "var(--green)",
      },
    ],
  };
}
