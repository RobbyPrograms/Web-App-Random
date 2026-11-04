import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveAccess } from "@/lib/archive";
import { puzzleNumberFor } from "@/lib/dates";
import { signGuesses } from "@/lib/game-token";
import { assessGuessList } from "@/lib/guess-policy";
import { buildPuzzle, evaluateRound } from "@/lib/puzzle";
import { bumpStreak, readActorGuesses, savePlay, sweepProgress } from "@/lib/plays-store";
import { rateLimit } from "@/lib/rate-limit";
import { requireVerified, launchDate } from "@/lib/site";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { viewer } from "@/lib/viewer";
import { getEnabledSports, getSportById } from "@/sports/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  sport: z.string().min(2).max(12),
  puzzleNumber: z.number().int().positive().max(100_000),
  guesses: z.array(z.string().trim().min(2).max(80)).min(1).max(6),
  token: z.string().max(128).optional(),
  anonId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a guess as JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the guess and try again." }, { status: 400 });
  }

  const sport = getSportById(parsed.data.sport);
  const enabled = getEnabledSports();
  if (!sport || !enabled.some((item) => item.id === sport.id)) {
    return NextResponse.json({ error: "That sport isn't on the board." }, { status: 404 });
  }

  const who = await viewer();
  const access = archiveAccess(parsed.data.puzzleNumber, puzzleNumberFor(launchDate()), who.isPro);
  if (access === "future") {
    return NextResponse.json({ error: "That puzzle hasn't started." }, { status: 403 });
  }
  if (access === "locked") {
    return NextResponse.json({ error: "The archive is a Pro perk. The last 3 days are free." }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const actorKey = who.userId ?? parsed.data.anonId ?? ip;
  if (!rateLimit(`guess-ip:${ip}`, 30).ok || !rateLimit(`guess:${actorKey}`).ok) {
    return NextResponse.json({ error: "Too many guesses. Give it a minute." }, { status: 429 });
  }

  let built;
  try {
    built = buildPuzzle(sport, parsed.data.puzzleNumber, requireVerified());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Puzzle unavailable.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const stored = await readActorGuesses(
    actorKey,
    who.userId,
    parsed.data.anonId ?? null,
    sport.id,
    parsed.data.puzzleNumber,
  );
  const decision = assessGuessList({
    stored: stored?.guesses ?? null,
    incoming: parsed.data.guesses,
    token: parsed.data.token ?? null,
    sportId: sport.id,
    puzzleNumber: parsed.data.puzzleNumber,
  });
  if (!decision.ok) {
    return NextResponse.json({ error: decision.error }, { status: decision.status });
  }

  const round = evaluateRound(built, parsed.data.guesses);
  const kept = round.results.map((result) => result.guess);
  const finished = round.status !== "playing";
  await savePlay(actorKey, {
    userId: who.userId,
    anonId: parsed.data.anonId ?? null,
    sportId: sport.id,
    puzzleNumber: parsed.data.puzzleNumber,
    guesses: kept,
    solved: round.solved,
    score: round.score,
    finished,
  });

  let streak: { current: number; best: number } | null = null;
  let sweep: { solved: number; total: number; current: number } | null = null;
  if (finished && who.userId && !stored?.solved && createAdminSupabase()) {
    const next = await bumpStreak(who.userId, sport.id, parsed.data.puzzleNumber, round.solved);
    streak = { current: next.current, best: next.best };
    if (round.solved) {
      const progress = await sweepProgress(
        who.userId,
        parsed.data.puzzleNumber,
        enabled.map((item) => item.id),
      );
      sweep = { solved: progress.solved, total: progress.total, current: progress.streak?.current ?? 0 };
    }
  }

  const clues = sport.clueLadder.slice(0, round.clues.length).map((clue, index) => ({
    label: clue.label,
    text: round.clues[index] ?? "",
  }));

  return NextResponse.json({
    status: round.status,
    score: round.score,
    guessesUsed: round.guessesUsed,
    solved: round.solved,
    results: round.results,
    clues,
    token: signGuesses(sport.id, parsed.data.puzzleNumber, kept),
    reveal: round.reveal ?? null,
    streak,
    sweep,
  });
}
