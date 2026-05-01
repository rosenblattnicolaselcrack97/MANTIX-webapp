// @ts-nocheck
"use client";

import { useState } from "react";
import { Settings, Users, Link2 } from "lucide-react";
import { AdminsTab } from "./AdminsTab";
import { CompanyAdminTab } from "./CompanyAdminTab";

type Tab = "admins" | "assignments";

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("admins");

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "admins", label: "Admins", icon: Users },
    { id: "assignments", label: "Empresa - Admin", icon: Link2 },
  ];

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Settings size={20} color="#0ea5e9" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Admin Settings</h1>
        </div>
        <p style={{ fontSize: 13, color: "#64748b" }}>
          Gestion de Admins de Mantix y asignacion de empresas. Solo visible para Super Admin.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #334155", marginBottom: 28 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === id ? "2px solid #0ea5e9" : "2px solid transparent",
              color: activeTab === id ? "#0ea5e9" : "#64748b",
              fontWeight: activeTab === id ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
              marginBottom: -1,
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "admins" && <AdminsTab />}
      {activeTab === "assignments" && <CompanyAdminTab />}
    </div>
  );
}
