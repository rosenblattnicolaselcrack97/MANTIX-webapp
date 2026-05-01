// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminAssignment {
  id: string;
  admin_id: string;
  company_id: string;
  assigned_at: string;
  assigned_by: string | null;
  // Joined fields
  admin_name?: string;
  admin_email?: string;
  company_name?: string;
}

// Hook para gestionar las asignaciones admin_company_assignments.
// Solo SuperAdmin puede crear/eliminar asignaciones.

export function useAdminAssignments() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener todas las asignaciones (con datos de admin y empresa)
  const fetchAssignments = useCallback(async (): Promise<AdminAssignment[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("admin_company_assignments")
        .select("id, admin_id, company_id, assigned_at, assigned_by")
        .order("assigned_at", { ascending: false });

      if (err) throw err;
      if (!data) return [];

      // Enriquecer con nombres de admin y empresa
      const adminIds = [...new Set(data.map((a) => a.admin_id))];
      const companyIds = [...new Set(data.map((a) => a.company_id))];

      const [{ data: admins }, { data: companies }] = await Promise.all([
        adminIds.length > 0
          ? supabase.from("profiles").select("id, full_name, email").in("id", adminIds)
          : { data: [] },
        companyIds.length > 0
          ? supabase.from("companies").select("id, name").in("id", companyIds)
          : { data: [] },
      ]);

      const adminMap = Object.fromEntries((admins ?? []).map((a) => [a.id, a]));
      const companyMap = Object.fromEntries((companies ?? []).map((c) => [c.id, c]));

      return data.map((a) => ({
        ...a,
        admin_name: adminMap[a.admin_id]?.full_name,
        admin_email: adminMap[a.admin_id]?.email,
        company_name: companyMap[a.company_id]?.name,
      }));
    } catch (e: any) {
      setError(e.message ?? "Error al cargar asignaciones");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener las empresas asignadas a UN admin específico
  const fetchAssignedCompanies = useCallback(async (adminId: string) => {
    const { data, error: err } = await supabase
      .from("admin_company_assignments")
      .select("company_id, companies(id, name, plan, is_active)")
      .eq("admin_id", adminId);

    if (err) return [];
    return (data ?? []).map((a) => a.companies).filter(Boolean);
  }, []);

  // Obtener el admin asignado a UNA empresa específica
  const fetchAssignedAdmin = useCallback(async (companyId: string) => {
    const { data, error: err } = await supabase
      .from("admin_company_assignments")
      .select("admin_id, profiles(id, full_name, email, is_active)")
      .eq("company_id", companyId)
      .maybeSingle();

    if (err || !data) return null;
    return data.profiles ?? null;
  }, []);

  // Asignar un admin a una empresa (reemplaza asignación previa)
  const assignAdmin = useCallback(
    async (adminId: string, companyId: string): Promise<{ error: string | null }> => {
      setLoading(true);
      setError(null);
      try {
        // Eliminar asignación previa de ese admin a esa empresa (si existe)
        await supabase
          .from("admin_company_assignments")
          .delete()
          .eq("company_id", companyId);

        if (adminId === "") {
          // "Sin asignar" — solo eliminamos
          return { error: null };
        }

        const { error: err } = await supabase
          .from("admin_company_assignments")
          .insert({
            admin_id: adminId,
            company_id: companyId,
            assigned_by: profile?.id ?? null,
          });

        if (err) throw err;
        return { error: null };
      } catch (e: any) {
        const msg = e.message ?? "Error al asignar admin";
        setError(msg);
        return { error: msg };
      } finally {
        setLoading(false);
      }
    },
    [profile]
  );

  // Eliminar todas las asignaciones de un admin
  const removeAllAssignments = useCallback(async (adminId: string): Promise<{ error: string | null }> => {
    const { error: err } = await supabase
      .from("admin_company_assignments")
      .delete()
      .eq("admin_id", adminId);

    if (err) return { error: err.message };
    return { error: null };
  }, []);

  return {
    loading,
    error,
    fetchAssignments,
    fetchAssignedCompanies,
    fetchAssignedAdmin,
    assignAdmin,
    removeAllAssignments,
  };
}
