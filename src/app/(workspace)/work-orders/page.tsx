import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import {
  getPriorityLabel,
  getPriorityTone,
  getWorkOrderStatusLabel,
  getWorkOrderStatusTone,
  StatusChip,
} from "@/components/shared/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWorkOrdersOverview } from "@/features/work-orders/services/get-work-orders-overview";

export default async function WorkOrdersPage() {
  const overview = await getWorkOrdersOverview();

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Button variant="secondary">Exportar</Button>
            <Button asChild>
              <Link href="/work-orders/new">Nueva Orden</Link>
            </Button>
          </>
        }
        subtitle="15 activas · 3 urgentes sin asignar"
        title="Ordenes de Trabajo"
      />

      <div className="filter-bar">
        <button className="filter-chip active" type="button">
          Todas (61)
        </button>
        <button className="filter-chip" type="button">
          Pendientes (7)
        </button>
        <button className="filter-chip" type="button">
          En curso (8)
        </button>
        <button className="filter-chip" type="button">
          Completadas (43)
        </button>
        <button className="filter-chip" type="button">
          Urgentes (3)
        </button>
      </div>

      <Card className="mantix-card">
        <CardContent className="p-0">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>
                    <input aria-label="Seleccionar todas" type="checkbox" />
                  </th>
                  <th>ID</th>
                  <th>Descripcion</th>
                  <th>Activo</th>
                  <th>Asignado</th>
                  <th>Resolucion</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {overview.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        aria-label={`Seleccionar ${item.id}`}
                        type="checkbox"
                      />
                    </td>
                    <td className="td-mono">#{item.id.replace("OT-", "")}</td>
                    <td>
                      <div className="font-semibold">{item.title}</div>
                      {item.followsWorkOrderId ? (
                        <div className="mt-1 text-[11px] text-muted">
                          Continua la OT #{item.followsWorkOrderId.replace("OT-", "")}
                        </div>
                      ) : item.trade ? (
                        <div className="mt-1 text-[11px] text-muted">
                          Rubro: {item.trade}
                        </div>
                      ) : null}
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
                    <td>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/work-orders/${item.id}`}>Ver →</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
