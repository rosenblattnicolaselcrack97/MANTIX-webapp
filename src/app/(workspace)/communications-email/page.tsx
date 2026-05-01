import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";

export default function EmailCommunicationsPage() {
  return (
    <div>
      <PageHeader title="Comunicaciones por email" subtitle="Flujos de notificacion por correo" />
      <WorkspaceEmptyState
        title="Futuramente disponible"
        description="Este modulo estara orientado a comunicaciones transaccionales por email. No es chat interno y no mostrara datos ficticios mientras se completa su implementacion."
      />
    </div>
  );
}
