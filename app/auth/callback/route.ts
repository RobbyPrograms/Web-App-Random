import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/play";
  if (code) {
    const supabase = await createServerSupabase();
    if (supabase) await supabase.auth.exchangeCodeForSession(code);
  }
  const destination = next.startsWith("/") ? next : "/play";
  return NextResponse.redirect(new URL(destination, url.origin));
}
