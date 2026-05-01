export function normalizeRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

export function isCompanyAdminRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === "admin" ||
    normalized === "manager" ||
    normalized === "admin_empresa" ||
    normalized === "company_admin"
  );
}

export function isReadOnlyRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === "viewer" || normalized === "solo_lectura";
}
