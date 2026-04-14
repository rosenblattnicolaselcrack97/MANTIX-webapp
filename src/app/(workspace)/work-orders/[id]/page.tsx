import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWorkOrderDetail } from "@/features/work-orders/services/get-work-order-detail";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getWorkOrderDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Badge tone="brand">En curso</Badge>
            <Badge tone="cyan">Externa</Badge>
            <Button>Cerrar orden</Button>
          </>
        }
        subtitle={detail.headerSubtitle}
        title={detail.headerTitle}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="detail-header">
            <div>
              <div className="detail-id">
                # Orden de Trabajo {detail.id.replace("OT-", "")}
              </div>
              <div className="detail-title">{detail.headerTitle}</div>
              <div className="detail-meta">
                {detail.detailMeta.map((item) => (
                  <span key={item}>• {item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">Informacion general</div>
                </div>
                <table>
                  <tbody>
                    {detail.generalInfo.map((row) => (
                      <tr key={row.label}>
                        <td className="border-none px-0 py-[7px] text-[12px] text-muted">
                          {row.label}
                        </td>
                        <td className="border-none px-0 py-[7px] text-right text-[13px] font-semibold">
                          {row.tone === "cyan" ? (
                            <Badge tone="cyan">{row.value}</Badge>
                          ) : row.tone === "brand" ? (
                            <StatusChip label={row.value} tone="brand" />
                          ) : row.label === "Horas" ? (
                            <span className="text-brand">{row.value}</span>
                          ) : (
                            row.value
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">Tareas realizadas</div>
                </div>
                {detail.checklist.map((item) => (
                  <div className="checklist-item" key={item.label}>
                    <div className={`check-box ${item.done ? "done" : "pending"}`}>
                      {item.done ? "✓" : ""}
                    </div>
                    <div className={`check-label ${item.done ? "done" : ""}`}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="mantix-card mt-5">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Continuidad de ordenes</div>
              </div>
              {detail.linkedOrders.length ? (
                <div className="space-y-3">
                  {detail.linkedOrders.map((item) => (
                    <div
                      className="rounded-[10px] border border-line bg-surface-alt p-3"
                      key={`${item.relation}-${item.id}`}
                    >
                      <div className="text-[11px] text-muted-soft">{item.relation}</div>
                      <div className="mt-1 text-[13px] font-semibold text-foreground">
                        {item.id} · {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[10px] border border-line bg-surface-alt p-3 text-[12px] text-muted">
                  Esta orden no tiene otra OT vinculada todavia.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mantix-card mt-5">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">
                  Evidencia fotografica <span className="ia-tag">✦ IA extrae datos</span>
                </div>
              </div>
              <div className="photo-grid">
                {detail.evidence.map((item, index) => (
                  <div
                    className={`photo-thumb ${index === detail.evidence.length - 1 ? "add" : ""}`}
                    key={`${item}-${index}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card mt-5">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Valoracion del proveedor</div>
              </div>
              <div className="rounded-[10px] border border-line bg-surface-alt p-4">
                <div className="mb-2 text-[13px] font-semibold text-foreground">
                  {detail.providerReview.name}
                </div>
                <div className="mb-3 flex gap-1 text-warning">
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index}>
                      {index < detail.providerReview.rating ? "★" : "☆"}
                    </span>
                  ))}
                </div>
                <textarea
                  className="form-control min-h-[60px]"
                  defaultValue=""
                  placeholder="Comentario sobre el servicio..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="stack-20">
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Historial del activo</div>
              </div>
              <div className="timeline">
                {detail.history.map((item) => (
                  <div className="timeline-item" key={item.title}>
                    <div className="timeline-left">
                      <div className="timeline-dot" style={{ background: item.tone }} />
                      <div className="timeline-line" />
                    </div>
                    <div>
                      <div className="timeline-title">{item.title}</div>
                      <div className="timeline-sub">{item.subtitle}</div>
                      <div className="timeline-date">{item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Acciones rapidas</div>
              </div>
              <div className="grid gap-2">
                <Button className="w-full justify-center">Registrar avance</Button>
                <Button asChild className="w-full justify-center" variant="secondary">
                  <Link href="/messages">Enviar mensaje</Link>
                </Button>
                <Button className="w-full justify-center" variant="danger">
                  Cancelar orden
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-5">
        <Button asChild variant="ghost">
          <Link href="/work-orders">← Volver a Ordenes</Link>
        </Button>
      </div>
    </div>
  );
}
