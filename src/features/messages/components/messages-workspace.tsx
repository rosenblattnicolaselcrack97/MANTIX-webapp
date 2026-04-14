"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Message } from "@/types/entities";

import { dashboardWorkOrders } from "@/data/mock/dashboard";
import { currentUser, providers } from "@/data/mock/platform";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface MessagesWorkspaceProps {
  items: Message[];
}

interface DispatchResult {
  prompt: string;
  workOrderId: string;
  recipients: string[];
  summary: string;
}

function buildRecipients(prompt: string, workOrderId: string) {
  const order = dashboardWorkOrders.find((item) => item.id === workOrderId);
  const promptText = `${prompt} ${order?.title ?? ""} ${order?.trade ?? ""}`.toLowerCase();
  const byKeyword = providers.filter((provider) =>
    [
      provider.specialty.toLowerCase(),
      provider.name.toLowerCase(),
      order?.trade?.toLowerCase() ?? "",
    ].some((entry) =>
      entry &&
      (promptText.includes(entry.split(" ")[0]) ||
        entry.split(" ").some((token) => promptText.includes(token))),
    ),
  );

  const fallback = providers.filter((provider) => {
    const specialty = provider.specialty.toLowerCase();
    if (promptText.includes("mataf")) return specialty.includes("incendio");
    if (promptText.includes("porton")) return specialty.includes("portones");
    if (promptText.includes("camara") || promptText.includes("seguridad")) {
      return specialty.includes("seguridad");
    }
    if (promptText.includes("gas") || promptText.includes("plomer")) {
      return specialty.includes("plomeria") || specialty.includes("gas");
    }
    if (promptText.includes("aire") || promptText.includes("clima")) {
      return specialty.includes("climatizacion") || specialty.includes("hvac");
    }
    return false;
  });

  const recipients = [...byKeyword, ...fallback]
    .filter(
      (provider, index, array) =>
        array.findIndex((candidate) => candidate.id === provider.id) === index,
    )
    .slice(0, 4);

  return recipients.length
    ? recipients
    : providers
        .filter((provider) =>
          order?.resolution === "external"
            ? provider.status === "active"
            : provider.specialty.toLowerCase().includes("seguridad"),
        )
        .slice(0, 3);
}

export function MessagesWorkspace({ items }: MessagesWorkspaceProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [assistantPrompt, setAssistantPrompt] = useState(
    "Enviale esta OT a proveedores de aire acondicionado y seguridad.",
  );
  const [selectedOrderId, setSelectedOrderId] = useState(
    dashboardWorkOrders[0]?.id ?? "",
  );
  const [dispatchLog, setDispatchLog] = useState<DispatchResult[]>([]);

  const activeMessage = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0],
    [activeId, items],
  );
  const selectedOrder = useMemo(
    () => dashboardWorkOrders.find((item) => item.id === selectedOrderId),
    [selectedOrderId],
  );

  const handleDispatch = () => {
    const recipients = buildRecipients(assistantPrompt, selectedOrderId);
    setDispatchLog((current) => [
      {
        prompt: assistantPrompt,
        workOrderId: selectedOrderId,
        recipients: recipients.map((item) => item.name),
        summary: `Despache ${selectedOrderId} a ${recipients
          .map((item) => item.name)
          .join(", ")}.`,
      },
      ...current,
    ]);
  };

  return (
    <div>
      <PageHeader
        actions={<Button>Nuevo mensaje</Button>}
        subtitle="Comunicacion entre usuarios internos y proveedores"
        title="Mensajes"
      />

      <div className="message-layout">
        <Card className="mantix-card">
          <CardContent className="p-5">
            <div className="card-title-row">
              <div className="card-title">Conversaciones</div>
            </div>

            {items.map((item) => (
              <button
                className={`conversation-item w-full text-left ${item.id === activeMessage?.id ? "active" : ""}`}
                key={item.id}
                onClick={() => setActiveId(item.id)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="avatar-sm !h-8 !w-8 !text-[12px]">
                    {item.counterpart
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-foreground">
                      {item.counterpart}
                    </div>
                    <div className="truncate text-[11px] text-muted">
                      {item.subject}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-soft">
                    {item.updatedAtLabel}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="stack-20">
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[14px] font-bold text-foreground">
                  {activeMessage?.counterpart}
                </div>
                {activeMessage?.relatedWorkOrderId ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/work-orders/${activeMessage.relatedWorkOrderId}`}>
                      Ver OT
                    </Link>
                  </Button>
                ) : null}
              </div>

              {activeMessage ? (
                <>
                  <div className="message-bubble incoming">
                    <div className="mb-1 text-[12px] font-semibold text-brand">
                      {activeMessage.counterpart}
                    </div>
                    <div className="text-[13px] text-foreground">
                      {activeMessage.snippet}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-soft">
                      {activeMessage.updatedAtLabel}
                    </div>
                  </div>

                  <div className="message-bubble outgoing">
                    <div className="mb-1 text-[12px] font-semibold text-brand">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[13px] text-foreground">
                      Perfecto, aprobado. ¿Pueden arrancar mañana?
                    </div>
                    <div className="mt-1 text-[10px] text-muted-soft">10:45</div>
                  </div>
                </>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Input className="flex-1" placeholder="Escribir mensaje..." />
                <Button>Enviar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Asistente de despacho</div>
                <div className="ia-tag">✦ IA demo</div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
                    Orden de trabajo
                  </div>
                  <select
                    className="form-control h-9"
                    onChange={(event) => setSelectedOrderId(event.target.value)}
                    value={selectedOrderId}
                  >
                    {dashboardWorkOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.id} · {order.title}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 text-[12px] text-muted">
                    {selectedOrder?.assetName} · {selectedOrder?.trade ?? "General"}
                  </div>
                </div>

                <div className="rounded-[10px] border border-brand/20 bg-brand/8 p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
                    Instruccion
                  </div>
                  <textarea
                    className="form-control min-h-[88px]"
                    onChange={(event) => setAssistantPrompt(event.target.value)}
                    value={assistantPrompt}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      "Mandala a varios contactos de aire acondicionado.",
                      "Avisa a seguridad y al proveedor del porton.",
                      "Deriva esta OT a plomeria y gasista.",
                    ].map((prompt) => (
                      <button
                        className="filter-chip"
                        key={prompt}
                        onClick={() => setAssistantPrompt(prompt)}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={handleDispatch}>Despachar OT a contactos</Button>
                <div className="text-[12px] text-muted">
                  Demo: genera un envio ficticio a multiples destinatarios.
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {dispatchLog.length ? (
                  dispatchLog.map((entry, index) => (
                    <div
                      className="rounded-[10px] border border-line bg-surface-alt p-3"
                      key={`${entry.workOrderId}-${index}`}
                    >
                      <div className="text-[12px] font-semibold text-foreground">
                        {entry.summary}
                      </div>
                      <div className="mt-1 text-[11px] text-muted">
                        Prompt: {entry.prompt}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.recipients.map((recipient) => (
                          <span className="filter-chip active" key={recipient}>
                            {recipient}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[10px] border border-line bg-surface-alt p-3 text-[12px] text-muted">
                    Escribi una instruccion y el asistente ficticio va a simular el
                    envio de la OT a varios contactos internos o proveedores.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
