// @ts-nocheck
"use client";

import { useAuth } from "@/contexts/AuthContext";

// Hook centralizado para permisos del usuario actual en el panel admin.
// Evita repetir la lógica de roles en cada componente.

export function useUserPermissions() {
  const { profile, isSuperAdmin, isMantixAdmin, isAdminLevel, isLoading } = useAuth();

  return {
    // Nivel de acceso
    isSuperAdmin,
    isMantixAdmin,
    isAdminLevel,

    // Acciones permitidas
    canCreateAdmins:         isSuperAdmin,
    canEditAdmins:           isSuperAdmin,
    canDeactivateAdmins:     isSuperAdmin,
    canAssignCompaniesToAdmins: isSuperAdmin,
    canDeleteCompany:        isSuperAdmin,
    canCreateCompany:        isSuperAdmin,
    canViewAdminSettings:    isSuperAdmin,

    // Datos del perfil
    profile,
    role: profile?.role ?? null,
    isLoading,
  };
}
