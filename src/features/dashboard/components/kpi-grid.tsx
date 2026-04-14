import {
  Boxes,
  ClipboardList,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import type { KPI } from "@/types/entities";

const iconMap = {
  clipboard: ClipboardList,
  alert: TriangleAlert,
  shield: ShieldCheck,
  boxes: Boxes,
} as const;

const toneMap = {
  brand: {
    accent: "var(--blue)",
    icon: "rgba(30,122,255,.12)",
  },
  success: {
    accent: "var(--green)",
    icon: "rgba(0,214,143,.12)",
  },
  warning: {
    accent: "var(--yellow)",
    icon: "rgba(255,184,0,.12)",
  },
  danger: {
    accent: "var(--red)",
    icon: "rgba(255,61,90,.12)",
  },
};

export function KpiGrid({ items }: { items: KPI[] }) {
  return (
    <div className="kpi-grid">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const tone = toneMap[item.tone];
        const deltaClass =
          item.trend === "up"
            ? "delta-up"
            : item.trend === "down"
              ? "delta-down"
              : "delta-neutral";

        return (
          <div className="kpi-card" key={item.id}>
            <div className="kpi-accent" style={{ background: tone.accent }} />
            <div className="kpi-icon" style={{ background: tone.icon }}>
              <Icon className="size-[18px]" style={{ color: tone.accent }} />
            </div>
            <div className="kpi-number">{item.value}</div>
            <div className="kpi-label">{item.label}</div>
            <div className={`kpi-delta ${deltaClass}`}>{item.delta}</div>
          </div>
        );
      })}
    </div>
  );
}
