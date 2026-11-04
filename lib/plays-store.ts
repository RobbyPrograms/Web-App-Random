import "server-only";
import { nextStreak, type StreakState } from "@/lib/streaks";
import { createAdminSupabase } from "@/lib/supabase/admin";

export interface StoredGuesses {
  guesses: string[];
  solved: boolean;
}

interface PlayWrite {
  userId: string | null;
  anonId: string | null;
  sportId: string;
  puzzleNumber: number;
  guesses: string[];
  solved: boolean;
  score: number;
  finished: boolean;
}

function asGuesses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function readActorGuesses(
  actorKey: string,
  userId: string | null,
  anonId: string | null,
  sportId: string,
  puzzleNumber: number,
): Promise<StoredGuesses | null> {
  const { readMemoryGuesses, memoryPlayKey } = await import("@/lib/memory-plays");
  const memory = readMemoryGuesses(memoryPlayKey(actorKey, sportId, puzzleNumber));
  const admin = createAdminSupabase();
  if (!admin || (!userId && !anonId)) {
    return memory ? { guesses: memory, solved: false } : null;
  }
  let query = admin.from("plays").select("guesses, solved").eq("sport", sportId).eq("puzzle_number", puzzleNumber);
  query = userId ? query.eq("user_id", userId) : query.eq("anon_id", anonId);
  const { data } = await query.maybeSingle();
  if (!data) return memory ? { guesses: memory, solved: false } : null;
  const guesses = asGuesses(data.guesses);
  return { guesses: guesses.length > 0 ? guesses : memory ?? [], solved: Boolean(data.solved) };
}

export async function savePlay(actorKey: string, play: PlayWrite): Promise<void> {
  const { writeMemoryGuesses, memoryPlayKey } = await import("@/lib/memory-plays");
  writeMemoryGuesses(memoryPlayKey(actorKey, play.sportId, play.puzzleNumber), play.guesses);
  const admin = createAdminSupabase();
  if (!admin || (!play.userId && !play.anonId)) return;

  let query = admin.from("plays").select("id").eq("sport", play.sportId).eq("puzzle_number", play.puzzleNumber);
  query = play.userId ? query.eq("user_id", play.userId) : query.eq("anon_id", play.anonId);
  const { data: existing } = await query.maybeSingle();
  const row = {
    user_id: play.userId,
    anon_id: play.userId ? null : play.anonId,
    sport: play.sportId,
    puzzle_number: play.puzzleNumber,
    guesses: play.guesses,
    solved: play.solved,
    score: play.score,
    completed_at: play.finished ? new Date().toISOString() : null,
  };
  if (existing?.id) {
    await admin.from("plays").update(row).eq("id", existing.id);
    return;
  }
  await admin.from("plays").insert(row);
}

export async function readStreak(userId: string | null, sportId: string): Promise<StreakState> {
  if (!userId) return { current: 0, best: 0, lastPlayedPuzzle: null };
  const admin = createAdminSupabase();
  if (!admin) return { current: 0, best: 0, lastPlayedPuzzle: null };
  const { data } = await admin
    .from("streaks")
    .select("current, best, last_played_puzzle")
    .eq("user_id", userId)
    .eq("sport", sportId)
    .maybeSingle();
  return {
    current: typeof data?.current === "number" ? data.current : 0,
    best: typeof data?.best === "number" ? data.best : 0,
    lastPlayedPuzzle: typeof data?.last_played_puzzle === "number" ? data.last_played_puzzle : null,
  };
}

export async function bumpStreak(
  userId: string,
  sportId: string,
  puzzleNumber: number,
  solved: boolean,
): Promise<StreakState> {
  const admin = createAdminSupabase();
  if (!admin) return nextStreak({ current: 0, best: 0, lastPlayedPuzzle: null }, puzzleNumber, solved);
  const { data } = await admin
    .from("streaks")
    .select("current, best, last_played_puzzle")
    .eq("user_id", userId)
    .eq("sport", sportId)
    .maybeSingle();
  const previous: StreakState = {
    current: typeof data?.current === "number" ? data.current : 0,
    best: typeof data?.best === "number" ? data.best : 0,
    lastPlayedPuzzle: typeof data?.last_played_puzzle === "number" ? data.last_played_puzzle : null,
  };
  const next = nextStreak(previous, puzzleNumber, solved);
  await admin.from("streaks").upsert(
    {
      user_id: userId,
      sport: sportId,
      current: next.current,
      best: next.best,
      last_played_puzzle: next.lastPlayedPuzzle,
    },
    { onConflict: "user_id,sport" },
  );
  return next;
}

export async function sweepProgress(
  userId: string,
  puzzleNumber: number,
  enabledIds: readonly string[],
): Promise<{ solved: number; total: number; streak: StreakState | null }> {
  const total = enabledIds.length;
  if (total < 2) return { solved: 0, total, streak: null };
  const admin = createAdminSupabase();
  if (!admin) return { solved: 0, total, streak: null };
  const { data } = await admin
    .from("plays")
    .select("sport, solved")
    .eq("user_id", userId)
    .eq("puzzle_number", puzzleNumber)
    .in("sport", [...enabledIds]);
  const solvedIds = new Set((data ?? []).filter((row) => row.solved).map((row) => String(row.sport)));
  const solved = enabledIds.filter((id) => solvedIds.has(id)).length;
  if (solved < total) return { solved, total, streak: null };
  const streak = await bumpStreak(userId, "sweep", puzzleNumber, true);
  return { solved, total, streak };
}

export async function distributionFor(
  sportId: string,
  puzzleNumber: number,
): Promise<{ buckets: number[]; losses: number; total: number }> {
  const buckets = [0, 0, 0, 0, 0, 0];
  const admin = createAdminSupabase();
  if (!admin) return { buckets, losses: 0, total: 0 };
  const { data } = await admin
    .from("plays")
    .select("score, solved, completed_at")
    .eq("sport", sportId)
    .eq("puzzle_number", puzzleNumber)
    .not("completed_at", "is", null);
  let losses = 0;
  for (const row of data ?? []) {
    if (!row.solved) {
      losses += 1;
      continue;
    }
    const score = typeof row.score === "number" ? row.score : 0;
    const index = 6 - score;
    const bucket = buckets[index];
    if (bucket != null) buckets[index] = bucket + 1;
  }
  const total = buckets.reduce((sum, count) => sum + count, 0) + losses;
  return { buckets, losses, total };
}

export async function migrateAnonPlays(userId: string, anonId: string, enabledIds: readonly string[]): Promise<void> {
  const admin = createAdminSupabase();
  if (!admin) return;
  const { data: anonPlays } = await admin.from("plays").select("*").eq("anon_id", anonId);
  for (const play of anonPlays ?? []) {
    const sport = String(play.sport);
    const puzzleNumber = Number(play.puzzle_number);
    const { data: existing } = await admin
      .from("plays")
      .select("id, solved")
      .eq("user_id", userId)
      .eq("sport", sport)
      .eq("puzzle_number", puzzleNumber)
      .maybeSingle();
    if (!existing) {
      await admin.from("plays").update({ user_id: userId, anon_id: null }).eq("id", play.id);
      continue;
    }
    if (!existing.solved && play.solved) {
      await admin.from("plays").delete().eq("id", existing.id);
      await admin.from("plays").update({ user_id: userId, anon_id: null }).eq("id", play.id);
      continue;
    }
    await admin.from("plays").delete().eq("id", play.id);
  }

  const { data: plays } = await admin
    .from("plays")
    .select("sport, puzzle_number, solved")
    .eq("user_id", userId)
    .order("puzzle_number", { ascending: true });
  await admin.from("streaks").delete().eq("user_id", userId);
  const grouped = new Map<string, { puzzleNumber: number; solved: boolean }[]>();
  for (const play of plays ?? []) {
    const sport = String(play.sport);
    const list = grouped.get(sport) ?? [];
    list.push({ puzzleNumber: Number(play.puzzle_number), solved: Boolean(play.solved) });
    grouped.set(sport, list);
  }
  for (const [sport, list] of grouped) {
    let state: StreakState = { current: 0, best: 0, lastPlayedPuzzle: null };
    const ordered = [...list].sort((a, b) => a.puzzleNumber - b.puzzleNumber);
    for (const play of ordered) {
      if (!play.solved && play.puzzleNumber === state.lastPlayedPuzzle) continue;
      state = nextStreak(state, play.puzzleNumber, play.solved);
    }
    await admin.from("streaks").insert({
      user_id: userId,
      sport,
      current: state.current,
      best: state.best,
      last_played_puzzle: state.lastPlayedPuzzle,
    });
  }

  const byPuzzle = new Map<number, Set<string>>();
  for (const play of plays ?? []) {
    if (!play.solved) continue;
    const puzzleNumber = Number(play.puzzle_number);
    const set = byPuzzle.get(puzzleNumber) ?? new Set<string>();
    set.add(String(play.sport));
    byPuzzle.set(puzzleNumber, set);
  }
  let sweep: StreakState = { current: 0, best: 0, lastPlayedPuzzle: null };
  const puzzleNumbers = [...byPuzzle.keys()].sort((a, b) => a - b);
  let swept = false;
  for (const puzzleNumber of puzzleNumbers) {
    const solved = byPuzzle.get(puzzleNumber);
    if (!solved || enabledIds.some((id) => !solved.has(id))) continue;
    sweep = nextStreak(sweep, puzzleNumber, true);
    swept = true;
  }
  if (swept) {
    await admin.from("streaks").insert({
      user_id: userId,
      sport: "sweep",
      current: sweep.current,
      best: sweep.best,
      last_played_puzzle: sweep.lastPlayedPuzzle,
    });
  }
}
