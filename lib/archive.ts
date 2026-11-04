export type ArchiveDecision = "ok" | "future" | "locked";

/** Free players can open today and the previous two days. Pro can open any past puzzle. */
export function archiveAccess(puzzleNumber: number, today: number, isPro: boolean): ArchiveDecision {
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1 || puzzleNumber > today) return "future";
  if (isPro) return "ok";
  if (today - puzzleNumber <= 2) return "ok";
  return "locked";
}
