// @ts-nocheck
"use client";

/**
 * Esta ruta fue simplificada.
 * Activos, Sucursales, Usuarios y OTs se gestionan desde
 * el panel de cada empresa: /admin/companies/[id]?tab=assets
 *
 * Este archivo solo redirige al listado de empresas.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectToCompanies() {
  const router = useRouter();
  // Redirige inmediatamente al listado de empresas
  useEffect(() => { router.replace("/admin/companies"); }, [router]);
  // Pantalla negra mientras redirige (evita flash de contenido incorrecto)
  return <div style={{ minHeight: "100vh", background: "#0f172a" }} />;
}
