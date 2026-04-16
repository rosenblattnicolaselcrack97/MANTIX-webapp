// @ts-nocheck
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  MapPin,
  Package,
  ClipboardList,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/companies", label: "Empresas", icon: Building2 },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/locations", label: "Sucursales", icon: MapPin },
  { href: "/admin/assets", label: "Activos", icon: Package },
  { href: "/admin/work-orders", label: "Órdenes de trabajo", icon: ClipboardList },
];

function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div
      style={{
        width: collapsed ? 64 : 240,
        minHeight: "100vh",
        background: "#1e293b",
        borderRight: "1px solid #334155",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: collapsed ? "20px 0" : "20px 20px",
          borderBottom: "1px solid #334155",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          height: 68,
        }}
      >
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={18} color="#0ea5e9" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.06em" }}>
              ADMIN PANEL
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Logo compacto */}
      {!collapsed && (
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #334155" }}>
          <Image
            src="/logos/logo-full.png"
            alt="Mantix"
            width={120}
            height={34}
            style={{ objectFit: "contain", objectPosition: "left", filter: "brightness(0) invert(1)" }}
          />
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 8,
                textDecoration: "none",
                background: active ? "rgba(14,165,233,0.12)" : "transparent",
                color: active ? "#0ea5e9" : "#94a3b8",
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                transition: "all 0.15s",
                borderLeft: active && !collapsed ? "2px solid #0ea5e9" : "2px solid transparent",
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: "8px 8px 16px", borderTop: "1px solid #334155", display: "flex", flexDirection: "column", gap: 2 }}>
        <button
          onClick={() => router.push("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 8,
            background: "transparent",
            color: "#64748b",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            width: "100%",
            transition: "color 0.15s",
          }}
          title={collapsed ? "Volver a la app" : undefined}
        >
          <ArrowLeft size={16} />
          {!collapsed && <span>Volver a la app</span>}
        </button>
        <button
          onClick={async () => { await signOut(); router.replace("/auth/login"); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 8,
            background: "transparent",
            color: "#64748b",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            width: "100%",
            transition: "color 0.15s",
          }}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AdminRoute>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#0f172a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <div style={{ flex: 1, overflowX: "hidden", minWidth: 0 }}>
          {children}
        </div>
      </div>
    </AdminRoute>
  );
}
