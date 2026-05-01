import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";

export default function MessagesPage() {
  return (
    <div>
      <PageHeader
        subtitle="Comunicación operativa"
        title="Mensajes"
      />
      <WorkspaceEmptyState
        description="Este módulo todavía no tiene una tabla transaccional definida en Supabase. Quedó limpio de conversaciones ficticias y preparado para conectarse a mensajería real cuando definas el modelo de datos."
        title="Todavía no hay mensajería operativa"
      />
    </div>
  );
}
