import { NextResponse } from "next/server";
import { z } from "zod";
import { distributionFor } from "@/lib/plays-store";
import { getEnabledSports, getSportById } from "@/sports/registry";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  sport: z.string().min(2).max(12),
  puzzle: z.coerce.number().int().positive().max(100_000),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    sport: url.searchParams.get("sport"),
    puzzle: url.searchParams.get("puzzle"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing sport or puzzle." }, { status: 400 });
  }
  const sport = getSportById(parsed.data.sport);
  const enabled = getEnabledSports();
  if (!sport || !enabled.some((item) => item.id === sport.id)) {
    return NextResponse.json({ error: "That sport isn't on the board." }, { status: 404 });
  }
  const board = await distributionFor(sport.id, parsed.data.puzzle);
  return NextResponse.json(board);
}
