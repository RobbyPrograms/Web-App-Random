export type ArchiveDecision = "ok" | "future";

/** Any puzzle from #1 through today is playable. Tomorrow is not. */
export function archiveAccess(puzzleNumber: number, today: number): ArchiveDecision {
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1 || puzzleNumber > today) return "future";
  return "ok";
}
