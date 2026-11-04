import type { ZodType } from "zod";

/** A single number on the public stat line, e.g. PPG or ERA. */
export interface StatField {
  key: string;
  label: string;
  format: (value: number) => string;
}

/**
 * A distinct player type inside one sport (QB vs RB, hitter vs pitcher).
 * `matches` is the selector: the puzzle uses the first matching profile,
 * and breaks ties deterministically from the puzzle seed.
 */
export interface StatProfile {
  id: string;
  label: string;
  statFields: StatField[];
  matches: (player: Athlete) => boolean;
}

export interface Season {
  year: string;
  team: string;
  stats: Record<string, number>;
}

export interface TeamStop {
  team: string;
  years: string[];
}

/**
 * Generic athlete. Sport-specific numbers live on `seasons[].stats`
 * (keys defined by that sport's stat fields) and in `extra`.
 */
export interface Athlete {
  id: string;
  sport: string;
  name: string;
  aliases: string[];
  verified: boolean;
  seasons: Season[];
  position: string;
  heightInches: number;
  birthCountry: string;
  college: string | null;
  draftYear: number | null;
  draftPick: number | null;
  jerseyNumbers: number[];
  teamHistory: TeamStop[];
  extra: Record<string, unknown>;
}

/** Runtime view passed to clue extractors. Not stored in seed JSON. */
export interface PuzzleAthlete extends Athlete {
  selectedSeason: Season;
}

export interface ClueDefinition {
  id: string;
  label: string;
  extract: (player: PuzzleAthlete) => string;
}

export interface HeightRange {
  min: number;
  max: number;
}

/**
 * Everything the app knows about a sport. Adding a sport means a config
 * that satisfies this interface, a data file, and a registry entry.
 */
export interface SportConfig {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  accentColor: string;
  /** Default stat line when the sport has a single player shape. */
  statFields: StatField[];
  /**
   * Distinct stat lines. Empty when every athlete shares `statFields`.
   * Each profile supplies its own fields and a `matches` selector.
   */
  statProfiles: StatProfile[];
  /** Exactly six ordered clues. */
  clueLadder: ClueDefinition[];
  /** Inclusive plausible height range, in inches. */
  heightRange: HeightRange;
  /** Stat keys that are allowed to be negative (for example plus-minus). */
  signedStatKeys: string[];
  /** Zod schema for this sport's player shape. */
  schema: ZodType<Athlete>;
  /** Parse and return a player, or throw a ZodError. */
  validate: (player: unknown) => Athlete;
  /** Players shipped with this sport. Loaded here so the registry is the only other touch point. */
  players: Athlete[];
}

/** Serializable sport fields safe to send to the browser. No players, no clue functions. */
export interface PublicSport {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  accentColor: string;
}

export interface PublicStatChip {
  label: string;
  value: number;
  display: string;
}

/** The stat line the client is allowed to see before the game ends. */
export interface PublicPuzzle {
  sportId: string;
  puzzleNumber: number;
  seasonYear: string;
  statLine: string;
  chips: PublicStatChip[];
  maxGuesses: number;
}

export interface RosterEntry {
  name: string;
  aliases: string[];
}

export interface Reveal {
  name: string;
  headline: string;
  facts: string[];
  position: string;
  sportName: string;
}

export function toPublicSport(sport: SportConfig): PublicSport {
  return {
    id: sport.id,
    name: sport.name,
    shortName: sport.shortName,
    emoji: sport.emoji,
    accentColor: sport.accentColor,
  };
}
