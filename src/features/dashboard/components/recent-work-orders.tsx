import Link from "next/link";

import type { WorkOrder } from "@/types/entities";

import {
  getPriorityLabel,
  getPriorityTone,
  getWorkOrderStatusLabel,
  getWorkOrderStatusTone,
  StatusChip,
} from "@/components/shared/status-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function RecentWorkOrders({ items }: { items: WorkOrder[] }) {
  return (
    <Card className="mantix-card">
      <CardContent className="p-5">
        <div className="card-title-row">
          <div className="card-title">Ordenes recientes</div>
          <Link className="card-link" href="/work-orders">
            Ver todas →
          </Link>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Descripcion</th>
                <th>Activo</th>
                <th>Asignado</th>
                <th>Resolucion</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 4).map((item) => (
                <tr key={item.id}>
                  <td className="td-mono">#{item.id.replace("OT-", "")}</td>
                  <td className="font-semibold">
                    <Link href={`/work-orders/${item.id}`}>{item.title}</Link>
                  </td>
                  <td className="td-light">{item.assetName}</td>
                  <td>
                    {item.assignee === "Sin asignar" ? (
                      <span className="text-[12px] text-danger">⚠ Sin asignar</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="avatar-sm">
                          {item.assignee
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        {item.assignee}
                      </div>
                    )}
                  </td>
                  <td>
                    {item.resolution === "external" ? (
                      <Badge tone="cyan">Externa</Badge>
                    ) : (
                      <StatusChip label="Interna" tone="brand" />
                    )}
                  </td>
                  <td>
                    <StatusChip
                      label={getPriorityLabel(item.priority)}
                      tone={getPriorityTone(item.priority)}
                    />
                  </td>
                  <td>
                    <StatusChip
                      label={getWorkOrderStatusLabel(item.status)}
                      tone={getWorkOrderStatusTone(item.status)}
                    />
                  </td>
                  <td className="td-mono">{item.dueLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
