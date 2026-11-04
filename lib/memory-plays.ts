const plays = new Map<string, string[]>();

export function memoryPlayKey(actor: string, sportId: string, puzzleNumber: number): string {
  return `${actor}|${sportId}|${puzzleNumber}`;
}

export function readMemoryGuesses(key: string): string[] | null {
  const value = plays.get(key);
  return value ? [...value] : null;
}

export function writeMemoryGuesses(key: string, guesses: readonly string[]): void {
  plays.set(key, [...guesses]);
}

export function resetMemoryPlays(): void {
  plays.clear();
}
