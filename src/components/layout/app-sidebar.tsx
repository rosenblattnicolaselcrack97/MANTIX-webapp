"use client";

import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight, Cog, Settings2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Company, User } from "@/types/entities";
import { useAuth } from "@/contexts/AuthContext";
import { isCompanyAdminRole } from "@/lib/roles";

import { BrandMark } from "@/components/shared/brand-mark";
import { buildNavigationSections, type NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  pathname: string;
  company: Company;
  currentUser: User;
  onNavigate?: () => void;
  mobile?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function SidebarLink({
  item,
  onNavigate,
  pathname,
  collapsed,
}: {
  item: NavigationItem;
  onNavigate?: () => void;
  pathname: string;
  collapsed?: boolean;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      className={cn("sidebar-link", active && "active")}
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.title : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </Link>
  );
}

export function AppSidebar({
  company,
  currentUser,
  onNavigate,
  pathname,
  mobile = false,
  collapsed = false,
  onToggleCollapsed,
}: AppSidebarProps) {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const sections = buildNavigationSections(isCompanyAdminRole(profile?.role));

  const handleSignOut = async () => {
    await signOut();
    onNavigate?.();
    router.replace("/auth/login");
  };

  return (
    <aside
      className={cn(
        "shell-sidebar",
        collapsed && !mobile && "collapsed",
        mobile && "shell-sidebar-mobile overflow-hidden rounded-[14px] border border-line shadow-[var(--shadow-lg)]",
      )}
    >
      <div className="sidebar-brand">
        <div className="flex items-center justify-between gap-2">
          {!collapsed ? <BrandMark /> : <BrandMark compact />}
          {!mobile ? (
            <button
              className="icon-shell"
              onClick={onToggleCollapsed}
              title={collapsed ? "Expandir" : "Colapsar"}
              type="button"
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          ) : null}
        </div>
      </div>

      <div className="sidebar-scroll">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed ? <div className="sidebar-section-title">{section.label}</div> : null}
            {section.items.map((item) => (
              <SidebarLink
                item={item}
                key={item.id}
                onNavigate={onNavigate}
                pathname={pathname}
                collapsed={collapsed}
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
            <div className="sidebar-user-dropdown-sep" />
            <button
              className="sidebar-user-dropdown-item text-danger"
              onClick={handleSignOut}
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
          title={collapsed ? currentUser.fullName : undefined}
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.initials}
              style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div className="avatar-md">{currentUser.initials}</div>
          )}
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-foreground">
                {currentUser.fullName}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-cyan bg-cyan px-2 py-0.5 text-[10px] font-bold text-[var(--on-cyan)]">
                <Bell className="size-3" />
                {currentUser.team ?? "Usuario"}
              </div>
            </div>
          ) : null}
          {!collapsed ? <span className="text-sm text-muted">⋯</span> : null}
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
