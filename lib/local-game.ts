import { nextStreak, type StreakState } from "@/lib/streaks";
import type { Reveal } from "@/sports/types";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

const ANON_KEY = "boxed-anon-id";
const SOUND_KEY = "boxed-sound";
const STREAK_KEY = "boxed-streaks";

export interface StoredTile {
  id: string;
  label: string;
  display: string;
  status: "exact" | "close" | "miss";
  direction?: "higher" | "lower";
}

export interface StoredRow {
  name: string;
  tiles: StoredTile[];
}

export interface StoredPlay {
  guesses: string[];
  results: boolean[];
  clues: { label: string; text: string }[];
  token: string | null;
  status: "playing" | "won" | "lost";
  score: number;
  reveal: Reveal | null;
  rows?: StoredRow[];
  hints?: { team: string | null; letters: string | null };
  puzzleSport?: string;
}

export function playStorageKey(sportId: string, puzzleNumber: number): string {
  return `boxed-v1:${sportId}:${puzzleNumber}`;
}

export function readAnonId(): string {
  const existing = storage()?.getItem(ANON_KEY);
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) {
    return existing;
  }
  const id = crypto.randomUUID();
  storage()?.setItem(ANON_KEY, id);
  return id;
}

const PREF_HAPTICS = "boxed-haptics";
const PREF_CONTRAST = "boxed-contrast";
const PREF_MOTION = "boxed-motion";
const PREF_HELP = "boxed-help-seen";
const PREF_SPORTS = "boxed-sports";

export function soundEnabled(): boolean {
  return storage()?.getItem(SOUND_KEY) === "on";
}

export function hapticsEnabled(): boolean {
  return storage()?.getItem(PREF_HAPTICS) === "on";
}

export function setHapticsEnabled(on: boolean): void {
  storage()?.setItem(PREF_HAPTICS, on ? "on" : "off");
}

export function contrastMode(): "default" | "high" {
  return storage()?.getItem(PREF_CONTRAST) === "high" ? "high" : "default";
}

export function setContrastMode(mode: "default" | "high"): void {
  storage()?.setItem(PREF_CONTRAST, mode);
}

export function motionOverride(): "system" | "reduce" {
  return storage()?.getItem(PREF_MOTION) === "reduce" ? "reduce" : "system";
}

export function setMotionOverride(mode: "system" | "reduce"): void {
  storage()?.setItem(PREF_MOTION, mode);
}

export function helpSeen(): boolean {
  return storage()?.getItem(PREF_HELP) === "1";
}

export function markHelpSeen(): void {
  storage()?.setItem(PREF_HELP, "1");
}

export function readSportFilter(): string[] {
  const raw = storage()?.getItem(PREF_SPORTS);
  if (!raw) return [];
  return raw.split(",").map((id) => id.trim().toLowerCase()).filter((id) => id.length > 0);
}

export function writeSportFilter(ids: readonly string[]): void {
  storage()?.setItem(PREF_SPORTS, ids.join(","));
  document.cookie = `boxed-sports=${encodeURIComponent(ids.join(","))}; path=/; max-age=31536000; samesite=lax`;
}

export function setSoundEnabled(on: boolean): void {
  storage()?.setItem(SOUND_KEY, on ? "on" : "off");
}

export function readStoredPlay(sportId: string, puzzleNumber: number): StoredPlay | null {
  const raw = storage()?.getItem(playStorageKey(sportId, puzzleNumber));
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
  storage()?.setItem(playStorageKey(sportId, puzzleNumber), JSON.stringify(play));
}

export function readLocalStreaks(): Record<string, StreakState> {
  const raw = storage()?.getItem(STREAK_KEY);
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
  storage()?.setItem(STREAK_KEY, JSON.stringify(all));
}

export function localStreak(sportId: string): StreakState {
  return readLocalStreaks()[sportId] ?? { current: 0, best: 0, lastPlayedPuzzle: null };
}

export function listLocalPlays(): { sportId: string; puzzleNumber: number; play: StoredPlay }[] {
  const found: { sportId: string; puzzleNumber: number; play: StoredPlay }[] = [];
  const bin = storage();
  if (!bin) return found;
  for (let index = 0; index < bin.length; index += 1) {
    const key = bin.key(index);
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
