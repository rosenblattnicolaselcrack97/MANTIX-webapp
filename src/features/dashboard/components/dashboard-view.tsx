import type { DashboardData } from "@/types/entities";

import { Card, CardContent } from "@/components/ui/card";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { AssetsAlertPanel } from "@/features/dashboard/components/assets-alert-panel";
import { KpiGrid } from "@/features/dashboard/components/kpi-grid";
import { RecentWorkOrders } from "@/features/dashboard/components/recent-work-orders";

const monthlyOrders = [
  { label: "Oct", value: 18, height: 55, tone: "var(--s3)" },
  { label: "Nov", value: 22, height: 68, tone: "var(--s3)" },
  { label: "Dic", value: 15, height: 46, tone: "var(--s3)" },
  { label: "Ene", value: 28, height: 86, tone: "rgba(30,122,255,.4)" },
  { label: "Feb", value: 31, height: 95, tone: "rgba(30,122,255,.5)" },
  { label: "Mar ←", value: 15, height: 48, tone: "var(--blue)" },
];

export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div>
      <KpiGrid items={data.kpis} />

      <div className="dashboard-main-grid">
        <div className="stack-20">
          <RecentWorkOrders items={data.workOrders} />

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">
                  Ordenes por mes <span className="ia-tag">✦ IA</span>
                </div>
              </div>
              <div className="bar-chart">
                {monthlyOrders.map((item) => (
                  <div className="bar-col" key={item.label}>
                    <div className="bar-val">{item.value}</div>
                    <div
                      className="bar"
                      style={{ height: item.height, background: item.tone }}
                    />
                    <div className="bar-lbl">{item.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="stack-20">
          <AssetsAlertPanel alerts={data.alerts} assets={data.assets} />

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Estado de ordenes</div>
              </div>
              <div className="donut-wrap">
                <div className="donut-chart" />
                <div className="donut-legend">
                  <div className="donut-item">
                    <div className="donut-dot bg-success" />
                    <span className="donut-label">Completadas</span>
                    <span className="donut-value">43</span>
                  </div>
                  <div className="donut-item">
                    <div className="donut-dot bg-brand" />
                    <span className="donut-label">En curso</span>
                    <span className="donut-value">8</span>
                  </div>
                  <div className="donut-item">
                    <div className="donut-dot bg-warning" />
                    <span className="donut-label">Pendientes</span>
                    <span className="donut-value">7</span>
                  </div>
                  <div className="donut-item">
                    <div className="donut-dot bg-danger" />
                    <span className="donut-label">Urgentes</span>
                    <span className="donut-value">3</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ActivityFeed items={data.activity} />
        </div>
      </div>
    </div>
  );
}
