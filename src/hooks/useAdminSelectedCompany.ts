// @ts-nocheck
"use client";

import { useSelectedCompany, SelectedCompany } from "@/contexts/SelectedCompanyContext";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

// Hook conveniente que envuelve el contexto de empresa seleccionada
// y provee helpers de navegación.

export function useAdminSelectedCompany() {
  const { selectedCompany, setSelectedCompany, clearSelectedCompany } = useSelectedCompany();
  const router = useRouter();

  // Selecciona una empresa y navega al detail de la misma
  const selectAndNavigate = useCallback(
    (company: SelectedCompany) => {
      setSelectedCompany(company);
      router.push(`/admin/companies/${company.id}`);
    },
    [setSelectedCompany, router]
  );

  // Deselecciona la empresa y vuelve al listado
  const deselectAndGoBack = useCallback(() => {
    clearSelectedCompany();
    router.push("/admin/companies");
  }, [clearSelectedCompany, router]);

  return {
    selectedCompany,
    setSelectedCompany,
    clearSelectedCompany,
    selectAndNavigate,
    deselectAndGoBack,
  };
}
