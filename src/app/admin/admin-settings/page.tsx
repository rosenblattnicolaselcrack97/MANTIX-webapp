// @ts-nocheck
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";

export default function AdminSettingsRoute() {
  const { isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();

  // Redirigir si no es SuperAdmin
  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace("/admin");
    }
  }, [isLoading, isSuperAdmin, router]);

  if (isLoading) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
        Verificando permisos...
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return <AdminSettingsPage />;
}
