// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface MantixAdmin {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_mantix_admin: boolean;
  is_super_admin: boolean;
  last_login: string | null;
  created_at: string;
  company_id: string | null;
  _assignedCompanies?: number;
}

// Hook para gestionar los Admins de Mantix (CRUD).
// Solo accesible para SuperAdmin.

export function useAdminManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listar todos los Mantix Admins
  const fetchMantixAdmins = useCallback(async (): Promise<MantixAdmin[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_active, is_mantix_admin, is_super_admin, last_login, created_at, company_id")
        .or("is_mantix_admin.eq.true,is_super_admin.eq.true")
        .order("created_at", { ascending: false });

      if (err) throw err;
      if (!data) return [];

      // Contar empresas asignadas por admin
      const adminIds = data.map((a) => a.id);
      const countResults = await Promise.all(
        adminIds.map((id) =>
          supabase
            .from("admin_company_assignments")
            .select("*", { count: "exact", head: true })
            .eq("admin_id", id)
        )
      );

      return data.map((admin, i) => ({
        ...admin,
        _assignedCompanies: countResults[i]?.count ?? 0,
      }));
    } catch (e: any) {
      setError(e.message ?? "Error al cargar admins");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear un nuevo Admin de Mantix via API route (server-side con service_role)
  const createMantixAdmin = useCallback(
    async (email: string, fullName: string): Promise<{ error: string | null }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/create-mantix-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, fullName }),
        });

        const body = await res.json();
        if (!res.ok) {
          const msg = body.error ?? "Error al crear admin";
          setError(msg);
          return { error: msg };
        }
        return { error: null };
      } catch (e: any) {
        const msg = e.message ?? "Error inesperado";
        setError(msg);
        return { error: msg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Actualizar nombre de un admin
  const updateAdmin = useCallback(
    async (adminId: string, updates: { full_name?: string; is_active?: boolean }): Promise<{ error: string | null }> => {
      const { error: err } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", adminId);

      if (err) return { error: err.message };
      return { error: null };
    },
    []
  );

  // Desactivar/activar un admin
  const toggleAdminActive = useCallback(
    async (adminId: string, isActive: boolean): Promise<{ error: string | null }> => {
      return updateAdmin(adminId, { is_active: isActive });
    },
    [updateAdmin]
  );

  // Enviar email de reset de contraseña
  const resetAdminPassword = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/reset-admin-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const body = await res.json();
        if (!res.ok) {
          const msg = body.error ?? "Error al resetear contraseña";
          setError(msg);
          return { error: msg };
        }
        return { error: null };
      } catch (e: any) {
        const msg = e.message ?? "Error inesperado";
        setError(msg);
        return { error: msg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    fetchMantixAdmins,
    createMantixAdmin,
    updateAdmin,
    toggleAdminActive,
    resetAdminPassword,
  };
}
