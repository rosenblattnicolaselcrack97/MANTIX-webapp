"use client";

import Link from "next/link";
import { Bell, Cog, MessageSquareMore, Settings2 } from "lucide-react";
import { useState } from "react";

import type { Company, User } from "@/types/entities";

import { BrandMark } from "@/components/shared/brand-mark";
import { navigationSections, type NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  pathname: string;
  company: Company;
  currentUser: User;
  onNavigate?: () => void;
  mobile?: boolean;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function SidebarLink({
  item,
  onNavigate,
  pathname,
}: {
  item: NavigationItem;
  onNavigate?: () => void;
  pathname: string;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      className={cn("sidebar-link", active && "active")}
      href={item.href}
      onClick={onNavigate}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.title}</span>
      {item.badge ? (
        <span
          className={cn(
            "sidebar-badge",
            item.href === "/assets" && "sidebar-badge-blue",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AppSidebar({
  company,
  currentUser,
  onNavigate,
  pathname,
  mobile = false,
}: AppSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside
      className={cn(
        "shell-sidebar",
        mobile && "shell-sidebar-mobile overflow-hidden rounded-[14px] border border-line shadow-[var(--shadow-lg)]",
      )}
    >
      <div className="sidebar-brand">
        <BrandMark />
      </div>

      <div className="sidebar-scroll">
        {navigationSections.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-title">{section.label}</div>
            {section.items.map((item) => (
              <SidebarLink
                item={item}
                key={item.id}
                onNavigate={onNavigate}
                pathname={pathname}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-user-wrap">
        {menuOpen ? (
          <div className="sidebar-user-dropdown">
            <Link
              className="sidebar-user-dropdown-item"
              href="/settings"
              onClick={() => {
                setMenuOpen(false);
                onNavigate?.();
              }}
            >
              <Settings2 className="size-4" />
              Configuracion
            </Link>
            <Link
              className="sidebar-user-dropdown-item"
              href="/messages"
              onClick={() => {
                setMenuOpen(false);
                onNavigate?.();
              }}
            >
              <MessageSquareMore className="size-4" />
              Mensajes
            </Link>
            <div className="sidebar-user-dropdown-sep" />
            <button
              className="sidebar-user-dropdown-item text-danger"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <Cog className="size-4" />
              Cerrar sesion
            </button>
          </div>
        ) : null}

        <button
          className="sidebar-user-card w-full text-left"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          <div className="avatar-md">{currentUser.initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {currentUser.fullName}
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-bold text-cyan">
              <Bell className="size-3" />
              Administrador
            </div>
          </div>
          <span className="text-sm text-muted">⋯</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-logos">
          <span className="sidebar-footer-company">{company.name}</span>
          <span>by</span>
          <span className="sidebar-footer-mantix">MANTIX</span>
        </div>
        <div className="sidebar-version">v1.0.4</div>
      </div>
    </aside>
  );
}
