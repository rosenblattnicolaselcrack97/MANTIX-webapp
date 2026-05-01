import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";

export default function PartsPage() {
  return (
    <div>
      <PageHeader
        subtitle="Inventario técnico"
        title="Stock y Repuestos"
      />
      <WorkspaceEmptyState
        description="El modulo de stock y repuestos estara disponible proximamente. Permitira gestionar inventario, repuestos criticos, consumos por orden de trabajo y alertas de reposicion."
        title="Futuramente disponible"
      />
    </div>
  );
}
