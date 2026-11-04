export interface ShareInput {
  puzzleNumber: number;
  emoji: string;
  /** true = correct guess. The array is only the guesses that were used. */
  results: readonly boolean[];
  solved: boolean;
  streak: number;
  host?: string;
  maxGuesses?: number;
}

function squaresFor(results: readonly boolean[], solved: boolean, maxGuesses: number): string {
  const cells: string[] = [];
  const used = solved ? results.length : maxGuesses;
  for (let i = 0; i < maxGuesses; i += 1) {
    if (i < used) {
      cells.push(results[i] ? "🟩" : "🟥");
    } else {
      cells.push("⬜");
    }
  }
  return cells.join("");
}

/**
 * Spoiler-free result line.
 * `BOXED #42 🏀 4/6 🟥🟥🟥🟩⬜⬜  🔥 12-day streak  boxed.app`
 */
export function buildShareText(input: ShareInput): string {
  const maxGuesses = input.maxGuesses ?? 6;
  const used = input.solved ? input.results.length : maxGuesses;
  const squares = squaresFor(input.results, input.solved, maxGuesses);
  const host = (input.host ?? "boxed.app").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const streak = `🔥 ${input.streak}-day streak`;
  return `BOXED #${input.puzzleNumber} ${input.emoji} ${used}/${maxGuesses} ${squares}  ${streak}  ${host}`;
}

/** `BOXED Sweep 🏀🏈⚾ 3/3 today` */
export function buildSweepLine(emojis: readonly string[], solved: number, total: number): string {
  return `BOXED Sweep ${emojis.join("")} ${solved}/${total} today`;
}

/** R = wrong, G = right, W = unused. Always 6 characters for a finished game. */
export function resultPattern(results: readonly boolean[], solved: boolean, maxGuesses = 6): string {
  const squares = squaresFor(results, solved, maxGuesses);
  return squares.replaceAll("🟥", "R").replaceAll("🟩", "G").replaceAll("⬜", "W");
}

export function isLegalPattern(pattern: string, maxGuesses = 6): boolean {
  if (!new RegExp(`^[RGW]{${maxGuesses}}$`).test(pattern)) return false;
  const green = pattern.indexOf("G");
  if (green === -1) return !pattern.includes("W") && !pattern.includes("G");
  if (pattern.indexOf("G", green + 1) !== -1) return false;
  const before = pattern.slice(0, green);
  const after = pattern.slice(green + 1);
  return !before.includes("W") && !before.includes("G") && !after.includes("R") && !after.includes("G");
}
