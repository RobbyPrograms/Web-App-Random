import { NextResponse } from "next/server";
import { z } from "zod";
import { migrateAnonPlays } from "@/lib/plays-store";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ anonId: z.string().uuid() });

export async function POST(request: Request) {
  const who = await viewer();
  if (!who.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Missing anonymous id." }, { status: 400 });
  await migrateAnonPlays(
    who.userId,
    parsed.data.anonId,
    getEnabledSports().map((sport) => sport.id),
  );
  return NextResponse.json({ ok: true });
}
