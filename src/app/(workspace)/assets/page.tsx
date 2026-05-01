"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ExcelImportExport } from "@/components/shared/excel-import-export";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AssetRow {
  id: string;
  name: string;
  internal_code: string | null;
  category: string | null;
  status: string;
  criticality: string;
  last_maintenance_at: string | null;
  next_maintenance_at?: string | null;
  location_id: string | null;
  area_id?: string | null;
  location_name?: string;
  area_name?: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  responsible_name?: string | null;
  maintenance_frequency_number?: number | null;
  maintenance_frequency_unit?: string | null;
  acquisition_value?: number | null;
  acquisition_currency?: string | null;
  supplier_count?: number;
}

const ASSET_STATUS_LABELS: Record<string, string> = {
  operative: "Operativo",
  review: "Revisar",
  critical: "Crítico",
  inactive: "Inactivo",
};

export default function AssetsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AssetRow[]>([]);
  const [companyName, setCompanyName] = useState("Mantix");
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [criticalityFilter, setCriticalityFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    const loadAssets = async () => {
      if (!profile?.company_id) {
        if (isMounted) {
          setItems([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const [companyResult, extendedAssetsResult] = await Promise.all([
        supabase.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
        supabase
          .from("assets")
          .select(
            "id, name, internal_code, category, status, criticality, last_maintenance_at, next_maintenance_at, location_id, area_id, manufacturer, model, serial_number, responsible_name, maintenance_frequency_number, maintenance_frequency_unit, acquisition_value, acquisition_currency",
          )
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false }),
      ]);

      const assets: AssetRow[] = extendedAssetsResult.error
        ? (((
            await supabase
              .from("assets")
              .select("id, name, internal_code, category, status, criticality, last_maintenance_at, location_id, manufacturer, model, serial_number")
              .eq("company_id", profile.company_id)
              .order("created_at", { ascending: false })
          ).data ?? []) as AssetRow[]).map((asset) => ({
            ...asset,
            area_id: null,
            next_maintenance_at: null,
            responsible_name: null,
            maintenance_frequency_number: null,
            maintenance_frequency_unit: null,
            acquisition_value: null,
            acquisition_currency: null,
          }))
        : ((extendedAssetsResult.data ?? []) as AssetRow[]);

      const locationIds = [...new Set((assets ?? []).map((asset) => asset.location_id).filter(Boolean))];
      const areaIds = [...new Set((assets ?? []).map((asset) => asset.area_id).filter(Boolean))];

      const [locationsResult, areasResult, suppliersResult] = await Promise.all([
        locationIds.length ? supabase.from("locations").select("id, name").in("id", locationIds) : Promise.resolve({ data: [] }),
        areaIds.length ? supabase.from("branch_areas").select("id, name").in("id", areaIds) : Promise.resolve({ data: [] }),
        supabase.from("asset_suppliers").select("asset_id").eq("company_id", profile.company_id),
      ]);

      const locationMap = new Map((locationsResult.data ?? []).map((location) => [location.id, location.name]));
      const areaMap = new Map((areasResult.data ?? []).map((area) => [area.id, area.name]));
      const supplierCountMap = new Map<string, number>();

      (suppliersResult.data ?? []).forEach((row) => {
        supplierCountMap.set(row.asset_id, (supplierCountMap.get(row.asset_id) ?? 0) + 1);
      });

      if (isMounted) {
        if (companyResult.data?.name) {
          setCompanyName(companyResult.data.name);
        }
        setItems(
          (assets ?? []).map((asset) => ({
            ...asset,
            location_name: asset.location_id ? locationMap.get(asset.location_id) : undefined,
            area_name: asset.area_id ? areaMap.get(asset.area_id) : undefined,
            supplier_count: supplierCountMap.get(asset.id) ?? 0,
          })),
        );
        setIsLoading(false);
      }
    };

    void loadAssets();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((asset) => {
      const matchesQuery =
        !normalizedQuery ||
        [asset.name, asset.internal_code, asset.category, asset.location_name, asset.area_name, asset.manufacturer, asset.model, asset.responsible_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
      const matchesCriticality = criticalityFilter === "all" || asset.criticality === criticalityFilter;
      return matchesQuery && matchesStatus && matchesCriticality;
    });
  }, [criticalityFilter, items, query, statusFilter]);

  const attentionCount = items.filter((asset) => asset.status === "critical" || asset.status === "review").length;
  const scheduledCount = items.filter((asset) => asset.maintenance_frequency_number && asset.maintenance_frequency_unit).length;
  const valuedCount = items.filter((asset) => asset.acquisition_value != null).length;

  return (
    <div>
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {profile?.company_id ? <ExcelImportExport companyId={profile.company_id} companyName={companyName} importType="activos" /> : null}
            <Button asChild>
              <Link href="/assets/new">Nuevo Activo</Link>
            </Button>
          </div>
        }
        subtitle={`${items.length} activos registrados · ${attentionCount} requieren atención`}
        title="Activos"
      />

      <Card className="mantix-card mb-5">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 xl:col-span-2">
            <span className="form-label">Buscar activo</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, código, ubicación, responsable..." />
          </label>
          <label className="space-y-2">
            <span className="form-label">Estado</span>
            <select className="form-control h-9" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos</option>
              <option value="operative">Operativos</option>
              <option value="review">En revisión</option>
              <option value="critical">Críticos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="form-label">Criticidad</span>
            <select className="form-control h-9" value={criticalityFilter} onChange={(event) => setCriticalityFilter(event.target.value)}>
              <option value="all">Todas</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </label>
          <div className="rounded-[12px] border border-line bg-surface-alt p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Con plan preventivo</div>
            <div className="mt-2 text-[24px] font-bold text-foreground">{scheduledCount}</div>
            <div className="mt-1 text-[12px] text-muted">Frecuencia cargada</div>
          </div>
          <div className="rounded-[12px] border border-line bg-surface-alt p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Con valor declarado</div>
            <div className="mt-2 text-[24px] font-bold text-foreground">{valuedCount}</div>
            <div className="mt-1 text-[12px] text-muted">Base para finanzas</div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="mantix-card">
          <CardContent className="p-5 text-[13px] text-muted">Cargando activos...</CardContent>
        </Card>
      ) : visibleItems.length === 0 ? (
        <WorkspaceEmptyState
          actionHref="/assets/new"
          actionLabel="Crear primer activo"
          description="Todavía no hay activos visibles con los filtros actuales. Cuando cargues el primero o limpies filtros, esta vista mostrará estado, ubicación, criticidad y campos core reales."
          title="No hay activos visibles"
        />
      ) : (
        <Card className="mantix-card">
          <CardContent className="p-0">
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Categoría / Ubicación</th>
                    <th>Estado</th>
                    <th>Criticidad / PM</th>
                    <th>Responsable / Valor</th>
                    <th>Últ. mantenimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((asset) => (
                    <tr key={asset.id}>
                      <td>
                        <div className="font-semibold text-foreground">{asset.name}</div>
                        <div className="td-mono">{asset.internal_code ?? asset.id.slice(0, 8)}</div>
                        <div className="td-light">{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || asset.serial_number || "Sin ficha técnica"}</div>
                      </td>
                      <td className="td-light">
                        <div>{asset.category ?? "Sin categoría"}</div>
                        <div>{[asset.location_name, asset.area_name].filter(Boolean).join(" · ") || "Sin ubicación"}</div>
                      </td>
                      <td>{ASSET_STATUS_LABELS[asset.status] ?? asset.status}</td>
                      <td className="td-light">
                        <div>{asset.criticality}</div>
                        <div>
                          {asset.maintenance_frequency_number && asset.maintenance_frequency_unit
                            ? `${asset.maintenance_frequency_number} ${asset.maintenance_frequency_unit}`
                            : "Sin PM"}
                        </div>
                      </td>
                      <td className="td-light">
                        <div>{asset.responsible_name ?? "Sin responsable"}</div>
                        <div>
                          {asset.acquisition_value != null
                            ? `${asset.acquisition_currency ?? "ARS"} ${Number(asset.acquisition_value).toLocaleString("es-AR")}`
                            : `${asset.supplier_count ?? 0} proveedor(es)`}
                        </div>
                      </td>
                      <td className="td-mono">
                        {asset.last_maintenance_at ? new Date(asset.last_maintenance_at).toLocaleDateString("es-AR") : "Sin registro"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
