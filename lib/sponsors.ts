export interface SponsorRecord {
  id: string;
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  url: string | null;
  sport: string | null;
  puzzleNumber: number | null;
  active: boolean;
}

export interface PublicSponsor {
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  url: string | null;
}

/**
 * Prefer a sponsor pinned to this sport and puzzle, then sport-wide,
 * then a global sponsor, then a puzzle-number sponsor across sports.
 */
export function pickSponsor(
  sponsors: readonly SponsorRecord[],
  sportId: string,
  puzzleNumber: number,
): PublicSponsor | null {
  const active = sponsors.filter((sponsor) => sponsor.active);
  const ranked = [...active].sort((a, b) => specificity(b, sportId, puzzleNumber) - specificity(a, sportId, puzzleNumber));
  const winner = ranked.find((sponsor) => specificity(sponsor, sportId, puzzleNumber) > 0);
  if (!winner) return null;
  return {
    name: winner.name,
    logoUrl: winner.logoUrl,
    tagline: winner.tagline,
    url: winner.url,
  };
}

function specificity(sponsor: SponsorRecord, sportId: string, puzzleNumber: number): number {
  const sportOk = sponsor.sport == null || sponsor.sport === sportId;
  const puzzleOk = sponsor.puzzleNumber == null || sponsor.puzzleNumber === puzzleNumber;
  if (!sportOk || !puzzleOk) return 0;
  let score = 1;
  if (sponsor.sport === sportId) score += 2;
  if (sponsor.puzzleNumber === puzzleNumber) score += 4;
  return score;
}
