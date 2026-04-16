import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { currentUser, mantixCompany } from "@/data/mock/platform";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell company={mantixCompany} currentUser={currentUser}>
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
