import type {
  AssetHealth,
  ModuleReadiness,
  NotificationSeverity,
  Priority,
  Tone,
  WorkOrderStatus,
} from "@/types/entities";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneClasses: Record<Tone, string> = {
  brand: "text-brand",
  neutral: "text-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const workOrderToneMap: Record<WorkOrderStatus, Tone> = {
  open: "warning",
  in_progress: "brand",
  scheduled: "warning",
  blocked: "neutral",
  completed: "success",
};

const assetToneMap: Record<AssetHealth, Tone> = {
  healthy: "success",
  warning: "warning",
  critical: "danger",
  offline: "neutral",
};

const readinessToneMap: Record<ModuleReadiness, Tone> = {
  ready: "success",
  foundation: "brand",
  planned: "warning",
};

export function StatusChip({
  className,
  dot = true,
  label,
  tone = "neutral",
}: {
  className?: string;
  dot?: boolean;
  label: string;
  tone?: Tone;
}) {
  return (
    <Badge className={className} tone={tone}>
      {dot ? (
        <span
          className={cn("mantix-badge-dot", toneClasses[tone])}
          aria-hidden="true"
        />
      ) : null}
      {label}
    </Badge>
  );
}

export function getPriorityTone(priority: Priority): Tone {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  if (priority === "medium") return "neutral";
  return "success";
}

export function getPriorityLabel(priority: Priority) {
  return {
    low: "Baja",
    medium: "Normal",
    high: "Alta",
    urgent: "Urgente",
  }[priority];
}

export function getWorkOrderStatusTone(status: WorkOrderStatus): Tone {
  return workOrderToneMap[status];
}

export function getWorkOrderStatusLabel(status: WorkOrderStatus) {
  return {
    open: "Pendiente",
    in_progress: "En curso",
    scheduled: "Programada",
    blocked: "Bloqueada",
    completed: "Completa",
  }[status];
}

export function getAssetStatusTone(status: AssetHealth): Tone {
  return assetToneMap[status];
}

export function getAssetStatusLabel(status: AssetHealth) {
  return {
    healthy: "Operativo",
    warning: "Revisar",
    critical: "Critico",
    offline: "Detenido",
  }[status];
}

export function getAlertTone(
  severity: NotificationSeverity | "warning" | "critical",
): Tone {
  if (severity === "success") return "success";
  if (severity === "warning") return "warning";
  if (severity === "critical") return "danger";
  return "brand";
}

export function getModuleReadinessTone(readiness: ModuleReadiness): Tone {
  return readinessToneMap[readiness];
}

export function getModuleReadinessLabel(readiness: ModuleReadiness) {
  return {
    ready: "Base lista",
    foundation: "En estructura",
    planned: "Proxima etapa",
  }[readiness];
}
