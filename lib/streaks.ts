export interface StreakState {
  current: number;
  best: number;
  lastPlayedPuzzle: number | null;
}

export function emptyStreak(): StreakState {
  return { current: 0, best: 0, lastPlayedPuzzle: null };
}

/**
 * A win extends the streak when the previous puzzle was the one before this,
 * or when this puzzle was already recorded (replay does not double-count).
 * A loss resets the current streak to 0.
 */
export function nextStreak(previous: StreakState, puzzleNumber: number, solved: boolean): StreakState {
  if (previous.lastPlayedPuzzle === puzzleNumber) {
    return previous;
  }
  if (!solved) {
    return { current: 0, best: previous.best, lastPlayedPuzzle: puzzleNumber };
  }
  const continues = previous.lastPlayedPuzzle === puzzleNumber - 1;
  const current = continues ? previous.current + 1 : 1;
  return {
    current,
    best: Math.max(previous.best, current),
    lastPlayedPuzzle: puzzleNumber,
  };
}
