import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface ProfileRow {
  id: string;
  username: string | null;
  created_at: string;
}

function usable(value: string | undefined, placeholders: string[]): value is string {
  if (!value || value.trim().length < 8) return false;
  return !placeholders.some((placeholder) => value.includes(placeholder));
}

export function isSupabaseConfigured(): boolean {
  return (
    usable(process.env.NEXT_PUBLIC_SUPABASE_URL, ["your-project"]) &&
    usable(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, ["your-anon"])
  );
}

export function isAdminConfigured(): boolean {
  return (
    usable(process.env["NEXT_PUBLIC_SUPABASE_URL"], ["your-project"]) &&
    usable(process.env["SUPABASE_SERVICE_ROLE_KEY"], ["your-service-role"])
  );
}

export async function readProfile(client: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, username, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}

export async function currentUser(client: SupabaseClient): Promise<User | null> {
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}
