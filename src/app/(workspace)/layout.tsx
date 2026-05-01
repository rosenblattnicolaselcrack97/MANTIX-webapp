import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <WorkspaceShell>{children}</WorkspaceShell>
    </ProtectedRoute>
  );
}
