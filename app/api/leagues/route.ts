import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().trim().min(3).max(40),
  sports: z.array(z.string().min(2).max(12)).min(1).max(8),
});

function inviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length] ?? "A").join("");
}

export async function GET() {
  const who = await viewer();
  if (!who.userId) return NextResponse.json({ leagues: [] });
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ leagues: [] });
  const { data } = await supabase.from("leagues").select("id, name, invite_code, sports, owner_id");
  return NextResponse.json({ leagues: data ?? [] });
}

export async function POST(request: Request) {
  const who = await viewer();
  if (!who.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Name the league and pick at least one sport." }, { status: 400 });
  const enabled = new Set(getEnabledSports().map((sport) => sport.id));
  const sports = parsed.data.sports.map((sport) => sport.toLowerCase()).filter((sport) => enabled.has(sport));
  if (sports.length === 0) return NextResponse.json({ error: "Pick an enabled sport." }, { status: 400 });
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Accounts are not configured." }, { status: 503 });
  const code = inviteCode();
  const { data, error } = await supabase
    .from("leagues")
    .insert({ name: parsed.data.name, owner_id: who.userId, invite_code: code, sports })
    .select("id, invite_code")
    .single();
  if (error || !data) return NextResponse.json({ error: "Could not create the league." }, { status: 500 });
  await supabase.from("league_members").insert({ league_id: data.id, user_id: who.userId });
  return NextResponse.json({ inviteCode: data.invite_code });
}
