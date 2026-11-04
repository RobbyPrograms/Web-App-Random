import { NextResponse } from "next/server";
import { puzzleNumberFor } from "@/lib/dates";
import { launchDate } from "@/lib/site";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const who = await viewer();
  if (!who.userId) return NextResponse.json({ error: "Sign in to open a league." }, { status: 401 });
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Accounts are not configured." }, { status: 503 });
  const { code } = await context.params;
  const { data: league } = await admin
    .from("leagues")
    .select("id, name, invite_code, sports, owner_id")
    .eq("invite_code", code.toUpperCase())
    .maybeSingle();
  if (!league) return NextResponse.json({ error: "No league uses that code." }, { status: 404 });

  const { data: memberRows } = await admin.from("league_members").select("user_id").eq("league_id", league.id);
  const memberIds = (memberRows ?? []).map((row) => String(row.user_id));
  if (!memberIds.includes(who.userId) && String(league.owner_id) !== who.userId) {
    return NextResponse.json({ error: "Join this league to see the board." }, { status: 403 });
  }
  if (memberIds.length === 0) {
    return NextResponse.json({
      league,
      today: puzzleNumberFor(launchDate()),
      members: [],
      plays: [],
    });
  }
  const [profiles, plays] = await Promise.all([
    admin.from("profiles").select("id, username").in("id", memberIds),
    admin.from("plays").select("user_id, sport, puzzle_number, score, solved").in("user_id", memberIds),
  ]);
  return NextResponse.json({
    league,
    today: puzzleNumberFor(launchDate()),
    members: profiles.data ?? [],
    plays: plays.data ?? [],
  });
}
