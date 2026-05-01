import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";

export default function FinanceMaintenancePage() {
  return (
    <div>
      <PageHeader title="Finanzas del mantenimiento" subtitle="Control financiero operativo" />
      <WorkspaceEmptyState
        title="Futuramente disponible"
        description="El modulo financiero de mantenimiento se habilitara en la siguiente etapa para costos, desvíos, presupuestos y trazabilidad economica por orden de trabajo."
      />
    </div>
  );
}
