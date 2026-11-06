import "server-only";
import { currentUser, readProfile } from "@/lib/profile";
import { createServerSupabase } from "@/lib/supabase/server";

export interface Viewer {
  userId: string | null;
  email: string | null;
  username: string | null;
}

export async function viewer(): Promise<Viewer> {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return { userId: null, email: null, username: null };
  }
  const user = await currentUser(supabase);
  if (!user) {
    return { userId: null, email: null, username: null };
  }
  const profile = await readProfile(supabase, user.id);
  return {
    userId: user.id,
    email: user.email ?? null,
    username: profile?.username ?? null,
  };
}
