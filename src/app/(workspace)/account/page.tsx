"use client";

import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AccountPage() {
  const { profile } = useAuth();

  return (
    <div>
      <PageHeader title="Cuenta" subtitle="Resumen de tu perfil y acceso" />

      <Card className="mantix-card">
        <CardContent className="p-5">
          <div className="space-y-3 text-[14px] text-muted">
            <div><strong className="text-foreground">Nombre:</strong> {profile?.full_name ?? "Sin nombre"}</div>
            <div><strong className="text-foreground">Email:</strong> {profile?.email ?? "Sin email"}</div>
            <div><strong className="text-foreground">Rol:</strong> {profile?.role ?? "Sin rol"}</div>
            <div><strong className="text-foreground">Estado:</strong> {profile?.is_active ? "Activo" : "Pendiente"}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="btn-secondary" href="/settings">Editar configuracion</Link>
            <Link className="btn-secondary" href="/auth/forgot-password">Cambiar contrasena</Link>
          </div>
        </CardContent>
      </Card>

      <style>{`
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          color: var(--t1);
          background: var(--s2);
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
