import type { Profile } from "@/contexts/AuthContext";

export type AccessState =
  | "unauthenticated"
  | "admin"
  | "ready"
  | "pending"
  | "no_company"
  | "incomplete_profile";

export function resolveAccessState(params: {
  isAuthenticated: boolean;
  isAdminLevel: boolean;
  profile: Profile | null;
}): AccessState {
  const { isAuthenticated, isAdminLevel, profile } = params;

  if (!isAuthenticated) return "unauthenticated";
  if (isAdminLevel) return "admin";

  if (!profile) return "incomplete_profile";
  if (profile.is_active === false) return "pending";
  if (!profile.company_id) return "no_company";

  return "ready";
}

export function buildAccountStatusRoute(state: Exclude<AccessState, "unauthenticated" | "admin" | "ready">): string {
  return `/auth/account-status?state=${state}`;
}
