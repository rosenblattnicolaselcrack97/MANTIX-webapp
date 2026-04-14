import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { currentUser, mantixCompany } from "@/data/mock/platform";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell company={mantixCompany} currentUser={currentUser}>
      {children}
    </AppShell>
  );
}
