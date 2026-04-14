"use client";

import { Monitor, MoonStar, SunMedium } from "lucide-react";
import { useMemo, useState } from "react";

import { currentUser, mantixCompany } from "@/data/mock/platform";
import { useTheme } from "@/components/theme/theme-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const tabs = [
  { id: "company", label: "Empresa" },
  { id: "users", label: "Usuarios y roles" },
  { id: "notifications", label: "Notificaciones" },
  { id: "appearance", label: "Apariencia" },
  { id: "billing", label: "Plan y facturacion" },
] as const;

const fontOptions = [
  {
    id: "segoe",
    name: "Segoe UI",
    type: "Sistema (default)",
    family: '"Segoe UI", system-ui, sans-serif',
  },
  { id: "arial", name: "Arial", type: "Sans-serif clasica", family: "Arial, Helvetica, sans-serif" },
  { id: "verdana", name: "Verdana", type: "Muy legible", family: "Verdana, Geneva, sans-serif" },
  { id: "tahoma", name: "Tahoma", type: "Compacta y clara", family: "Tahoma, Geneva, sans-serif" },
  { id: "trebuchet", name: "Trebuchet MS", type: "Moderna y legible", family: '"Trebuchet MS", sans-serif' },
  { id: "georgia", name: "Georgia", type: "Serif elegante", family: "Georgia, Times, serif" },
] as const;

export function SettingsWorkspace() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("company");
  const [fontPreview, setFontPreview] = useState<(typeof fontOptions)[number]["id"]>("segoe");
  const { resolvedTheme, setTheme, theme } = useTheme();

  const previewFont = useMemo(
    () => fontOptions.find((option) => option.id === fontPreview) ?? fontOptions[0],
    [fontPreview],
  );

  return (
    <div>
      <PageHeader
        subtitle="Ajustes de tu espacio en Mantix"
        title="Configuracion"
      />

      <div className="settings-layout">
        <Card className="mantix-card h-fit">
          <CardContent className="p-5">
            <div className="settings-nav">
              {tabs.map((tab) => (
                <button
                  className={`settings-tab ${tab.id === activeTab ? "active" : ""}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="stack-20">
          {activeTab === "company" ? (
            <>
              <Card className="mantix-card">
                <CardContent className="p-5">
                  <div className="card-title-row">
                    <div className="card-title">Datos de la empresa</div>
                  </div>
                  <div className="form-stack">
                    <div className="form-grid-2">
                      <label>
                        <span className="form-label">Nombre</span>
                        <input className="form-control" defaultValue={mantixCompany.name} />
                      </label>
                      <label>
                        <span className="form-label">CUIT/RUT</span>
                        <input className="form-control" defaultValue="30-12345678-9" />
                      </label>
                    </div>
                    <div className="form-grid-2">
                      <label>
                        <span className="form-label">Rubro</span>
                        <input className="form-control" defaultValue={mantixCompany.industry} />
                      </label>
                      <label>
                        <span className="form-label">Pais</span>
                        <select className="form-control" defaultValue="Argentina">
                          <option>Argentina</option>
                          <option>Paraguay</option>
                          <option>Uruguay</option>
                        </select>
                      </label>
                    </div>
                    <div>
                      <Button>Guardar cambios</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mantix-card">
                <CardContent className="p-5">
                  <div className="card-title-row">
                    <div className="card-title">Logo de empresa</div>
                  </div>
                  <div className="mb-4 text-[13px] text-muted">
                    Subi el logo de tu empresa en PNG para que aparezca en Mantix junto a
                    &quot;by MANTIX&quot;.
                  </div>
                  <div className="upload-area !p-5">
                    <div className="upload-icon !text-[24px]">🖼️</div>
                    <div className="upload-title !text-[12px]">
                      Arrastra tu logo o hace clic para seleccionar
                    </div>
                    <div className="upload-subtitle">Solo formato PNG · Maximo 2MB</div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {activeTab === "users" ? (
            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">Usuarios y roles</div>
                  <Button size="sm">Invitar usuario</Button>
                </div>
                <div className="mb-4 text-[12px] leading-6 text-muted">
                  <strong>Administrador:</strong> acceso total. <strong>Interno de mantenimiento:</strong> gestiona ordenes, activos y proveedores. <strong>Tecnico:</strong> ve y actualiza ordenes asignadas.
                </div>
                <div className="table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Nivel</th>
                        <th>Estado</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="avatar-sm">{currentUser.initials}</span>
                            <strong>{currentUser.fullName}</strong>
                          </div>
                        </td>
                        <td className="td-light">{currentUser.email}</td>
                        <td><Badge tone="cyan">Administrador</Badge></td>
                        <td><Badge tone="success">Activo</Badge></td>
                        <td className="td-mono">Tu</td>
                      </tr>
                      <tr>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="avatar-sm">MR</span>
                            <strong>M. Rodriguez</strong>
                          </div>
                        </td>
                        <td className="td-light">mrodriguez@acero-sur.com</td>
                        <td><Badge tone="brand">Interno mant.</Badge></td>
                        <td><Badge tone="success">Activo</Badge></td>
                        <td><Button size="sm" variant="ghost">Editar</Button></td>
                      </tr>
                      <tr>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="avatar-sm">PA</span>
                            <strong>P. Acosta</strong>
                          </div>
                        </td>
                        <td className="td-light">pacosta@acero-sur.com</td>
                        <td><Badge tone="neutral">Tecnico</Badge></td>
                        <td><Badge tone="success">Activo</Badge></td>
                        <td><Button size="sm" variant="ghost">Editar</Button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "notifications" ? (
            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">Notificaciones del sistema</div>
                </div>
                {[
                  ["Ordenes urgentes sin asignar", "Alerta cuando queda sin asignar mas de 2 horas"],
                  ["Preventivos proximos", "Recordatorio 5 dias antes"],
                  ["Evidencia cargada", "Aviso cuando un tecnico sube fotos"],
                  ["Mensajes nuevos", "Notificar mensajes entre usuarios y proveedores"],
                ].map(([label, subtitle]) => (
                  <div className="settings-row" key={label}>
                    <div>
                      <div className="settings-label">{label}</div>
                      <div className="settings-sub">{subtitle}</div>
                    </div>
                    <div className="toggle-switch on">
                      <div className="toggle-switch-knob" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "appearance" ? (
            <>
              <Card className="mantix-card">
                <CardContent className="p-5">
                  <div className="card-title-row">
                    <div className="card-title">Tema visual</div>
                  </div>
                  <div className="mb-4 text-[13px] text-muted">
                    Elegi como se ve Mantix en tu pantalla.
                  </div>
                  <div className="theme-options">
                    <button
                      className={`theme-option ${resolvedTheme === "dark" ? "active" : ""}`}
                      onClick={() => setTheme("dark")}
                      type="button"
                    >
                      <div className="theme-option-icon">
                        <MoonStar className="mx-auto size-6" />
                      </div>
                      <div className="theme-option-label">Oscuro</div>
                    </button>
                    <button
                      className={`theme-option ${resolvedTheme === "light" ? "active" : ""}`}
                      onClick={() => setTheme("light")}
                      type="button"
                    >
                      <div className="theme-option-icon">
                        <SunMedium className="mx-auto size-6" />
                      </div>
                      <div className="theme-option-label">Claro</div>
                    </button>
                    <button
                      className={`theme-option ${theme === "system" ? "active" : ""}`}
                      onClick={() => setTheme("system")}
                      type="button"
                    >
                      <div className="theme-option-icon">
                        <Monitor className="mx-auto size-6" />
                      </div>
                      <div className="theme-option-label">Sistema</div>
                    </button>
                  </div>
                  <div className="mt-4 rounded-[12px] border border-line bg-surface-alt p-4 text-[12px] text-muted">
                    El selector de tema personalizado del HTML se muestra aqui de forma simplificada para evitar duplicar el motor de theming.
                  </div>
                </CardContent>
              </Card>

              <Card className="mantix-card">
                <CardContent className="p-5">
                  <div className="card-title-row">
                    <div className="card-title">Tipografia</div>
                  </div>
                  <div className="mb-4 text-[13px] text-muted">
                    Vista previa local de estilos tipograficos. No cambia la fuente global de la app.
                  </div>
                  <div className="font-grid">
                    {fontOptions.map((option) => (
                      <button
                        className={`font-option ${fontPreview === option.id ? "active" : ""}`}
                        key={option.id}
                        onClick={() => setFontPreview(option.id)}
                        style={{ fontFamily: option.family }}
                        type="button"
                      >
                        <div className="font-sample">Aa</div>
                        <div className="font-name">{option.name}</div>
                        <div className="font-type">{option.type}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[10px] border border-line bg-surface-alt p-4">
                    <div className="mb-1 text-[11px] text-muted-soft">
                      Vista previa con la fuente seleccionada:
                    </div>
                    <div
                      className="mb-1 text-[15px] font-semibold text-foreground"
                      style={{ fontFamily: previewFont.family }}
                    >
                      Orden de Trabajo #2847 — Compresor A3
                    </div>
                    <div
                      className="text-[13px] text-muted"
                      style={{ fontFamily: previewFont.family }}
                    >
                      El tecnico M. Rodriguez esta realizando el cambio de rodamiento en la planta baja.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {activeTab === "billing" ? (
            <Card className="mantix-card">
              <CardContent className="p-5">
                <div className="card-title-row">
                  <div className="card-title">
                    Tu plan actual <span className="plan-badge">Business</span>
                  </div>
                </div>
                <div className="mb-4 text-[13px] leading-6 text-muted">
                  Plan <strong className="text-foreground">Business</strong> — Hasta 10 usuarios · 1 sede
                  <br />
                  <span className="text-[12px]">USD $59/mes · Facturacion mensual</span>
                </div>
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                    <div className="mb-1 text-[11px] text-muted-soft">Usuarios activos</div>
                    <div className="text-[18px] font-bold text-foreground">
                      4 <span className="text-[12px] text-muted-soft">/ 10</span>
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-line bg-surface-alt p-3">
                    <div className="mb-1 text-[11px] text-muted-soft">Proximo pago</div>
                    <div className="text-[18px] font-bold text-foreground">1 Abr</div>
                  </div>
                </div>
                <Button variant="secondary">Cambiar plan</Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
