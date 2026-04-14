import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import {
  getAssetStatusLabel,
  getAssetStatusTone,
  StatusChip,
} from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAssetsOverview } from "@/features/assets/services/get-assets-overview";

const assetIcons = ["⚙", "⚡", "❄", "🏭", "🧰"];

export default async function AssetsPage() {
  const overview = await getAssetsOverview();

  return (
    <div>
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <a download href="/templates/activos-import-template.csv">
                Descargar template Excel
              </a>
            </Button>
            <Button variant="outline">
              Importar planilla
            </Button>
            <Button asChild>
              <Link href="/assets/new">Nuevo Activo</Link>
            </Button>
          </>
        }
        subtitle="32 equipos registrados · 5 con alertas"
        title="Activos"
      />

      <Card className="mantix-card mb-5">
        <CardContent className="p-5">
          <div className="card-title-row">
            <div className="card-title">Carga masiva</div>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-[10px] border border-line bg-surface-alt p-4 text-[13px] text-muted">
              Descarga la plantilla, completala en Excel con cada activo y luego
              volvela a subir para automatizar la carga masiva. En esta demo
              dejamos visible el flujo con los botones de descarga e importacion.
            </div>
            <div className="rounded-[10px] border border-brand/20 bg-brand/8 p-4 text-[12px] text-muted">
              Columnas sugeridas: codigo, nombre, categoria, ubicacion, criticidad,
              proveedor, frecuencia de mantenimiento y observaciones.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mantix-card">
        <CardContent className="p-0">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Categoria</th>
                  <th>Ubicacion</th>
                  <th>Estado</th>
                  <th>Ult. intervencion</th>
                  <th>Ordenes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {overview.items.map((asset, index) => (
                  <tr key={asset.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="text-[20px]">
                          {assetIcons[index % assetIcons.length]}
                        </span>
                        <div>
                          <div className="font-semibold">{asset.name}</div>
                          <div className="td-mono">{asset.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td-light">{asset.category}</td>
                    <td className="td-light">{asset.site}</td>
                    <td>
                      <StatusChip
                        label={getAssetStatusLabel(asset.status)}
                        tone={getAssetStatusTone(asset.status)}
                      />
                    </td>
                    <td className="td-mono">{asset.lastInterventionLabel}</td>
                    <td className="font-semibold">{asset.openIssues + 8}</td>
                    <td>
                      <Button size="sm" variant="ghost">
                        Ver →
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
