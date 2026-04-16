import { supabase } from "@/lib/supabase";
import type { Profile } from "@/contexts/AuthContext";

/**
 * Returns the current authenticated user's session, or null if not logged in.
 */
export async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Fetches the profile for a given user ID from the profiles table.
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

/**
 * Updates the profile fields for the current authenticated user.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "full_name" | "phone" | "avatar_url">>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Deletes the current user's account from Supabase Auth.
 * Note: profile row is deleted automatically via ON DELETE CASCADE on auth.users.
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("delete_user");
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Returns whether the user has one of the allowed roles.
 */
export function hasRole(profile: Profile | null, ...roles: string[]): boolean {
  if (!profile) return false;
  return roles.includes(profile.role);
}
