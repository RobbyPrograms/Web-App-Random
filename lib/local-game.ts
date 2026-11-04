import { nextStreak, type StreakState } from "@/lib/streaks";
import type { Reveal } from "@/sports/types";

const ANON_KEY = "boxed-anon-id";
const SOUND_KEY = "boxed-sound";
const STREAK_KEY = "boxed-streaks";

export interface StoredPlay {
  guesses: string[];
  results: boolean[];
  clues: { label: string; text: string }[];
  token: string | null;
  status: "playing" | "won" | "lost";
  score: number;
  reveal: Reveal | null;
}

export function playStorageKey(sportId: string, puzzleNumber: number): string {
  return `boxed-v1:${sportId}:${puzzleNumber}`;
}

export function readAnonId(): string {
  const existing = localStorage.getItem(ANON_KEY);
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) {
    return existing;
  }
  const id = crypto.randomUUID();
  localStorage.setItem(ANON_KEY, id);
  return id;
}

export function soundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) === "on";
}

export function setSoundEnabled(on: boolean): void {
  localStorage.setItem(SOUND_KEY, on ? "on" : "off");
}

export function readStoredPlay(sportId: string, puzzleNumber: number): StoredPlay | null {
  const raw = localStorage.getItem(playStorageKey(sportId, puzzleNumber));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredPlay;
    if (!parsed || !Array.isArray(parsed.guesses) || !Array.isArray(parsed.results)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredPlay(sportId: string, puzzleNumber: number, play: StoredPlay): void {
  localStorage.setItem(playStorageKey(sportId, puzzleNumber), JSON.stringify(play));
}

export function readLocalStreaks(): Record<string, StreakState> {
  const raw = localStorage.getItem(STREAK_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, StreakState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLocalStreak(sportId: string, streak: StreakState): void {
  const all = readLocalStreaks();
  all[sportId] = streak;
  localStorage.setItem(STREAK_KEY, JSON.stringify(all));
}

export function localStreak(sportId: string): StreakState {
  return readLocalStreaks()[sportId] ?? { current: 0, best: 0, lastPlayedPuzzle: null };
}

export function listLocalPlays(): { sportId: string; puzzleNumber: number; play: StoredPlay }[] {
  const found: { sportId: string; puzzleNumber: number; play: StoredPlay }[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("boxed-v1:")) continue;
    const [, sportId, puzzle] = key.split(":");
    const puzzleNumber = Number(puzzle);
    if (!sportId || !Number.isInteger(puzzleNumber)) continue;
    const play = readStoredPlay(sportId, puzzleNumber);
    if (play) found.push({ sportId, puzzleNumber, play });
  }
  return found;
}

export function commitLocalResult(
  sportId: string,
  puzzleNumber: number,
  play: StoredPlay,
  enabledIds: readonly string[],
): { streak: StreakState; sweep: StreakState | null; sweepSolved: number } {
  const previous = readStoredPlay(sportId, puzzleNumber);
  const alreadyFinished = previous?.status === "won" || previous?.status === "lost";
  writeStoredPlay(sportId, puzzleNumber, play);
  const finished = play.status === "won" || play.status === "lost";
  const streak =
    !finished || alreadyFinished
      ? localStreak(sportId)
      : nextStreak(localStreak(sportId), puzzleNumber, play.status === "won");
  if (finished && !alreadyFinished) writeLocalStreak(sportId, streak);

  const solvedSports = enabledIds.filter((id) => readStoredPlay(id, puzzleNumber)?.status === "won");
  let sweep: StreakState | null = null;
  if (enabledIds.length > 1 && solvedSports.length === enabledIds.length) {
    const prior = localStreak("sweep");
    sweep = prior.lastPlayedPuzzle === puzzleNumber ? prior : nextStreak(prior, puzzleNumber, true);
    writeLocalStreak("sweep", sweep);
  }
  return { streak, sweep, sweepSolved: solvedSports.length };
}
