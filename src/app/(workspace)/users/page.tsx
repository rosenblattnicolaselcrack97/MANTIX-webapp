"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { isCompanyAdminRole } from "@/lib/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

interface CompanyUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLE_OPTIONS = ["admin", "manager", "technician", "viewer", "supervisor", "financiero", "solo_lectura"];

export default function CompanyUsersPage() {
  const { profile } = useAuth();

  const [users, setUsers] = useState<CompanyUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("technician");
  const [isInviting, setIsInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const isCompanyAdmin = useMemo(() => isCompanyAdminRole(profile?.role), [profile?.role]);

  const loadUsers = async () => {
    setError(null);
    setFeedback(null);
    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError("Sesion no valida.");
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/company/users", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; users?: CompanyUserRow[] };

    if (!response.ok) {
      setError(payload.error ?? "No se pudo cargar usuarios.");
      setIsLoading(false);
      return;
    }

    setUsers(payload.users ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isCompanyAdmin) void loadUsers();
  }, [isCompanyAdmin]);

  const inviteUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!inviteEmail.trim() || !inviteName.trim()) {
      setError("Ingresa nombre y email para invitar.");
      return;
    }

    setIsInviting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError("Sesion no valida.");
      setIsInviting(false);
      return;
    }

    const response = await fetch("/api/company/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: inviteEmail,
        full_name: inviteName,
        role: inviteRole,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "No se pudo invitar el usuario.");
      setIsInviting(false);
      return;
    }

    setInviteEmail("");
    setInviteName("");
    setInviteRole("technician");
    setFeedback("Invitacion enviada correctamente.");
    setIsInviting(false);
    await loadUsers();
  };

  const patchUser = async (userId: string, updates: Record<string, unknown>) => {
    setError(null);
    setFeedback(null);
    setBusyUserId(userId);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Sesion no valida.");
      setBusyUserId(null);
      return;
    }

    const response = await fetch(`/api/company/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "No se pudo actualizar el usuario.");
      setBusyUserId(null);
      return;
    }

    setFeedback("Usuario actualizado.");
    await loadUsers();
    setBusyUserId(null);
  };

  const resendInvite = async (userId: string) => {
    setError(null);
    setFeedback(null);
    setBusyUserId(userId);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Sesion no valida.");
      setBusyUserId(null);
      return;
    }

    const response = await fetch(`/api/company/users/${userId}/resend-invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "No se pudo reenviar la invitacion.");
      setBusyUserId(null);
      return;
    }

    setFeedback("Invitacion reenviada.");
    setBusyUserId(null);
  };

  if (!isCompanyAdmin) {
    return (
      <div>
        <PageHeader title="Usuarios" subtitle="Gestion de usuarios por empresa" />
        <Card className="mantix-card">
          <CardContent className="p-5">
            <div className="text-[14px] text-muted">No tenes permisos para acceder a esta seccion.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Gestiona usuarios de tu empresa" />

      <Card className="mantix-card mb-5">
        <CardContent className="p-5">
          <div className="card-title-row">
            <div className="card-title">Invitar usuario</div>
          </div>

          <form className="form-grid-3" onSubmit={inviteUser}>
            <label>
              <span className="form-label">Nombre</span>
              <input className="form-control" value={inviteName} onChange={(event) => setInviteName(event.target.value)} />
            </label>
            <label>
              <span className="form-label">Email</span>
              <input className="form-control" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" />
            </label>
            <label>
              <span className="form-label">Rol</span>
              <select className="form-control" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>

            <div>
              <button className="btn-primary" type="submit" disabled={isInviting}>
                {isInviting ? "Invitando..." : "Invitar usuario"}
              </button>
            </div>
          </form>

          {error ? <div className="mt-3 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] p-3 text-[13px] text-[#b91c1c]">{error}</div> : null}
          {feedback ? <div className="mt-3 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-[13px] text-[#15803d]">{feedback}</div> : null}
        </CardContent>
      </Card>

      <Card className="mantix-card">
        <CardContent className="p-5">
          <div className="card-title-row">
            <div className="card-title">Usuarios de empresa</div>
          </div>

          {isLoading ? (
            <div className="text-[14px] text-muted">Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="text-[14px] text-muted">Todavia no hay usuarios en esta empresa.</div>
          ) : (
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Alta</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <input
                          className="form-control"
                          defaultValue={user.full_name ?? ""}
                          disabled={busyUserId === user.id}
                          onBlur={(event) => {
                            const nextName = event.target.value.trim();
                            if (nextName && nextName !== (user.full_name ?? "")) {
                              void patchUser(user.id, { full_name: nextName });
                            }
                          }}
                          placeholder="Sin nombre"
                        />
                      </td>
                      <td>{user.email ?? "Sin email"}</td>
                      <td>
                        <select
                          className="form-control"
                          disabled={busyUserId === user.id}
                          value={user.role ?? "technician"}
                          onChange={(event) => void patchUser(user.id, { role: event.target.value })}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td>{user.is_active ? "Activo" : "Inactivo"}</td>
                      <td>{new Date(user.created_at).toLocaleDateString("es-AR")}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button className="btn-secondary" disabled={busyUserId === user.id} onClick={() => void patchUser(user.id, { is_active: !user.is_active })} type="button">
                            {user.is_active ? "Desactivar" : "Activar"}
                          </button>
                          <button className="btn-secondary" disabled={busyUserId === user.id} onClick={() => void resendInvite(user.id)} type="button">
                            {busyUserId === user.id ? "Procesando..." : "Reenviar invitacion"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          color: #fff;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          text-decoration: none;
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--t1);
          background: var(--s2);
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
