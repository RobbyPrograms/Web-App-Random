export const MAX_GUESSES = 6;

export interface ScoredGuess {
  correct: boolean;
}

export interface ScoreResult {
  status: "playing" | "won" | "lost";
  /** Points still on the board: 6 for a first-guess win, down to 1 on the last guess, 0 on a loss. */
  score: number;
  guessesUsed: number;
  solved: boolean;
}

/**
 * Score is guesses remaining in the 6-to-0 sense: a correct first guess scores 6,
 * a correct sixth guess scores 1, and a miss scores 0.
 * The share line still shows guesses used, Wordle-style (`4/6`).
 */
export function scoreGame(guesses: readonly ScoredGuess[]): ScoreResult {
  const correctIndex = guesses.findIndex((guess) => guess.correct);
  if (correctIndex >= 0) {
    const guessesUsed = correctIndex + 1;
    return {
      status: "won",
      score: MAX_GUESSES - correctIndex,
      guessesUsed,
      solved: true,
    };
  }
  if (guesses.length >= MAX_GUESSES) {
    return { status: "lost", score: 0, guessesUsed: MAX_GUESSES, solved: false };
  }
  return {
    status: "playing",
    score: MAX_GUESSES - guesses.length,
    guessesUsed: guesses.length,
    solved: false,
  };
}
