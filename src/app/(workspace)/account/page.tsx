"use client";

import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

function getInitials(fullName: string | null | undefined, email: string | null | undefined) {
  const source = fullName?.trim() || email?.trim() || "M";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

export default function AccountPage() {
  const { profile } = useAuth();

  const initials = getInitials(profile?.full_name, profile?.email);

  return (
    <div>
      <PageHeader title="Mi Cuenta" subtitle="Resumen de tu perfil y acceso" />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Perfil Card */}
        <Card className="mantix-card">
          <CardContent className="p-5">
            <div className="card-title-row">
              <div className="card-title">Perfil</div>
              <Link href="/settings" className="card-link">Editar</Link>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={initials}
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, var(--blue), var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {initials}
                </div>
              )}
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--t1)" }}>{profile?.full_name ?? "Sin nombre"}</div>
                <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 3 }}>{profile?.email ?? ""}</div>
                <div style={{ marginTop: 6 }}>
                  {profile?.is_active ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(0,214,143,0.12)", color: "var(--green)" }}>Activo</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(255,61,90,0.12)", color: "var(--red)" }}>Pendiente</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-[14px] text-muted">
              <div><strong className="text-foreground">Rol:</strong> {profile?.role ?? "Sin rol"}</div>
              {profile?.display_name && (
                <div><strong className="text-foreground">Nombre visible:</strong> {profile.display_name}</div>
              )}
              {profile?.phone && (
                <div><strong className="text-foreground">Teléfono:</strong> {profile.phone}</div>
              )}
              <div>
                <strong className="text-foreground">Tema:</strong>{" "}
                {profile?.theme_preference === "dark" ? "Oscuro" : profile?.theme_preference === "light" ? "Claro" : "Sistema"}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="btn-secondary" href="/settings">Editar perfil</Link>
              <Link className="btn-secondary" href="/auth/forgot-password">Cambiar contraseña</Link>
            </div>
          </CardContent>
        </Card>

        {/* Info de cuenta */}
        <Card className="mantix-card">
          <CardContent className="p-5">
            <div className="card-title-row">
              <div className="card-title">Información de cuenta</div>
            </div>
            <div className="space-y-3 text-[14px] text-muted">
              <div>
                <strong className="text-foreground">ID de usuario</strong>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 2, color: "var(--t3)", wordBreak: "break-all" }}>{profile?.id ?? "-"}</div>
              </div>
              <div><strong className="text-foreground">Último acceso:</strong>{" "}
                {profile?.last_login ? new Date(profile.last_login).toLocaleString("es-AR") : "No disponible"}
              </div>
              <div><strong className="text-foreground">Cuenta creada:</strong>{" "}
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("es-AR") : "-"}
              </div>
              <div><strong className="text-foreground">Avatar:</strong>{" "}
                {profile?.avatar_url ? "Foto personalizada" : "Iniciales"}
              </div>
              {profile?.is_super_admin && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(139,92,246,0.12)", color: "#7c3aed" }}>Super Admin</span>
                </div>
              )}
              {profile?.is_mantix_admin && !profile.is_super_admin && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(14,165,233,0.12)", color: "#0284c7" }}>Mantix Admin</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
