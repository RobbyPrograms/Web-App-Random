import "server-only";
import { archiveAccess } from "@/lib/archive";
import { puzzleNumberFor } from "@/lib/dates";
import { alphabeticalRoster, buildPuzzle, toPublicPuzzle } from "@/lib/puzzle";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { pickSponsor, type PublicSponsor, type SponsorRecord } from "@/lib/sponsors";
import { defaultSportId, launchDate, requireVerified } from "@/lib/site";
import { nextEnabledSport } from "@/lib/sport-path";
import { getEnabledSports, getSportById } from "@/sports/registry";
import { toPublicSport, type PublicPuzzle, type PublicSport, type RosterEntry } from "@/sports/types";

export type PlayLoad =
  | { kind: "unknown" }
  | { kind: "disabled" }
  | { kind: "empty"; sport: PublicSport; message: string }
  | { kind: "future"; sport: PublicSport; puzzleNumber: number }
  | { kind: "locked"; sport: PublicSport; puzzleNumber: number }
  | {
      kind: "ready";
      sport: PublicSport;
      sports: PublicSport[];
      puzzle: PublicPuzzle;
      roster: RosterEntry[];
      clueLabels: string[];
      sponsor: PublicSponsor | null;
      nextSport: PublicSport | null;
      defaultSportId: string;
      launchDate: string;
    };

async function sponsorFor(sportId: string, puzzleNumber: number, isPro: boolean): Promise<PublicSponsor | null> {
  if (isPro) return null;
  const admin = createAdminSupabase();
  if (!admin) return null;
  const { data, error } = await admin
    .from("sponsors")
    .select("id, name, logo_url, tagline, url, sport, puzzle_number, active")
    .eq("active", true);
  if (error || !data) return null;
  const records: SponsorRecord[] = data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    tagline: row.tagline ? String(row.tagline) : null,
    url: row.url ? String(row.url) : null,
    sport: row.sport ? String(row.sport) : null,
    puzzleNumber: typeof row.puzzle_number === "number" ? row.puzzle_number : null,
    active: Boolean(row.active),
  }));
  return pickSponsor(records, sportId, puzzleNumber);
}

export async function loadPlay(options: {
  sportId?: string | null;
  puzzleNumber?: number | null;
  isPro: boolean;
}): Promise<PlayLoad> {
  const enabled = getEnabledSports();
  const sports = enabled.map(toPublicSport);
  const fallback = defaultSportId(enabled.map((sport) => sport.id));
  const requested = options.sportId?.trim().toLowerCase() || fallback;
  const known = getSportById(requested);
  if (!known) return { kind: "unknown" };
  if (!enabled.some((sport) => sport.id === known.id)) return { kind: "disabled" };

  const today = puzzleNumberFor(launchDate());
  const puzzleNumber = options.puzzleNumber ?? today;
  const access = archiveAccess(puzzleNumber, today, options.isPro);
  const sport = toPublicSport(known);
  if (access === "future") return { kind: "future", sport, puzzleNumber };
  if (access === "locked") return { kind: "locked", sport, puzzleNumber };

  try {
    const built = buildPuzzle(known, puzzleNumber, requireVerified());
    const puzzle = toPublicPuzzle(built);
    return {
      kind: "ready",
      sport,
      sports,
      puzzle,
      roster: alphabeticalRoster(known),
      clueLabels: known.clueLadder.map((clue) => clue.label),
      sponsor: await sponsorFor(known.id, puzzleNumber, options.isPro),
      nextSport: nextEnabledSport(known.id, sports),
      defaultSportId: fallback,
      launchDate: launchDate(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "This puzzle is unavailable.";
    return { kind: "empty", sport, message };
  }
}
