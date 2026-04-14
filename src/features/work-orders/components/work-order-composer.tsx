"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import type { Asset, WorkOrder, WorkOrderDraft } from "@/types/entities";

import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initialDraft: WorkOrderDraft = {
  title: "",
  type: "correctivo",
  priority: "high",
  status: "open",
  site: "",
  assignee: "",
  resolution: "external",
  dueAt: "2026-03-20",
  estimatedHours: "3",
  assetIds: [],
  followsWorkOrderId: "",
  description: "Ruido anormal en rodamiento trasero.",
  checklist: [],
  observations: "",
  attachments: [],
};

interface WorkOrderComposerProps {
  assets: Asset[];
  assignees: string[];
  relatedOrders: WorkOrder[];
  sites: string[];
}

export function WorkOrderComposer({
  assets,
  assignees,
  relatedOrders,
  sites,
}: WorkOrderComposerProps) {
  const [draft, setDraft] = useState<WorkOrderDraft>(initialDraft);
  const [submitted, setSubmitted] = useState(false);

  const selectedAsset = useMemo(
    () => assets.find((asset) => draft.assetIds[0] === asset.id),
    [assets, draft.assetIds],
  );
  const linkedOrder = useMemo(
    () =>
      relatedOrders.find((order) => order.id === draft.followsWorkOrderId) ?? null,
    [draft.followsWorkOrderId, relatedOrders],
  );

  const setField = <K extends keyof WorkOrderDraft>(
    key: K,
    value: WorkOrderDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/work-orders">Cancelar</Link>
            </Button>
            <Button form="new-work-order-form" type="submit">
              Crear Orden
            </Button>
          </>
        }
        subtitle="Completa los datos para registrar la intervencion"
        title="Nueva Orden de Trabajo"
      />

      <form
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
        id="new-work-order-form"
        onSubmit={handleSubmit}
      >
        <div className="stack-20">
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Informacion del trabajo</div>
              </div>

              <div className="form-stack">
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Activo *</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) => setField("assetIds", [event.target.value])}
                      value={draft.assetIds[0] ?? ""}
                    >
                      <option value="">Seleccionar activo...</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="form-label">Tipo *</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) => setField("type", event.target.value)}
                      value={draft.type}
                    >
                      <option value="correctivo">Correctivo</option>
                      <option value="preventivo">Preventivo</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span className="form-label">Descripcion *</span>
                  <Textarea
                    onChange={(event) => setField("description", event.target.value)}
                    placeholder="Describi el problema..."
                    value={draft.description}
                  />
                </label>

                <label>
                  <span className="form-label">Orden vinculada</span>
                  <select
                    className="form-control h-9"
                    onChange={(event) =>
                      setField("followsWorkOrderId", event.target.value)
                    }
                    value={draft.followsWorkOrderId}
                  >
                    <option value="">Sin relacion previa</option>
                    {relatedOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.id} · {order.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-grid-2">
                  <div>
                    <span className="form-label">Prioridad *</span>
                    <div className="choice-row">
                      {[
                        ["low", "Baja", "active-success"],
                        ["high", "Alta", "active-warning"],
                        ["urgent", "Urgente", "active-danger"],
                      ].map(([value, label, className]) => (
                        <button
                          className={cn(
                            "choice-item",
                            draft.priority === value && className,
                          )}
                          key={value}
                          onClick={() =>
                            setField("priority", value as WorkOrderDraft["priority"])
                          }
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="form-label">Resolucion *</span>
                    <div className="choice-row">
                      {[
                        ["internal", "Interna", "active-brand"],
                        ["external", "Externa", "active-cyan"],
                      ].map(([value, label, className]) => (
                        <button
                          className={cn(
                            "choice-item",
                            draft.resolution === value && className,
                          )}
                          key={value}
                          onClick={() =>
                            setField(
                              "resolution",
                              value as WorkOrderDraft["resolution"],
                            )
                          }
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Asignado a</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) => setField("assignee", event.target.value)}
                      value={draft.assignee}
                    >
                      <option value="">Seleccionar responsable...</option>
                      {assignees.map((assignee) => (
                        <option key={assignee} value={assignee}>
                          {assignee}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="form-label">Fecha limite</span>
                    <Input
                      onChange={(event) => setField("dueAt", event.target.value)}
                      type="date"
                      value={draft.dueAt}
                    />
                  </label>
                </div>

                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Sitio</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) => setField("site", event.target.value)}
                      value={draft.site}
                    >
                      <option value="">Seleccionar sitio...</option>
                      {sites.map((site) => (
                        <option key={site} value={site}>
                          {site}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="form-label">Horas estimadas</span>
                    <Input
                      onChange={(event) =>
                        setField("estimatedHours", event.target.value)
                      }
                      type="number"
                      value={draft.estimatedHours}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Evidencia fotografica</div>
                <div className="text-[11px] text-muted">(opcional)</div>
              </div>
              <label className="upload-area block cursor-pointer">
                <div className="upload-icon">📷</div>
                <div className="upload-title">
                  Arrastra imagenes o hace clic para seleccionar
                </div>
                <div className="upload-subtitle">PNG o JPG · Maximo 5MB</div>
                <input
                  className="hidden"
                  multiple
                  onChange={(event) =>
                    setField("attachments", Array.from(event.target.files ?? []))
                  }
                  type="file"
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="stack-20">
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">
                  Asistente IA <span className="ia-tag">✦ IA</span>
                </div>
              </div>
              <div className="rounded-[10px] border border-brand/20 bg-brand/8 p-4 text-[13px] leading-6 text-muted">
                Basado en el historial del{" "}
                <strong className="text-foreground">
                  {selectedAsset?.name ?? "activo seleccionado"}
                </strong>
                , la IA sugiere una inspeccion corta antes de ejecutar y dejar
                registrada la OT relacionada si esta tarea continua una falla previa.
              </div>
              <div className="mt-2 rounded-[10px] border border-line bg-surface-alt p-3 text-[12px] text-muted">
                <strong className="text-brand">Posible causa:</strong> desgaste o
                mantenimiento vencido.
              </div>
              <div className="mt-2 rounded-[10px] border border-line bg-surface-alt p-3 text-[12px] text-muted">
                <strong className="text-brand">Tiempo estimado:</strong> 2 a 3 horas.
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Resumen rapido</div>
              </div>
              <div className="space-y-3">
                <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                  <div className="text-[11px] text-muted-soft">Activo</div>
                  <div className="mt-1 text-[13px] font-semibold text-foreground">
                    {selectedAsset?.name ?? "Sin seleccionar"}
                  </div>
                </div>
                <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                  <div className="text-[11px] text-muted-soft">Responsable</div>
                  <div className="mt-1 text-[13px] font-semibold text-foreground">
                    {draft.assignee || "Sin asignar"}
                  </div>
                </div>
                <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                  <div className="text-[11px] text-muted-soft">Orden previa</div>
                  <div className="mt-1 text-[13px] font-semibold text-foreground">
                    {linkedOrder
                      ? `${linkedOrder.id} · ${linkedOrder.title}`
                      : "Sin orden vinculada"}
                  </div>
                </div>
                <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                  <div className="text-[11px] text-muted-soft">Adjuntos</div>
                  <div className="mt-1 text-[13px] font-semibold text-foreground">
                    {draft.attachments.length} archivos
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusChip
                  label={draft.resolution === "external" ? "Externa" : "Interna"}
                  tone={draft.resolution === "external" ? "warning" : "brand"}
                />
                <StatusChip
                  label={
                    draft.priority === "urgent"
                      ? "Urgente"
                      : draft.priority === "high"
                        ? "Alta"
                        : "Baja"
                  }
                  tone={
                    draft.priority === "urgent"
                      ? "danger"
                      : draft.priority === "high"
                        ? "warning"
                        : "success"
                  }
                />
              </div>

              {submitted ? (
                <div className="mt-4 rounded-[10px] border border-success/30 bg-success/10 p-3 text-[12px] text-success">
                  Orden creada en modo demo. Si seleccionaste una orden previa,
                  la cadena de continuidad ya queda representada en la UI.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
