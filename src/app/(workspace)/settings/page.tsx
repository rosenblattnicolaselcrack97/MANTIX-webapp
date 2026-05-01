"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { isCompanyAdminRole } from "@/lib/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

interface CompanySummary {
  id: string;
  name: string;
  logo_url: string | null;
  description?: string | null;
  theme_mode?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  font_family?: string | null;
  font_size?: string | null;
  email_cc_admin?: boolean | null;
  email_template_header?: string | null;
  email_template_footer?: string | null;
}

export default function SettingsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"user" | "company">("user");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [themePreference, setThemePreference] = useState("system");
  const [webNotifications, setWebNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyThemeMode, setCompanyThemeMode] = useState("system");
  const [companyPrimaryColor, setCompanyPrimaryColor] = useState("#0ea5e9");
  const [companySecondaryColor, setCompanySecondaryColor] = useState("#14b8a6");
  const [companyFontSize, setCompanyFontSize] = useState("mediana");
  const [emailCcAdmin, setEmailCcAdmin] = useState(false);
  const [emailTemplateHeader, setEmailTemplateHeader] = useState("");
  const [emailTemplateFooter, setEmailTemplateFooter] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const isCompanyAdmin = useMemo(
    () => isCompanyAdminRole(profile?.role),
    [profile?.role],
  );

  useEffect(() => {
    let isMounted = true;

    const loadCompany = async () => {
      if (!profile?.company_id) {
        if (isMounted) {
          setCompany(null);
        }
        return;
      }

      const { data } = await supabase
        .from("companies")
        .select("id, name, logo_url")
        .eq("id", profile.company_id)
        .maybeSingle();

      if (isMounted) {
        setCompany((data as CompanySummary | null) ?? null);
      }

      if (!isCompanyAdmin) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const response = await fetch("/api/company/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = (await response.json().catch(() => ({}))) as {
        company?: CompanySummary;
        error?: string;
      };

      if (!isMounted) return;

      if (response.ok && payload.company) {
        setCompany(payload.company);
      } else if (payload.error) {
        setCompanyError(payload.error);
      }
    };

    void loadCompany();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id, isCompanyAdmin]);

  useEffect(() => {
    if (!profile) return;

    const parts = profile.full_name?.trim().split(/\s+/).filter(Boolean) ?? [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
    setDisplayName(profile.full_name ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  useEffect(() => {
    if (!company) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompanyName(company.name);
    setCompanyLogoUrl(company.logo_url ?? null);
    setCompanyDescription(company.description ?? "");
    setCompanyThemeMode(company.theme_mode ?? "system");
    setCompanyPrimaryColor(company.primary_color ?? "#0ea5e9");
    setCompanySecondaryColor(company.secondary_color ?? "#14b8a6");
    setCompanyFontSize(company.font_size ?? "mediana");
    setEmailCcAdmin(Boolean(company.email_cc_admin));
    setEmailTemplateHeader(company.email_template_header ?? "");
    setEmailTemplateFooter(company.email_template_footer ?? "");
  }, [company]);

  const saveUserSettings = async () => {
    if (!profile?.id) return;

    setUserError(null);
    setUserMessage(null);
    setIsSavingUser(true);

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();

    const updates = {
      full_name: fullName || displayName.trim() || profile.full_name,
      avatar_url: avatarUrl,
      display_name: displayName.trim() || null,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      theme_preference: themePreference,
      notification_preferences: { web: webNotifications },
      email_preferences: { enabled: emailNotifications },
    };

    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);

    if (error) {
      setUserError(error.message);
      setIsSavingUser(false);
      return;
    }

    setUserMessage("Configuracion de usuario guardada correctamente.");
    setIsSavingUser(false);
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setUserError(null);
    setUserMessage(null);
    setIsUploadingAvatar(true);

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${profile.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("user-avatars").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });

    if (uploadError) {
      setUserError(uploadError.message);
      setIsUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("user-avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setIsUploadingAvatar(false);
    setUserMessage("Avatar actualizado. Recorda guardar para persistir cambios.");
  };

  const saveCompanySettings = async () => {
    if (!isCompanyAdmin) return;

    setCompanyError(null);
    setCompanyMessage(null);
    setIsSavingCompany(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setCompanyError("No se pudo validar tu sesion.");
      setIsSavingCompany(false);
      return;
    }

    const response = await fetch("/api/company/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: companyName.trim(),
        description: companyDescription.trim() || null,
        logo_url: companyLogoUrl,
        theme_mode: companyThemeMode,
        primary_color: companyPrimaryColor,
        secondary_color: companySecondaryColor,
        font_size: companyFontSize,
        email_cc_admin: emailCcAdmin,
        email_template_header: emailTemplateHeader.trim() || null,
        email_template_footer: emailTemplateFooter.trim() || null,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setCompanyError(payload.error ?? "No se pudo guardar la configuracion de empresa.");
      setIsSavingCompany(false);
      return;
    }

    setCompanyMessage("Configuracion de empresa guardada correctamente.");
    setIsSavingCompany(false);
  };

  const uploadCompanyLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !company?.id) return;

    setCompanyError(null);
    setCompanyMessage(null);
    setIsUploadingCompanyLogo(true);

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${company.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("company-logos").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });

    if (uploadError) {
      setCompanyError(uploadError.message);
      setIsUploadingCompanyLogo(false);
      return;
    }

    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    setCompanyLogoUrl(data.publicUrl);
    setIsUploadingCompanyLogo(false);
    setCompanyMessage("Logo actualizado. Recorda guardar para persistir cambios.");
  };

  return (
    <div>
      <PageHeader
        subtitle="Configuracion separada por usuario y empresa"
        title="Configuración"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <button className={`filter-chip ${activeTab === "user" ? "active" : ""}`} onClick={() => setActiveTab("user")} type="button">
          Usuario
        </button>
        <button
          className={`filter-chip ${activeTab === "company" ? "active" : ""}`}
          onClick={() => setActiveTab("company")}
          type="button"
          disabled={!isCompanyAdmin}
          title={!isCompanyAdmin ? "Solo administradores de empresa" : undefined}
        >
          Empresa
        </button>
      </div>

      {activeTab === "user" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Datos personales</div>
              </div>

              <div className="space-y-3 text-[14px] text-muted">
                <div><strong className="text-foreground">Email:</strong> {profile?.email ?? "Sin email"}</div>
                <div><strong className="text-foreground">Empresa:</strong> {company?.name ?? "Sin empresa"}</div>
                <div><strong className="text-foreground">Rol:</strong> {profile?.role ?? "Sin definir"}</div>
              </div>

              <div className="form-stack mt-4">
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">Nombre</span>
                    <input className="form-control" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                  </label>
                  <label>
                    <span className="form-label">Apellido</span>
                    <input className="form-control" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                  </label>
                </div>

                <label>
                  <span className="form-label">Nombre visible</span>
                  <input className="form-control" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </label>

                <div>
                  <span className="form-label">Avatar</span>
                  {avatarUrl ? (
                    <div className="mb-2 text-[12px] text-muted">Avatar actual cargado.</div>
                  ) : (
                    <div className="mb-2 text-[12px] text-muted">Sin avatar cargado.</div>
                  )}
                  <input type="file" accept="image/*" onChange={uploadAvatar} />
                  <div className="mt-1 text-[12px] text-muted">Si no subis foto, se usaran iniciales como avatar.</div>
                </div>

                <div className="form-grid-3">
                  <label>
                    <span className="form-label">Tema</span>
                    <select className="form-control" value={themePreference} onChange={(event) => setThemePreference(event.target.value)}>
                      <option value="light">Claro</option>
                      <option value="dark">Oscuro</option>
                      <option value="system">Sistema</option>
                    </select>
                  </label>

                  <label>
                    <span className="form-label">Notificaciones web</span>
                    <select className="form-control" value={webNotifications ? "on" : "off"} onChange={(event) => setWebNotifications(event.target.value === "on")}>
                      <option value="on">Activadas</option>
                      <option value="off">Desactivadas</option>
                    </select>
                  </label>

                  <label>
                    <span className="form-label">Emails</span>
                    <select className="form-control" value={emailNotifications ? "on" : "off"} onChange={(event) => setEmailNotifications(event.target.value === "on")}>
                      <option value="on">Activados</option>
                      <option value="off">Desactivados</option>
                    </select>
                  </label>
                </div>

                {userError ? <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] p-3 text-[13px] text-[#b91c1c]">{userError}</div> : null}
                {userMessage ? <div className="rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-[13px] text-[#15803d]">{userMessage}</div> : null}

                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary" onClick={saveUserSettings} type="button" disabled={isSavingUser || isUploadingAvatar}>
                    {isSavingUser ? "Guardando..." : "Guardar configuracion"}
                  </button>
                  <Link className="btn-secondary" href="/auth/forgot-password">
                    Cambiar contrasena
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="card-title-row">
                <div className="card-title">Preferencias de cuenta</div>
              </div>
              <div className="space-y-3 text-[14px] text-muted">
                <div>Estado de perfil: {profile?.is_active ? "Activo" : "Pendiente"}</div>
                <div>ID de usuario: {profile?.id ?? "-"}</div>
                <div>Avatar cargado: {avatarUrl ? "Si" : "No"}</div>
                <div>Tema personal: {themePreference}</div>
                <div>Web notifications: {webNotifications ? "On" : "Off"}</div>
                <div>Email preferences: {emailNotifications ? "On" : "Off"}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "company" ? (
        isCompanyAdmin ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">Configuracion de empresa</div>
                </div>

                <div className="form-stack">
                  <label>
                    <span className="form-label">Nombre visible</span>
                    <input className="form-control" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                  </label>

                  <label>
                    <span className="form-label">Descripcion</span>
                    <textarea className="form-control" rows={3} value={companyDescription} onChange={(event) => setCompanyDescription(event.target.value)} />
                  </label>

                  <div>
                    <span className="form-label">Logo empresa</span>
                    <input type="file" accept="image/*" onChange={uploadCompanyLogo} />
                    <div className="mt-1 text-[12px] text-muted">Si no hay logo, se conserva branding base de Mantix.</div>
                  </div>

                  <div className="form-grid-2">
                    <label>
                      <span className="form-label">Color principal</span>
                      <input className="form-control" type="color" value={companyPrimaryColor} onChange={(event) => setCompanyPrimaryColor(event.target.value)} />
                    </label>
                    <label>
                      <span className="form-label">Color secundario</span>
                      <input className="form-control" type="color" value={companySecondaryColor} onChange={(event) => setCompanySecondaryColor(event.target.value)} />
                    </label>
                  </div>

                  <div className="form-grid-3">
                    <label>
                      <span className="form-label">Tema empresa</span>
                      <select className="form-control" value={companyThemeMode} onChange={(event) => setCompanyThemeMode(event.target.value)}>
                        <option value="light">Claro</option>
                        <option value="dark">Oscuro</option>
                        <option value="system">Sistema</option>
                      </select>
                    </label>
                    <label>
                      <span className="form-label">Tamano de letra</span>
                      <select className="form-control" value={companyFontSize} onChange={(event) => setCompanyFontSize(event.target.value)}>
                        <option value="chica">Chica</option>
                        <option value="mediana">Mediana</option>
                        <option value="grande">Grande</option>
                      </select>
                    </label>
                    <label>
                      <span className="form-label">Emails CC admin</span>
                      <select className="form-control" value={emailCcAdmin ? "on" : "off"} onChange={(event) => setEmailCcAdmin(event.target.value === "on")}>
                        <option value="off">No</option>
                        <option value="on">Si</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    <span className="form-label">Header base de emails</span>
                    <input className="form-control" value={emailTemplateHeader} onChange={(event) => setEmailTemplateHeader(event.target.value)} />
                  </label>

                  <label>
                    <span className="form-label">Footer base de emails</span>
                    <input className="form-control" value={emailTemplateFooter} onChange={(event) => setEmailTemplateFooter(event.target.value)} />
                  </label>

                  {companyError ? <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] p-3 text-[13px] text-[#b91c1c]">{companyError}</div> : null}
                  {companyMessage ? <div className="rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-[13px] text-[#15803d]">{companyMessage}</div> : null}

                  <button className="btn-primary" onClick={saveCompanySettings} type="button" disabled={isSavingCompany || isUploadingCompanyLogo}>
                    {isSavingCompany ? "Guardando..." : "Guardar empresa"}
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">Gestion de usuarios</div>
                </div>
                <p className="text-[14px] text-muted">
                  Como administrador de empresa, podes gestionar usuarios, roles, invitaciones y estados desde la seccion dedicada.
                </p>
                <div className="mt-4">
                  <Link className="btn-secondary" href="/users">
                    Ir a Usuarios de empresa
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="text-[14px] text-muted">Solo los administradores de empresa pueden editar esta seccion.</div>
            </CardContent>
          </Card>
        )
      ) : null}

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
