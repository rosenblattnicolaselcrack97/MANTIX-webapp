"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
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
  areaId: "",
  criticality: "medium",
  brand: "",
  model: "",
  serialNumber: "",
  manufacturingYear: "",
  purchaseDate: "",
  purchaseProvider: "",
  purchaseLocation: "",
  cost: "",
  acquisitionCurrency: "ARS",
  installedBy: "",
  installationDate: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  responsibleName: "",
  maintenanceFrequency: "Mensual",
  warrantyUntil: "",
  status: "operative",
  statusDetail: "",
  manualUrl: "",
  maintenancePdfUrl: "",
  externalDocumentUrl: "",
  notes: "",
  motors: [],
  specs: [],
  media: [],
};

interface AssetRegistrationFormProps {
  areas: { id: string; name: string; branch_id: string }[];
  categories: string[];
  providers: { id: string; name: string }[];
  sites: { id: string; name: string }[];
}

const MAINTENANCE_FREQUENCY_MAP: Record<string, { number: number | null; unit: string | null }> = {
  "Sin preventivo programado": { number: null, unit: null },
  Semanal: { number: 7, unit: "days" },
  Quincenal: { number: 15, unit: "days" },
  Mensual: { number: 1, unit: "months" },
  Bimestral: { number: 2, unit: "months" },
  Trimestral: { number: 3, unit: "months" },
  Semestral: { number: 6, unit: "months" },
  Anual: { number: 1, unit: "years" },
};

export function AssetRegistrationForm({ areas, categories, providers, sites }: AssetRegistrationFormProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [draft, setDraft] = useState<AssetDraft>(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const visibleAreas = useMemo(() => areas.filter((area) => !draft.site || area.branch_id === draft.site), [areas, draft.site]);

  const setField = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const createAsset = async () => {
      if (!profile?.company_id) {
        setSubmitError("No hay una empresa asociada para guardar este activo.");
        return;
      }

      if (!draft.name || !draft.code || !draft.category || !draft.site) {
        setSubmitError("Completá nombre, código, categoría y ubicación antes de guardar.");
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      const maintenanceFrequency = MAINTENANCE_FREQUENCY_MAP[draft.maintenanceFrequency] ?? { number: null, unit: null };
      const extendedPayload = {
        company_id: profile.company_id,
        location_id: draft.site,
        area_id: draft.areaId || null,
        name: draft.name,
        internal_code: draft.code,
        category: draft.category,
        manufacturer: draft.brand || null,
        model: draft.model || null,
        serial_number: draft.serialNumber || null,
        status: draft.status,
        criticality: draft.criticality,
        last_maintenance_at: null,
        next_maintenance_at: null,
        notes: draft.notes || null,
        manufacturing_year: draft.manufacturingYear ? Number(draft.manufacturingYear) : null,
        acquisition_value: draft.cost ? Number(draft.cost) : null,
        acquisition_currency: draft.acquisitionCurrency || null,
        responsible_name: draft.responsibleName || null,
        user_manual_url: draft.manualUrl || null,
        maintenance_pdf_url: draft.maintenancePdfUrl || null,
        external_document_url: draft.externalDocumentUrl || null,
        status_detail: draft.statusDetail || null,
        maintenance_frequency_number: maintenanceFrequency.number,
        maintenance_frequency_unit: maintenanceFrequency.unit,
      };

      const extendedInsert = await supabase.from("assets").insert(extendedPayload).select("id").single();
      const fallbackInsert =
        extendedInsert.error != null
          ? await supabase
              .from("assets")
              .insert({
                company_id: profile.company_id,
                location_id: draft.site,
                name: draft.name,
                internal_code: draft.code,
                category: draft.category,
                manufacturer: draft.brand || null,
                model: draft.model || null,
                serial_number: draft.serialNumber || null,
                status: draft.status,
                criticality: draft.criticality,
                last_maintenance_at: null,
                next_maintenance_at: null,
                notes: draft.notes || null,
              })
              .select("id")
              .single()
          : null;

      const assetId = extendedInsert.data?.id ?? fallbackInsert?.data?.id ?? null;
      const insertError = fallbackInsert?.error ?? extendedInsert.error;

      if (!assetId || insertError) {
        setSubmitError("No se pudo guardar el activo en Supabase.");
        setIsSubmitting(false);
        return;
      }

      if (draft.purchaseProvider) {
        await supabase.from("asset_suppliers").insert({
          company_id: profile.company_id,
          asset_id: assetId,
          supplier_id: draft.purchaseProvider,
          relationship_type: "purchase_provider",
        });
      }

      setSubmitted(true);
      setIsSubmitting(false);
      router.push("/assets");
      router.refresh();
    };

    void createAsset();
  };

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/assets">Cancelar</Link>
            </Button>
            <Button disabled={isSubmitting} form="new-asset-form" type="submit">
              {isSubmitting ? "Guardando..." : "Guardar Activo"}
            </Button>
          </>
        }
        subtitle="Completa la información del equipo para agregarlo al sistema"
        title="Registrar Nuevo Activo"
      />

      <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" id="new-asset-form" onSubmit={handleSubmit}>
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
                    <Input onChange={(event) => setField("name", event.target.value)} placeholder="Ej: Compresor Industrial A3" value={draft.name} />
                  </label>
                  <label>
                    <span className="form-label">Código interno *</span>
                    <Input onChange={(event) => setField("code", event.target.value)} placeholder="Ej: CPR-2019-A3" value={draft.code} />
                  </label>
                </div>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Categoría *</span>
                    <select className="form-control h-9" onChange={(event) => setField("category", event.target.value)} value={draft.category}>
                      <option value="">Seleccionar categoría...</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Detalle / subcategoría</span>
                    <Input onChange={(event) => setField("statusDetail", event.target.value)} placeholder="Ej: Compresores, Motores..." value={draft.statusDetail} />
                  </label>
                </div>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Sucursal / Ubicación *</span>
                    <select className="form-control h-9" onChange={(event) => setField("site", event.target.value)} value={draft.site}>
                      <option value="">Seleccionar ubicación...</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Sector / Área</span>
                    <select className="form-control h-9" onChange={(event) => setField("areaId", event.target.value)} value={draft.areaId}>
                      <option value="">Seleccionar área...</option>
                      {visibleAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Datos técnicos</div>
              </div>
              <div className="form-stack">
                <div className="form-grid-3">
                  <label>
                    <span className="form-label">Marca</span>
                    <Input onChange={(event) => setField("brand", event.target.value)} placeholder="Ej: Atlas Copco" value={draft.brand} />
                  </label>
                  <label>
                    <span className="form-label">Modelo</span>
                    <Input onChange={(event) => setField("model", event.target.value)} placeholder="Ej: GA 30+" value={draft.model} />
                  </label>
                  <label>
                    <span className="form-label">Número de serie</span>
                    <Input onChange={(event) => setField("serialNumber", event.target.value)} placeholder="Ej: SN-2019-48823" value={draft.serialNumber} />
                  </label>
                </div>
                <div className="form-grid-3">
                  <label>
                    <span className="form-label">Año de fabricación</span>
                    <Input onChange={(event) => setField("manufacturingYear", event.target.value)} placeholder="2019" type="number" value={draft.manufacturingYear} />
                  </label>
                  <label>
                    <span className="form-label">Fecha de adquisición</span>
                    <Input onChange={(event) => setField("purchaseDate", event.target.value)} type="date" value={draft.purchaseDate} />
                  </label>
                  <label>
                    <span className="form-label">Valor de adquisición</span>
                    <Input onChange={(event) => setField("cost", event.target.value)} placeholder="0.00" type="number" value={draft.cost} />
                  </label>
                </div>
                <div className="form-grid-3">
                  <label>
                    <span className="form-label">Proveedor</span>
                    <select className="form-control h-9" onChange={(event) => setField("purchaseProvider", event.target.value)} value={draft.purchaseProvider}>
                      <option value="">Seleccionar proveedor...</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Moneda</span>
                    <Input onChange={(event) => setField("acquisitionCurrency", event.target.value.toUpperCase())} placeholder="ARS" value={draft.acquisitionCurrency} />
                  </label>
                  <label>
                    <span className="form-label">Vencimiento garantía</span>
                    <Input onChange={(event) => setField("warrantyUntil", event.target.value)} type="date" value={draft.warrantyUntil} />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Configuración de mantenimiento</div>
              </div>
              <div className="form-stack">
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Estado inicial *</span>
                    <select className="form-control h-9" onChange={(event) => setField("status", event.target.value)} value={draft.status}>
                      <option value="operative">Operativo</option>
                      <option value="review">En revisión</option>
                      <option value="critical">Crítico</option>
                      <option value="inactive">Fuera de servicio</option>
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Criticidad *</span>
                    <select className="form-control h-9" onChange={(event) => setField("criticality", event.target.value as AssetDraft["criticality"])} value={draft.criticality}>
                      <option value="low">Baja — Falla no detiene operación</option>
                      <option value="medium">Media — Afecta parcialmente</option>
                      <option value="high">Alta — Detiene la producción</option>
                    </select>
                  </label>
                </div>
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Frecuencia mant. preventivo</span>
                    <select className="form-control h-9" onChange={(event) => setField("maintenanceFrequency", event.target.value)} value={draft.maintenanceFrequency}>
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
                    <Input onChange={(event) => setField("responsibleName", event.target.value)} placeholder="Ej: M. Rodriguez" value={draft.responsibleName} />
                  </label>
                </div>
                <div className="form-grid-3">
                  <label>
                    <span className="form-label">URL manual</span>
                    <Input onChange={(event) => setField("manualUrl", event.target.value)} placeholder="https://..." value={draft.manualUrl} />
                  </label>
                  <label>
                    <span className="form-label">URL PDF mantenimiento</span>
                    <Input onChange={(event) => setField("maintenancePdfUrl", event.target.value)} placeholder="https://..." value={draft.maintenancePdfUrl} />
                  </label>
                  <label>
                    <span className="form-label">URL documento externo</span>
                    <Input onChange={(event) => setField("externalDocumentUrl", event.target.value)} placeholder="https://..." value={draft.externalDocumentUrl} />
                  </label>
                </div>
                <label>
                  <span className="form-label">Notas / Observaciones</span>
                  <Textarea onChange={(event) => setField("notes", event.target.value)} placeholder="Información adicional sobre el equipo, condiciones especiales de uso, recomendaciones del fabricante..." value={draft.notes} />
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
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-[16px] border-2 border-dashed border-line bg-surface-soft text-[32px]">⚙️</div>
                <div className="text-[15px] font-bold text-foreground">{draft.name || "Nombre del activo"}</div>
                <div className="mt-1 text-[12px] text-muted-soft">{(draft.code || "Código")} · {(sites.find((site) => site.id === draft.site)?.name || "Ubicación")}</div>
              </div>
              <div className="mb-1 h-[6px] overflow-hidden rounded-full bg-surface-soft">
                <div className="h-full w-full rounded-full bg-success" />
              </div>
              <div className="text-center text-[11px] text-success">Estado: {draft.status}</div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Campos obligatorios</div>
              </div>
              <div className="space-y-1 text-[12px] leading-7 text-muted">
                <div>✓ Nombre del activo</div>
                <div>✓ Código interno</div>
                <div>✓ Categoría</div>
                <div>✓ Sucursal / Ubicación</div>
                <div>✓ Estado inicial</div>
                <div>✓ Criticidad</div>
              </div>
              <div className="mt-3 rounded-[8px] border border-warning/20 bg-warning/8 p-3 text-[11px] text-warning">Los demás campos son opcionales, pero mejoran el seguimiento operativo del activo.</div>
              {submitError ? <div className="mt-3 rounded-[8px] border border-danger/30 bg-danger/10 p-3 text-[11px] text-danger">{submitError}</div> : null}
              {submitted ? <div className="mt-3 rounded-[8px] border border-success/30 bg-success/10 p-3 text-[11px] text-success">Activo guardado correctamente en Supabase.</div> : null}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
