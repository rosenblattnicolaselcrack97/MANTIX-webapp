"use client";

import Link from "next/link";
import { Bell, CircleAlert, Menu, MessageSquareMore, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TopBarProps {
  title: string;
  subtitle?: string;
  notificationCount: number;
  unreadMessages: number;
  onOpenNavigation: () => void;
}

export function TopBar({
  notificationCount,
  onOpenNavigation,
  subtitle,
  title,
  unreadMessages,
}: TopBarProps) {
  return (
    <header className="topbar-shell">
      <Button
        aria-label="Abrir navegacion"
        className="lg:hidden"
        onClick={onOpenNavigation}
        size="icon"
        variant="secondary"
      >
        <Menu className="size-4" />
      </Button>

      <div className="topbar-title">
        {title}
        {subtitle ? <span className="topbar-subtitle">{subtitle}</span> : null}
      </div>

      <label className="search-shell hidden xl:flex">
        <Search className="size-4" />
        <input placeholder="Buscar..." />
      </label>

      <div className="topbar-actions">
        <Link className="icon-shell" href="/messages" title="Mensajes">
          <MessageSquareMore className="size-4" />
          {unreadMessages ? <span className="notif-dot" /> : null}
        </Link>
        <button className="icon-shell" title="Notificaciones" type="button">
          <Bell className="size-4" />
          {notificationCount ? <span className="notif-dot" /> : null}
        </button>
        <button className="icon-shell" title="Ayuda" type="button">
          <CircleAlert className="size-4" />
        </button>
        <Button asChild className="hidden xl:inline-flex" variant="default">
          <Link href="/work-orders/new">Nueva Orden</Link>
        </Button>
        <Button asChild className="hidden xl:inline-flex" variant="secondary">
          <Link href="/assets/new">Nuevo Activo</Link>
        </Button>
      </div>
    </header>
  );
}
