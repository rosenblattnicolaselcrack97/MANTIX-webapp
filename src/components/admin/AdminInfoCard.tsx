// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { UserCheck, UserX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface AdminInfo {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

// Muestra el Admin de Mantix responsable de esta empresa.
// El admin NO es editable desde aqui — solo desde Admin Settings.
export function AdminInfoCard({ companyId }: { companyId: string }) {
  const { isSuperAdmin } = useAuth();
  const [admin, setAdmin] = useState<AdminInfo | null | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("admin_company_assignments")
        .select("profiles(id, full_name, email, is_active)")
        .eq("company_id", companyId)
        .maybeSingle();

      setAdmin(data?.profiles ?? null);
    };
    load();
  }, [companyId]);

  if (!isSuperAdmin) return null; // Solo SuperAdmin ve este card
  if (admin === undefined) return null; // Cargando

  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: admin ? "rgba(14,165,233,0.12)" : "rgba(100,116,139,0.12)",
          border: `1px solid ${admin ? "rgba(14,165,233,0.3)" : "rgba(100,116,139,0.3)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {admin ? <UserCheck size={18} color="#0ea5e9" /> : <UserX size={18} color="#64748b" />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
          Admin Responsable
        </p>
        {admin ? (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 1 }}>{admin.full_name}</p>
            <p style={{ fontSize: 12, color: "#64748b" }}>{admin.email}</p>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>
            Sin admin asignado
          </p>
        )}
      </div>
      {admin && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 20,
            background: admin.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            color: admin.is_active ? "#10b981" : "#ef4444",
          }}
        >
          {admin.is_active ? "Activo" : "Inactivo"}
        </span>
      )}
    </div>
  );
}
