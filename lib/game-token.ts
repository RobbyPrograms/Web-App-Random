import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const configured = process.env.GAME_SECRET;
  if (configured && configured.length >= 16) return configured;
  if (process.env.NODE_ENV === "production") {
    console.warn("[boxed] GAME_SECRET is missing. Set a long random value before launch.");
  }
  return "boxed-dev-secret-change-me";
}

export function signGuesses(sportId: string, puzzleNumber: number, guesses: readonly string[]): string {
  const payload = `${sportId}|${puzzleNumber}|${guesses.join("\n")}`;
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function tokenMatches(expected: string, provided: string | null | undefined): boolean {
  if (!provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
