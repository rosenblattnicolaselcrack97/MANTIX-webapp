"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import type { AssetDraft } from "@/types/entities";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialDraft: AssetDraft = {
  name: "",
  code: "",
  category: "",
  site: "",
  criticality: "medium",
  brand: "",
  model: "",
  serialNumber: "",
  purchaseDate: "",
  purchaseProvider: "",
  purchaseLocation: "",
  cost: "",
  installedBy: "",
  installationDate: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  maintenanceFrequency: "Mensual",
  warrantyUntil: "",
  notes: "",
  motors: [],
  specs: [],
  media: [],
};

interface AssetRegistrationFormProps {
  categories: string[];
  providers: string[];
  sites: string[];
}

export function AssetRegistrationForm({
  categories,
  providers,
  sites,
}: AssetRegistrationFormProps) {
  const [draft, setDraft] = useState<AssetDraft>(initialDraft);
  const [submitted, setSubmitted] = useState(false);

  const setField = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) => {
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
              <Link href="/assets">Cancelar</Link>
            </Button>
            <Button form="new-asset-form" type="submit">
              Guardar Activo
            </Button>
          </>
        }
        subtitle="Completa la informacion del equipo para agregarlo al sistema"
        title="Registrar Nuevo Activo"
      />

      <form
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
        id="new-asset-form"
        onSubmit={handleSubmit}
      >
        <div className="stack-20">
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Datos principales</div>
              </div>
              <div className="form-stack">
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Nombre del activo *</span>
                    <Input
                      onChange={(event) => setField("name", event.target.value)}
                      placeholder="Ej: Compresor Industrial A3"
                      value={draft.name}
                    />
                  </label>
                  <label>
                    <span className="form-label">Codigo interno *</span>
                    <Input
                      onChange={(event) => setField("code", event.target.value)}
                      placeholder="Ej: CPR-2019-A3"
                      value={draft.code}
                    />
                  </label>
                </div>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Categoria *</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) => setField("category", event.target.value)}
                      value={draft.category}
                    >
                      <option value="">Seleccionar categoria...</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Subcategoria</span>
                    <Input placeholder="Ej: Compresores, Motores..." />
                  </label>
                </div>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Sucursal / Ubicacion *</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) => setField("site", event.target.value)}
                      value={draft.site}
                    >
                      <option value="">Seleccionar ubicacion...</option>
                      {sites.map((site) => (
                        <option key={site} value={site}>
                          {site}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Sector / Area *</span>
                    <Input placeholder="Ej: Planta baja, Sector produccion" />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Datos tecnicos</div>
              </div>
              <div className="form-stack">
                <div className="form-grid-3">
                  <label>
                    <span className="form-label">Marca</span>
                    <Input
                      onChange={(event) => setField("brand", event.target.value)}
                      placeholder="Ej: Atlas Copco"
                      value={draft.brand}
                    />
                  </label>
                  <label>
                    <span className="form-label">Modelo</span>
                    <Input
                      onChange={(event) => setField("model", event.target.value)}
                      placeholder="Ej: GA 30+"
                      value={draft.model}
                    />
                  </label>
                  <label>
                    <span className="form-label">Numero de serie</span>
                    <Input
                      onChange={(event) =>
                        setField("serialNumber", event.target.value)
                      }
                      placeholder="Ej: SN-2019-48823"
                      value={draft.serialNumber}
                    />
                  </label>
                </div>
                <div className="form-grid-3">
                  <label>
                    <span className="form-label">Ano de fabricacion</span>
                    <Input placeholder="2019" type="number" />
                  </label>
                  <label>
                    <span className="form-label">Fecha de adquisicion</span>
                    <Input
                      onChange={(event) => setField("purchaseDate", event.target.value)}
                      type="date"
                      value={draft.purchaseDate}
                    />
                  </label>
                  <label>
                    <span className="form-label">Valor de adquisicion (USD)</span>
                    <Input
                      onChange={(event) => setField("cost", event.target.value)}
                      placeholder="0.00"
                      type="number"
                      value={draft.cost}
                    />
                  </label>
                </div>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Proveedor / Fabricante</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) =>
                        setField("purchaseProvider", event.target.value)
                      }
                      value={draft.purchaseProvider}
                    >
                      <option value="">Seleccionar proveedor...</option>
                      {providers.map((provider) => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Vencimiento garantia</span>
                    <Input
                      onChange={(event) => setField("warrantyUntil", event.target.value)}
                      type="date"
                      value={draft.warrantyUntil}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Configuracion de mantenimiento</div>
              </div>
              <div className="form-stack">
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Estado inicial *</span>
                    <select className="form-control h-9">
                      <option>Operativo</option>
                      <option>En revision</option>
                      <option>Fuera de servicio</option>
                      <option>En instalacion</option>
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Criticidad *</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) =>
                        setField("criticality", event.target.value as AssetDraft["criticality"])
                      }
                      value={draft.criticality}
                    >
                      <option value="low">Baja — Falla no detiene operacion</option>
                      <option value="medium">Media — Afecta parcialmente</option>
                      <option value="high">Alta — Detiene la produccion</option>
                    </select>
                  </label>
                </div>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Frecuencia mant. preventivo</span>
                    <select
                      className="form-control h-9"
                      onChange={(event) =>
                        setField("maintenanceFrequency", event.target.value)
                      }
                      value={draft.maintenanceFrequency}
                    >
                      <option>Sin preventivo programado</option>
                      <option>Semanal</option>
                      <option>Quincenal</option>
                      <option>Mensual</option>
                      <option>Bimestral</option>
                      <option>Trimestral</option>
                      <option>Semestral</option>
                      <option>Anual</option>
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Responsable asignado</span>
                    <Input
                      onChange={(event) =>
                        setField("emergencyContactName", event.target.value)
                      }
                      placeholder="Ej: M. Rodriguez"
                      value={draft.emergencyContactName}
                    />
                  </label>
                </div>
                <label>
                  <span className="form-label">Notas / Observaciones</span>
                  <Textarea
                    onChange={(event) => setField("notes", event.target.value)}
                    placeholder="Informacion adicional sobre el equipo, condiciones especiales de uso, recomendaciones del fabricante..."
                    value={draft.notes}
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Documentacion y fotos</div>
              </div>
              <div className="form-grid-2">
                <label className="upload-area block cursor-pointer !p-5">
                  <div className="upload-icon !text-[24px]">📷</div>
                  <div className="upload-title !text-[12px]">Foto principal del equipo</div>
                  <div className="upload-subtitle">PNG o JPG · Maximo 5MB</div>
                  <input
                    className="hidden"
                    multiple
                    onChange={(event) =>
                      setField("media", Array.from(event.target.files ?? []))
                    }
                    type="file"
                  />
                </label>
                <label className="upload-area block cursor-pointer !p-5">
                  <div className="upload-icon !text-[24px]">📄</div>
                  <div className="upload-title !text-[12px]">
                    Manuales, planos, fichas tecnicas
                  </div>
                  <div className="upload-subtitle">PDF, PNG, JPG · Maximo 10MB</div>
                  <input className="hidden" multiple type="file" />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="stack-20">
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Vista previa</div>
              </div>
              <div className="py-5 text-center">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-[16px] border-2 border-dashed border-line bg-surface-soft text-[32px]">
                  ⚙️
                </div>
                <div className="text-[15px] font-bold text-foreground">
                  {draft.name || "Nombre del activo"}
                </div>
                <div className="mt-1 text-[12px] text-muted-soft">
                  {(draft.code || "Codigo")} · {(draft.site || "Ubicacion")}
                </div>
              </div>
              <div className="mb-1 h-[6px] overflow-hidden rounded-full bg-surface-soft">
                <div className="h-full w-full rounded-full bg-success" />
              </div>
              <div className="text-center text-[11px] text-success">
                Estado: Operativo
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">
                  Asistente IA <span className="ia-tag">✦ IA</span>
                </div>
              </div>
              <div className="rounded-[10px] border border-brand/20 bg-brand/8 p-4 text-[13px] leading-6 text-muted">
                Ingresa el nombre y la categoria del activo. La IA sugerira automaticamente frecuencias de mantenimiento y checklists recomendados.
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Campos obligatorios</div>
              </div>
              <div className="space-y-1 text-[12px] leading-7 text-muted">
                <div>✓ Nombre del activo</div>
                <div>✓ Codigo interno</div>
                <div>✓ Categoria</div>
                <div>✓ Sucursal / Ubicacion</div>
                <div>✓ Sector / Area</div>
                <div>✓ Estado inicial</div>
                <div>✓ Criticidad</div>
              </div>
              <div className="mt-3 rounded-[8px] border border-warning/20 bg-warning/8 p-3 text-[11px] text-warning">
                Los demas campos son opcionales, pero mejoran el seguimiento y las sugerencias de la IA.
              </div>
              {submitted ? (
                <div className="mt-3 rounded-[8px] border border-success/30 bg-success/10 p-3 text-[11px] text-success">
                  Activo guardado en modo demo. La vista ya replica la estructura principal del HTML.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
