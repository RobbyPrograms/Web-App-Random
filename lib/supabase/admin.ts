import { createClient } from "@supabase/supabase-js";
import { isAdminConfigured } from "@/lib/profile";

/** Service-role client. Server only. Bypasses RLS for webhooks, anon plays, and sponsor leads. */
export function createAdminSupabase() {
  if (!isAdminConfigured()) return null;
  return createClient(process.env["NEXT_PUBLIC_SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
