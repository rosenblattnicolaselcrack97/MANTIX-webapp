import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const preventiveCategories = [
  {
    title: "Seguridad e incendio",
    cadence: "Semanal y trimestral",
    assets: "Matafuegos, senialeria, luces de emergencia y alarmas",
    owner: "Seguridad + proveedor habilitado",
    status: "active",
  },
  {
    title: "Climatizacion y confort",
    cadence: "Mensual",
    assets: "Aires acondicionados, extractores y calefaccion",
    owner: "AirTech Refrigeracion",
    status: "scheduled",
  },
  {
    title: "Accesos y envolvente",
    cadence: "Quincenal",
    assets: "Motor del porton, cerraduras, techos, durlock y cortinas",
    owner: "Portones del Sur",
    status: "warning",
  },
  {
    title: "Servicios e infraestructura",
    cadence: "Mensual",
    assets: "Electricidad, plomeria, gas, carteleria y senializacion",
    owner: "Equipo mixto",
    status: "active",
  },
] as const;

const preventiveTasks = [
  ["Matafuegos", "Control de carga, oblea y soporte", "24 Mar", "Alta", "Proveedor"],
  ["Senialeria", "Reposicion de carteles y vinilos de seguridad", "25 Mar", "Media", "Interno"],
  ["Aires acondicionados", "Limpieza de filtros y chequeo de drenaje", "26 Mar", "Alta", "Proveedor"],
  ["Motor del porton", "Lubricacion y prueba de fotocelulas", "26 Mar", "Alta", "Proveedor"],
  ["Ascensores", "Chequeo preventivo contractual", "28 Mar", "Alta", "Proveedor"],
  ["Autoelevadores", "Inspeccion visual, bateria y seguridad", "29 Mar", "Alta", "Interno"],
  ["Electricidad", "Revision de tablero y termicas de oficinas", "31 Mar", "Media", "Interno"],
  ["Plomeria / gas", "Perdidas, llaves y prueba de artefactos", "01 Abr", "Alta", "Proveedor"],
  ["Camaras y seguridad", "Grabacion, UPS y sensores", "02 Abr", "Media", "Proveedor"],
  ["Cortador de pasto", "Servicio general y cuchillas", "03 Abr", "Baja", "Interno"],
] as const;

export default function PreventivePage() {
  return (
    <div>
      <PageHeader
        actions={
          <>
            <Button variant="secondary">Calendario anual</Button>
            <Button>Nueva rutina</Button>
          </>
        }
        subtitle="Todo lo anexo al negocio que impacta tiempo, seguridad o continuidad operativa"
        title="Preventivo"
      />

      <div className="kpi-grid">
        {[
          ["Rutinas activas", "28", "brand"],
          ["Vencen esta semana", "9", "warning"],
          ["Terceros involucrados", "7", "cyan"],
          ["Impacto alto", "6", "danger"],
        ].map(([label, value, tone]) => (
          <div className="kpi-card" key={label}>
            <div className={`status-dot ${tone}`} />
            <div className="kpi-number">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <Card className="mantix-card">
          <CardContent className="p-5">
            <div className="card-title-row">
              <div className="card-title">Frentes preventivos</div>
            </div>

            <div className="preventive-grid">
              {preventiveCategories.map((item) => (
                <div className="preventive-card" key={item.title}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[14px] font-semibold text-foreground">
                        {item.title}
                      </div>
                      <div className="mt-1 text-[12px] text-muted">
                        {item.assets}
                      </div>
                    </div>
                    <StatusChip
                      label={
                        item.status === "warning"
                          ? "Con desvio"
                          : item.status === "scheduled"
                            ? "Programado"
                            : "Activo"
                      }
                      tone={
                        item.status === "warning"
                          ? "warning"
                          : item.status === "scheduled"
                            ? "brand"
                            : "success"
                      }
                    />
                  </div>
                  <div className="preventive-meta">
                    <span>Cadencia: {item.cadence}</span>
                    <span>Responsable: {item.owner}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mantix-card">
          <CardContent className="p-5">
            <div className="card-title-row">
              <div className="card-title">Cobertura recomendada</div>
            </div>
            <div className="space-y-3 text-[13px] text-muted">
              <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                Prioriza lo que no frena directo la produccion pero si consume
                tiempo del duenio o deteriora la operacion diaria.
              </div>
              <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                Inclui carteleria, senializacion, camaras, sistema de seguridad,
                porton de entrada, cortador de pasto, ascensores y autoelevadores.
              </div>
              <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                Usa contratos externos para matafuegos, gas, techista y
                climatizacion cuando haya normativa o riesgo.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mantix-card mt-5">
        <CardContent className="p-0">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Elemento</th>
                  <th>Tarea</th>
                  <th>Proxima fecha</th>
                  <th>Prioridad</th>
                  <th>Ejecucion</th>
                </tr>
              </thead>
              <tbody>
                {preventiveTasks.map((row) => (
                  <tr key={row[0]}>
                    <td className="font-semibold">{row[0]}</td>
                    <td className="td-light">{row[1]}</td>
                    <td className="td-mono">{row[2]}</td>
                    <td>
                      <StatusChip
                        label={row[3]}
                        tone={
                          row[3] === "Alta"
                            ? "danger"
                            : row[3] === "Media"
                              ? "warning"
                              : "success"
                        }
                      />
                    </td>
                    <td>
                      {row[4] === "Proveedor" ? (
                        <Badge tone="cyan">Proveedor</Badge>
                      ) : (
                        <StatusChip label="Interno" tone="brand" />
                      )}
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
