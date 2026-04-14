import { Camera, CheckCircle2, MessageSquareMore, TriangleAlert } from "lucide-react";

import type { ActivityItem } from "@/types/entities";

import { Card, CardContent } from "@/components/ui/card";

const iconMap = {
  evidence: Camera,
  assignment: CheckCircle2,
  provider: MessageSquareMore,
  schedule: CheckCircle2,
  alert: TriangleAlert,
} as const;

const toneMap = {
  brand: "rgba(30,122,255,.12)",
  success: "rgba(0,214,143,.12)",
  warning: "rgba(255,184,0,.12)",
  danger: "rgba(255,61,90,.12)",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="mantix-card">
      <CardContent className="p-5">
        <div className="card-title-row">
          <div className="card-title">Actividad reciente</div>
        </div>

        {items.map((item) => {
          const Icon = iconMap[item.kind];

          return (
            <div className="activity-item" key={item.id}>
              <div
                className="activity-icon"
                style={{ background: toneMap[item.tone] }}
              >
                <Icon className="size-4" style={{ color: `var(--${item.tone === "danger" ? "red" : item.tone === "warning" ? "yellow" : item.tone === "success" ? "green" : "blue"})` }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="activity-title">{item.title}</div>
                <div className="activity-sub">{item.description}</div>
              </div>
              <div className="activity-time">{item.occurredAtLabel}</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
