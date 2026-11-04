import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET() {
  const who = await viewer();
  if (!who.userId) return NextResponse.json({ plays: [], streaks: [] });
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ plays: [], streaks: [] });
  const [plays, streaks] = await Promise.all([
    supabase
      .from("plays")
      .select("sport, puzzle_number, solved, score, completed_at")
      .eq("user_id", who.userId)
      .order("puzzle_number", { ascending: true }),
    supabase.from("streaks").select("sport, current, best, last_played_puzzle").eq("user_id", who.userId),
  ]);
  return NextResponse.json({
    plays: plays.data ?? [],
    streaks: streaks.data ?? [],
  });
}
