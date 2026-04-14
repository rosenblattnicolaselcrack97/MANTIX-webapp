import { Activity, Boxes, TriangleAlert } from "lucide-react";

import type { Alert, Asset } from "@/types/entities";

import {
  getAssetStatusLabel,
  getAssetStatusTone,
  StatusChip,
} from "@/components/shared/status-chip";
import { Card, CardContent } from "@/components/ui/card";

const assetIcons = [Boxes, TriangleAlert, Activity];

export function AssetsAlertPanel({
  alerts,
  assets,
}: {
  alerts: Alert[];
  assets: Asset[];
}) {
  const focusAssets = assets.slice(0, 3);

  return (
    <Card className="mantix-card">
      <CardContent className="p-5">
        <div className="card-title-row">
          <div className="card-title">Activos con alertas</div>
        </div>

        {focusAssets.map((asset, index) => {
          const Icon = assetIcons[index % assetIcons.length];

          return (
            <div className="asset-row" key={asset.id}>
              <div className="asset-icon">
                <Icon className="size-5 text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="asset-name">{asset.name}</div>
                <div className="asset-sub">{asset.nextServiceLabel}</div>
              </div>
              <StatusChip
                label={getAssetStatusLabel(asset.status)}
                tone={getAssetStatusTone(asset.status)}
              />
            </div>
          );
        })}

        <div className="mt-5 border-t border-line pt-5">
          <div className="card-title-row">
            <div className="card-title">Alertas activas</div>
            <div className="text-[12px] font-semibold text-brand">
              {alerts.length}
            </div>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                className="rounded-[10px] border border-line bg-surface-alt p-3"
                key={alert.id}
              >
                <div className="text-[13px] font-semibold text-foreground">
                  {alert.title}
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {alert.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
