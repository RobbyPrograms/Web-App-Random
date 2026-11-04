import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9]{6,10}$/, "Invite codes are 6 to 10 letters or numbers."),
});

export async function POST(request: Request) {
  const who = await viewer();
  if (!who.userId) return NextResponse.json({ error: "Sign in to join a league." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the invite code." }, { status: 400 });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Accounts are not configured." }, { status: 503 });
  const code = parsed.data.code.toUpperCase();
  const { data: league } = await admin.from("leagues").select("id, invite_code").eq("invite_code", code).maybeSingle();
  if (!league) return NextResponse.json({ error: "No league uses that code." }, { status: 404 });
  const { error } = await admin
    .from("league_members")
    .upsert({ league_id: league.id, user_id: who.userId }, { onConflict: "league_id,user_id" });
  if (error) return NextResponse.json({ error: "Could not join that league." }, { status: 500 });
  return NextResponse.json({ inviteCode: league.invite_code });
}
