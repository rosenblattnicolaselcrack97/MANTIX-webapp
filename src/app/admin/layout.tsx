// @ts-nocheck
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  ShieldCheck,
  Settings,
  ChevronRight,
  Users,
  Package,
  ClipboardList,
  MapPin,
  XCircle,
  Truck,
} from "lucide-react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { useAuth } from "@/contexts/AuthContext";
import { SelectedCompanyProvider, useSelectedCompany } from "@/contexts/SelectedCompanyContext";

// ─── Tokens de estilo ─────────────────────────────────────────────────────────

const BG = "#1e293b";
const BG2 = "#162032";
const BORDER = "#334155";
const ACCENT = "#0ea5e9";
const ACCENT_BG = "rgba(14,165,233,0.12)";
const TEXT = "#94a3b8";
const TEXT_DIM = "#64748b";

// ─── Sidebar principal ────────────────────────────────────────────────────────

function AdminSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, isSuperAdmin } = useAuth();

  const active = (href, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const link = (href, label, Icon, exact = false) => (
    <Link
      key={href}
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "10px 0" : "10px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: 8,
        textDecoration: "none",
        background: active(href, exact) ? ACCENT_BG : "transparent",
        color: active(href, exact) ? ACCENT : TEXT,
        fontWeight: active(href, exact) ? 600 : 400,
        fontSize: 13,
        transition: "all 0.15s",
        borderLeft: active(href, exact) && !collapsed ? `2px solid ${ACCENT}` : "2px solid transparent",
      }}
    >
      <Icon size={16} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  return (
    <div
      style={{
        width: collapsed ? 64 : 240,
        minHeight: "100vh",
        background: BG,
        borderRight: `1px solid ${BORDER}`,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: collapsed ? "20px 0" : "20px 20px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          height: 68,
        }}
      >
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={18} color={ACCENT} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.06em" }}>
              {isSuperAdmin ? "SUPER ADMIN" : "ADMIN PANEL"}
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: TEXT_DIM, padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Logo */}
      {!collapsed && (
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${BORDER}` }}>
          <Image
            src="/logos/logo-full.png"
            alt="Mantix"
            width={120}
            height={34}
            style={{ objectFit: "contain", objectPosition: "left", filter: "brightness(0) invert(1)" }}
          />
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {link("/admin", "Overview", LayoutDashboard, true)}
        {link("/admin/companies", "Empresas", Building2)}
        {link("/admin/users", "Usuarios", Users)}
        {isSuperAdmin && link("/admin/admin-settings", "Admin Settings", Settings)}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "8px 8px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 2 }}>
        <button
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 8, background: "transparent", color: TEXT_DIM, border: "none", cursor: "pointer", fontSize: 13, width: "100%" }}
          title={collapsed ? "Volver" : undefined}
        >
          <ArrowLeft size={16} />
          {!collapsed && <span>Volver a la app</span>}
        </button>
        <button
          onClick={async () => { await signOut(); router.replace("/auth/login"); }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 8, background: "transparent", color: TEXT_DIM, border: "none", cursor: "pointer", fontSize: 13, width: "100%" }}
          title={collapsed ? "Salir" : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesion</span>}
        </button>
      </div>
    </div>
  );
}

// ─── SubSidebar (empresa seleccionada) ───────────────────────────────────────

function AdminSubSidebar() {
  const pathname = usePathname();
  const { selectedCompany, clearSelectedCompany } = useSelectedCompany();
  const router = useRouter();

  if (!selectedCompany) return null;

  const base = `/admin/companies/${selectedCompany.id}`;

  const items = [
    { label: "Overview",     icon: LayoutDashboard, tab: "" },
    { label: "Usuarios",     icon: Users,           tab: "users" },
    { label: "Activos",      icon: Package,         tab: "assets" },
    { label: "Ordenes",      icon: ClipboardList,   tab: "workorders" },
    { label: "Sucursales",   icon: MapPin,          tab: "locations" },
    { label: "Proveedores",  icon: Truck,           tab: "providers" },
  ];

  const isTabActive = (tab) => {
    if (typeof window === "undefined") return false;
    const s = window.location.search;
    if (tab === "") return pathname === base && !s.includes("tab=");
    return s.includes(`tab=${tab}`);
  };

  const close = () => { clearSelectedCompany(); router.push("/admin/companies"); };

  return (
    <div
      style={{
        width: 220,
        minHeight: "100vh",
        background: BG2,
        borderRight: `1px solid ${BORDER}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Header empresa */}
      <div style={{ padding: "16px 14px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em" }}>Empresa</span>
          <button onClick={close} style={{ background: "transparent", border: "none", cursor: "pointer", color: TEXT_DIM, padding: 2, borderRadius: 4, display: "flex" }} title="Cerrar empresa">
            <XCircle size={14} />
          </button>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedCompany.name}
        </p>
        <span style={{ fontSize: 11, color: selectedCompany.is_active ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: selectedCompany.is_active ? "#10b981" : "#ef4444", display: "inline-block" }} />
          {selectedCompany.is_active ? "Activa" : "Inactiva"}
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(({ label, icon: Icon, tab }) => {
          const on = isTabActive(tab);
          const href = tab === "" ? base : `${base}?tab=${tab}`;
          return (
            <Link
              key={tab}
              href={href}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, textDecoration: "none", background: on ? ACCENT_BG : "transparent", color: on ? ACCENT : TEXT, fontWeight: on ? 600 : 400, fontSize: 13, transition: "all 0.15s", borderLeft: on ? `2px solid ${ACCENT}` : "2px solid transparent" }}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back button */}
      <div style={{ padding: "8px 8px 16px", borderTop: `1px solid ${BORDER}` }}>
        <button
          onClick={close}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: "transparent", color: TEXT_DIM, border: "none", cursor: "pointer", fontSize: 13, width: "100%" }}
        >
          <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
          <span>Todas las empresas</span>
        </button>
      </div>
    </div>
  );
}

// ─── Inner Layout ─────────────────────────────────────────────────────────────

function AdminLayoutInner({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <AdminSubSidebar />
      <div style={{ flex: 1, overflowX: "hidden", minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }) {
  return (
    <AdminRoute>
      <SelectedCompanyProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </SelectedCompanyProvider>
    </AdminRoute>
  );
}
