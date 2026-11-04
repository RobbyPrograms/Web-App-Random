import type { ClueDefinition, PuzzleAthlete } from "./types";

export function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainder = inches % 12;
  return `${feet}'${remainder}"`;
}

export function initialsOf(name: string): string {
  const cleaned = name
    .replace(/\b(Jr\.?|Sr\.?|II|III|IV|V)\b/gi, "")
    .replace(/[.'’]/g, "")
    .trim();
  const letters = cleaned
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .filter((letter) => letter.length > 0)
    .map((letter) => letter.toUpperCase());
  return `${letters.join(".")}.`;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function teamClue(player: PuzzleAthlete): string {
  return player.selectedSeason.team;
}

function positionClue(player: PuzzleAthlete): string {
  return `${player.position} · ${formatHeight(player.heightInches)}`;
}

function draftClue(player: PuzzleAthlete): string {
  if (player.draftYear != null && player.draftPick != null) {
    return `${player.draftYear} · ${ordinal(player.draftPick)} overall`;
  }
  if (player.draftYear != null) {
    return `${player.draftYear} draft`;
  }
  const origin = player.extra.origin;
  if (typeof origin === "string" && origin.length > 0) return origin;
  return "Undrafted";
}

function backgroundClue(player: PuzzleAthlete): string {
  const parts = [player.college, player.birthCountry].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.join(" · ") || "Unknown background";
}

function jerseyClue(player: PuzzleAthlete): string {
  return player.jerseyNumbers.map((number) => `#${number}`).join(", ");
}

function initialsClue(player: PuzzleAthlete): string {
  return initialsOf(player.name);
}

const DEFAULTS: ClueDefinition[] = [
  { id: "team", label: "Team that season", extract: teamClue },
  { id: "body", label: "Position and height", extract: positionClue },
  { id: "draft", label: "Draft", extract: draftClue },
  { id: "background", label: "College and country", extract: backgroundClue },
  { id: "jersey", label: "Jersey number", extract: jerseyClue },
  { id: "initials", label: "Initials", extract: initialsClue },
];

/**
 * The standard six-clue ladder. Pass replacements keyed by clue id to
 * swap copy or the extractor (soccer uses a signing clue instead of a draft).
 */
export function defaultClueLadder(
  replacements: Partial<Record<ClueDefinition["id"], Partial<ClueDefinition>>> = {},
): ClueDefinition[] {
  const ladder = DEFAULTS.map((clue) => {
    const replacement = replacements[clue.id];
    if (!replacement) return clue;
    return { ...clue, ...replacement, id: clue.id };
  });
  if (ladder.length !== 6) {
    throw new Error("Clue ladder must contain exactly 6 clues");
  }
  return ladder;
}

export function nationalityClue(player: PuzzleAthlete): string {
  return player.birthCountry;
}

export function originClue(player: PuzzleAthlete): string {
  const origin = player.extra.origin;
  if (typeof origin === "string" && origin.length > 0) return origin;
  if (player.college) return player.college;
  return "Senior signing";
}
