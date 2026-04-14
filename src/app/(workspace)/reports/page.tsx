import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardWorkOrders, trackedAssets } from "@/data/mock/dashboard";

const reportCards = [
  { label: "MTTR promedio", value: "4.2h", tone: "var(--blue)", bg: "rgba(30,122,255,.12)", icon: "⏱" },
  { label: "MTBF promedio", value: "18d", tone: "var(--green)", bg: "rgba(0,214,143,.12)", icon: "📈" },
  { label: "Cumpl. preventivo", value: "91%", tone: "var(--yellow)", bg: "rgba(255,184,0,.12)", icon: "📊" },
  { label: "Costo repuestos", value: "$3.840", tone: "var(--orange)", bg: "rgba(255,107,53,.12)", icon: "💰" },
];

export default async function ReportsPage() {
  return (
    <div>
      <PageHeader
        actions={<Button variant="secondary">Exportar PDF</Button>}
        subtitle="Metricas · Marzo 2026"
        title="Reportes y Analisis"
      />

      <div className="kpi-grid">
        {reportCards.map((item) => (
          <div className="kpi-card" key={item.label}>
            <div className="kpi-accent" style={{ background: item.tone }} />
            <div className="kpi-icon" style={{ background: item.bg }}>
              <span className="text-[18px]">{item.icon}</span>
            </div>
            <div className="kpi-number">{item.value}</div>
            <div className="kpi-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="mantix-card">
          <CardContent className="p-5">
            <div className="card-title-row">
              <div className="card-title">
                Fallas por equipo <span className="ia-tag">✦ IA</span>
              </div>
            </div>
            {trackedAssets.slice(0, 3).map((asset) => {
              const width = asset.status === "critical" ? 75 : asset.status === "warning" ? 50 : 5;
              const color =
                asset.status === "critical"
                  ? "var(--red)"
                  : asset.status === "warning"
                    ? "var(--yellow)"
                    : "var(--green)";

              return (
                <div className="progress-wrap" key={asset.id}>
                  <div className="progress-header">
                    <span>{asset.name}</span>
                    <span style={{ color, fontWeight: 700 }}>{asset.openIssues} fallas</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${width}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="mantix-card">
          <CardContent className="p-5">
            <div className="card-title-row">
              <div className="card-title">Ordenes por tecnico</div>
            </div>
            <div className="space-y-4">
              {[
                { initials: "MR", name: "M. Rodriguez", count: 14, width: "70%", color: "var(--blue)" },
                { initials: "CL", name: "C. Lopez", count: 10, width: "50%", color: "var(--green)" },
                { initials: "PA", name: "P. Acosta", count: dashboardWorkOrders.length, width: "36%", color: "var(--yellow)" },
              ].map((item) => (
                <div className="flex items-center gap-3" key={item.name}>
                  <span className="avatar-sm !h-9 !w-9 !text-[13px]" style={{ background: item.color }}>
                    {item.initials}
                  </span>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-foreground">{item.name}</div>
                    <div className="progress-bar mt-1">
                      <div className="progress-fill" style={{ width: item.width, background: item.color }} />
                    </div>
                  </div>
                  <div className="text-[14px] font-bold" style={{ color: item.color }}>
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
