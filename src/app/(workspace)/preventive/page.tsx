import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";

export default function PreventivePage() {
  return (
    <div>
      <PageHeader
        subtitle="Rutinas preventivas"
        title="Preventivo"
      />
      <WorkspaceEmptyState
        description="El módulo preventivo todavía no tiene tablas ni scheduler operativo en este proyecto. Se removieron rutinas y calendarios ficticios para que la pantalla refleje el estado real del producto."
        title="Todavía no hay preventivos configurados"
      />
    </div>
  );
}
