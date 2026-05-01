"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import type { Company, User } from "@/types/entities";

import { getPageMeta } from "@/lib/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/topbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface AppShellProps {
  company: Company;
  currentUser: User;
  children: React.ReactNode;
}

export function AppShell({ children, company, currentUser }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("mantix.sidebar.collapsed") === "1";
  });
  const pageMeta = getPageMeta(pathname);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("mantix.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="app-shell">
      <div className="hidden lg:block">
        <AppSidebar
          company={company}
          currentUser={currentUser}
          pathname={pathname}
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
        />
      </div>

      <div className="main-area">
        <TopBar
          notificationCount={0}
          onOpenNavigation={() => setMobileOpen(true)}
          subtitle={pageMeta.subtitle}
          title={pageMeta.title}
          unreadMessages={0}
        />
        <main className="page-scroll">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          className="border-none bg-transparent p-3 shadow-none"
          side="left"
        >
          <SheetTitle className="sr-only">Navegacion principal</SheetTitle>
          <AppSidebar
            company={company}
            currentUser={currentUser}
            onNavigate={() => setMobileOpen(false)}
            pathname={pathname}
            mobile
            collapsed={false}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
