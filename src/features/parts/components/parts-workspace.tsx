"use client";

import { type FormEvent, useMemo, useState } from "react";

import type { Asset, PartItem } from "@/types/entities";

import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SparePartDraft {
  name: string;
  code: string;
  category: string;
  stock: string;
  minStock: string;
  unit: string;
  supplier: string;
  location: string;
  cost: string;
  criticality: PartItem["criticality"];
  compatibleAssetIds: string[];
}

const initialDraft: SparePartDraft = {
  name: "",
  code: "",
  category: "Mecanica",
  stock: "0",
  minStock: "0",
  unit: "un",
  supplier: "",
  location: "",
  cost: "",
  criticality: "medium",
  compatibleAssetIds: [],
};

function createPartId() {
  return `part-${Math.random().toString(36).slice(2, 10)}`;
}

interface PartsWorkspaceProps {
  assets: Asset[];
  initialItems: PartItem[];
}

export function PartsWorkspace({ assets, initialItems }: PartsWorkspaceProps) {
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState<SparePartDraft>(initialDraft);

  const lowStockCount = useMemo(
    () => items.filter((item) => item.stock <= item.minStock).length,
    [items],
  );

  const setField = <K extends keyof SparePartDraft>(
    key: K,
    value: SparePartDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleAsset = (assetId: string) => {
    setDraft((current) => ({
      ...current,
      compatibleAssetIds: current.compatibleAssetIds.includes(assetId)
        ? current.compatibleAssetIds.filter((currentId) => currentId !== assetId)
        : [...current.compatibleAssetIds, assetId],
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const nextItem: PartItem = {
      id: createPartId(),
      name: draft.name || "Nuevo repuesto",
      code: draft.code || `SKU-${items.length + 1}`,
      category: draft.category,
      stock: Number(draft.stock),
      minStock: Number(draft.minStock),
      unit: draft.unit,
      supplier: draft.supplier || "Proveedor pendiente",
      location: draft.location || "Ubicacion pendiente",
      compatibleAssetIds: draft.compatibleAssetIds,
      cost: Number(draft.cost || 0),
      criticality: draft.criticality,
    };

    setItems((current) => [nextItem, ...current]);
    setDraft(initialDraft);
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button form="parts-form" type="submit">
            Nuevo repuesto
          </Button>
        }
        subtitle={`Items cargados: ${items.length} · Stock bajo: ${lowStockCount}`}
        title="Stock y Repuestos"
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <Card className="mantix-card">
          <CardContent className="p-0">
            <div className="border-b border-line px-5 py-5">
              <div className="text-[16px] font-bold text-foreground">Stock actual</div>
              <div className="text-[13px] text-muted">
                Vista rapida de repuestos criticos, bajo stock y activos cubiertos.
              </div>
            </div>

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Repuesto</th>
                    <th>Stock</th>
                    <th>Minimo</th>
                    <th>Proveedor</th>
                    <th>Compatibilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const lowStock = item.stock <= item.minStock;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{item.name}</div>
                            <div className="td-mono">
                              {item.code} · {item.location}
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusChip
                            label={`${item.stock} ${item.unit}`}
                            tone={lowStock ? "warning" : "success"}
                          />
                        </td>
                        <td className="td-light">{item.minStock}</td>
                        <td className="td-light">{item.supplier}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            {item.compatibleAssetIds.length ? (
                              item.compatibleAssetIds.map((assetId) => {
                                const asset = assets.find((entry) => entry.id === assetId);
                                return (
                                  <StatusChip
                                    key={`${item.id}-${assetId}`}
                                    label={asset?.code ?? assetId}
                                    tone="brand"
                                  />
                                );
                              })
                            ) : (
                              <StatusChip label="Sin relacion" tone="neutral" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <form id="parts-form" onSubmit={handleSubmit}>
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Alta rapida de repuesto</div>
              </div>
              <div className="form-stack">
                <label>
                  <span className="form-label">Nombre</span>
                  <Input
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder="Ej: Rodamiento 6205 ZZ"
                    value={draft.name}
                  />
                </label>
                <label>
                  <span className="form-label">Codigo / SKU</span>
                  <Input
                    onChange={(event) => setField("code", event.target.value)}
                    placeholder="Codigo interno"
                    value={draft.code}
                  />
                </label>
                <label>
                  <span className="form-label">Categoria</span>
                  <select
                    className="form-control h-9"
                    onChange={(event) => setField("category", event.target.value)}
                    value={draft.category}
                  >
                    <option value="Mecanica">Mecanica</option>
                    <option value="Electrica">Electrica</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Instrumentacion">Instrumentacion</option>
                  </select>
                </label>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Stock</span>
                    <Input
                      onChange={(event) => setField("stock", event.target.value)}
                      type="number"
                      value={draft.stock}
                    />
                  </label>
                  <label>
                    <span className="form-label">Stock minimo</span>
                    <Input
                      onChange={(event) => setField("minStock", event.target.value)}
                      type="number"
                      value={draft.minStock}
                    />
                  </label>
                </div>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Unidad</span>
                    <Input
                      onChange={(event) => setField("unit", event.target.value)}
                      value={draft.unit}
                    />
                  </label>
                  <label>
                    <span className="form-label">Costo</span>
                    <Input
                      onChange={(event) => setField("cost", event.target.value)}
                      placeholder="Monto"
                      value={draft.cost}
                    />
                  </label>
                </div>
                <label>
                  <span className="form-label">Proveedor</span>
                  <Input
                    onChange={(event) => setField("supplier", event.target.value)}
                    placeholder="Proveedor"
                    value={draft.supplier}
                  />
                </label>
                <label>
                  <span className="form-label">Ubicacion</span>
                  <Input
                    onChange={(event) => setField("location", event.target.value)}
                    placeholder="Rack, deposito o gabinete"
                    value={draft.location}
                  />
                </label>
                <label>
                  <span className="form-label">Criticidad</span>
                  <select
                    className="form-control h-9"
                    onChange={(event) =>
                      setField(
                        "criticality",
                        event.target.value as SparePartDraft["criticality"],
                      )
                    }
                    value={draft.criticality}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </label>

                <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                  <div className="mb-3 text-[13px] font-bold text-foreground">
                    Activos compatibles
                  </div>
                  <div className="space-y-2">
                    {assets.map((asset) => {
                      const active = draft.compatibleAssetIds.includes(asset.id);

                      return (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between rounded-[10px] border px-3 py-3 text-left transition-all",
                            active
                              ? "border-brand bg-brand/8"
                              : "border-line bg-surface",
                          )}
                          key={asset.id}
                          onClick={() => toggleAsset(asset.id)}
                          type="button"
                        >
                          <div>
                            <div className="text-[13px] font-semibold text-foreground">
                              {asset.name}
                            </div>
                            <div className="text-[11px] text-muted">{asset.code}</div>
                          </div>
                          <StatusChip
                            dot={false}
                            label={active ? "Incluido" : "Agregar"}
                            tone={active ? "success" : "neutral"}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
