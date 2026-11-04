import { tokenMatches, signGuesses } from "./game-token";

export interface GuessPolicyInput {
  stored: readonly string[] | null;
  incoming: readonly string[];
  token: string | null;
  sportId: string;
  puzzleNumber: number;
  maxGuesses?: number;
}

export type GuessPolicy =
  | { ok: true; replay: boolean }
  | { ok: false; status: number; error: string };

export function assessGuessList(input: GuessPolicyInput): GuessPolicy {
  const maxGuesses = input.maxGuesses ?? 6;
  if (input.incoming.length === 0) {
    return { ok: false, status: 400, error: "Enter a guess." };
  }
  if (input.incoming.length > maxGuesses) {
    return { ok: false, status: 400, error: "That puzzle is already over." };
  }
  const normalized = input.incoming.map((guess) => guess.trim());
  if (normalized.some((guess) => guess.length < 2 || guess.length > 80)) {
    return { ok: false, status: 400, error: "Guesses need to be a player's name." };
  }
  const seen = new Set<string>();
  for (const guess of normalized) {
    const key = guess.toLowerCase();
    if (seen.has(key)) {
      return { ok: false, status: 400, error: "You already tried that name." };
    }
    seen.add(key);
  }

  const stored = input.stored ? [...input.stored] : null;
  if (stored && stored.length > 0) {
    const sameLength = stored.length === normalized.length && stored.every((guess, index) => guess === normalized[index]);
    if (sameLength) return { ok: true, replay: true };
    const extendsByOne =
      normalized.length === stored.length + 1 && stored.every((guess, index) => guess === normalized[index]);
    if (extendsByOne) return { ok: true, replay: false };
    return { ok: false, status: 409, error: "Guesses have to follow the ones already played." };
  }

  const fullToken = signGuesses(input.sportId, input.puzzleNumber, normalized);
  if (tokenMatches(fullToken, input.token)) return { ok: true, replay: true };
  if (normalized.length === 1) return { ok: true, replay: false };
  const prefixToken = signGuesses(input.sportId, input.puzzleNumber, normalized.slice(0, -1));
  if (tokenMatches(prefixToken, input.token)) return { ok: true, replay: false };
  return { ok: false, status: 409, error: "Start that puzzle again from your first guess." };
}
