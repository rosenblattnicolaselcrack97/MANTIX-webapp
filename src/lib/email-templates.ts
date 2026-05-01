/**
 * Email Templates — Mantix
 *
 * Templates HTML profesionales y responsive para emails transaccionales.
 * Cada template tiene versión HTML y fallback texto plano.
 *
 * SOLO para uso server-side.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mantixarg.com";
const LOGIN_URL = `${SITE_URL}/auth/login`;

// ─── Estilos base compartidos ─────────────────────────────────────────────────

const BASE_STYLES = `
  body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .wrapper { background-color: #f1f5f9; padding: 40px 20px; }
  .card { background: #ffffff; border-radius: 12px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
  .header { background: linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%); padding: 32px 40px; text-align: center; }
  .header-logo { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.08em; }
  .header-logo span { color: #00d4aa; }
  .body { padding: 40px; }
  .greeting { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
  .lead { font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 28px; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin-bottom: 28px; }
  .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  .info-row:last-child { border-bottom: none; }
  .info-label { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; width: 120px; flex-shrink: 0; padding-top: 1px; }
  .info-value { font-size: 14px; color: #1e293b; font-weight: 500; }
  .cta-btn { display: inline-block; background: linear-gradient(135deg, #00d4aa, #0ea5e9); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin-bottom: 32px; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }
  .footer { padding: 24px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0; }
  .footer-brand { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 8px; }
  .tag { display: inline-block; background: rgba(0,212,170,0.1); color: #059669; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(0,212,170,0.25); }
`;

function wrapHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">MANT<span>IX</span></div>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p class="footer-text">
          Este es un mensaje automático de Mantix. Por favor no respondas directamente a este email a menos que el asunto incluya una Orden de Trabajo o Activo específico.<br>
          Si no reconocés esta acción, ignorá este mensaje o contactá a <a href="mailto:soporte@mantixarg.com" style="color:#0ea5e9;">soporte@mantixarg.com</a>.
        </p>
        <p class="footer-brand">© ${new Date().getFullYear()} Mantix — Gestión de mantenimiento industrial</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Template: Bienvenida nueva cuenta ───────────────────────────────────────

export interface WelcomeEmailData {
  fullName: string;
  email: string;
  companyName: string | null;
  role: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const { fullName, email, companyName, role } = data;

  const firstName = fullName.split(" ")[0];
  const companyDisplay = companyName ?? "Sin empresa asignada";
  const roleDisplay = ROLE_LABELS[role] ?? role;

  const html = wrapHtml(
    "Bienvenido a Mantix",
    `
    <p class="greeting">Hola, ${firstName}.</p>
    <p class="lead">
      Tu cuenta en <strong>Mantix</strong> fue creada correctamente. 
      Ya podés ingresar y empezar a gestionar el mantenimiento de tu empresa.
    </p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Empresa</span>
        <span class="info-value">${companyDisplay}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Usuario</span>
        <span class="info-value">${email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Rol</span>
        <span class="info-value">${roleDisplay} <span class="tag">${roleDisplay}</span></span>
      </div>
    </div>

    <div style="text-align:center; margin-bottom: 28px;">
      <a class="cta-btn" href="${LOGIN_URL}">Ingresar a Mantix →</a>
    </div>

    <hr class="divider">

    <p style="font-size:14px; color:#475569; line-height:1.7; margin:0;">
      Mantix te ayuda a <strong>centralizar activos, órdenes de trabajo, mantenimiento y trazabilidad operativa</strong> en un solo lugar. Podés cargar tus primeros activos y crear órdenes de trabajo desde el primer día.
    </p>
    `
  );

  const text = `
Hola, ${firstName}.

Tu cuenta en Mantix fue creada correctamente.

DATOS DE TU CUENTA
------------------
Empresa:  ${companyDisplay}
Usuario:  ${email}
Rol:      ${roleDisplay}

Podés ingresar desde:
${LOGIN_URL}

Mantix centraliza activos, órdenes de trabajo, mantenimiento y trazabilidad operativa.

Si no reconocés esta acción, ignorá este mensaje o escribí a soporte@mantixarg.com.

Equipo Mantix
`.trim();

  return {
    subject: "Bienvenido a Mantix — tu cuenta fue creada",
    html,
    text,
  };
}

// ─── Template: Invitación de usuario ─────────────────────────────────────────

export interface InviteEmailData {
  fullName: string;
  email: string;
  companyName: string;
  role: string;
  invitedByName: string;
  inviteUrl: string;
}

export function buildInviteEmail(data: InviteEmailData): { subject: string; html: string; text: string } {
  const { fullName, email, companyName, role, invitedByName, inviteUrl } = data;

  const firstName = fullName.split(" ")[0];
  const roleDisplay = ROLE_LABELS[role] ?? role;

  const html = wrapHtml(
    `Invitación a Mantix — ${companyName}`,
    `
    <p class="greeting">Hola, ${firstName}.</p>
    <p class="lead">
      <strong>${invitedByName}</strong> te invitó a unirte a <strong>${companyName}</strong> en Mantix.
      Hacé clic en el botón para configurar tu contraseña e ingresar.
    </p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Empresa</span>
        <span class="info-value">${companyName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">${email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Rol asignado</span>
        <span class="info-value">${roleDisplay}</span>
      </div>
    </div>

    <div style="text-align:center; margin-bottom: 28px;">
      <a class="cta-btn" href="${inviteUrl}">Activar mi cuenta →</a>
    </div>

    <p style="font-size:13px; color:#94a3b8; text-align:center; margin:0;">
      Este enlace de activación vence en 24 horas.
    </p>

    <hr class="divider">

    <p style="font-size:14px; color:#475569; line-height:1.7; margin:0;">
      Con Mantix podés gestionar <strong>activos, órdenes de trabajo y proveedores</strong> de mantenimiento desde cualquier dispositivo.
    </p>
    `
  );

  const text = `
Hola, ${firstName}.

${invitedByName} te invitó a unirte a ${companyName} en Mantix.

DATOS DE TU CUENTA
------------------
Empresa:  ${companyName}
Email:    ${email}
Rol:      ${roleDisplay}

Activá tu cuenta desde:
${inviteUrl}

Este enlace vence en 24 horas.

Si no esperabas esta invitación, ignorá este mensaje.

Equipo Mantix
`.trim();

  return {
    subject: `Fuiste invitado a ${companyName} en Mantix`,
    html,
    text,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  technician: "Técnico",
  viewer: "Observador",
  company_admin: "Administrador de empresa",
  mantix_admin: "Administrador Mantix",
};
