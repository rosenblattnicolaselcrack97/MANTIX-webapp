"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import type { Company, User } from "@/types/entities";

import { messages, notifications } from "@/data/mock/platform";
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
  const pageMeta = getPageMeta(pathname);
  const unreadMessages = messages.filter((message) => message.unread).length;
  const unreadNotifications = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <div className="app-shell">
      <div className="hidden lg:block">
        <AppSidebar
          company={company}
          currentUser={currentUser}
          pathname={pathname}
        />
      </div>

      <div className="main-area">
        <TopBar
          notificationCount={unreadNotifications}
          onOpenNavigation={() => setMobileOpen(true)}
          subtitle={pageMeta.subtitle}
          title={pageMeta.title}
          unreadMessages={unreadMessages}
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
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
