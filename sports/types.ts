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

export type TileStatus = "exact" | "close" | "miss";
export type TileDirection = "higher" | "lower";

export interface CompareResult {
  status: TileStatus;
  /** Set on numeric columns. The arrow describes the answer, not the guess. */
  direction?: TileDirection;
}

/**
 * One comparison column on the guess board.
 * `getValue` and `format` describe the guessed athlete only.
 * `compare` may read the answer, but that result is status and direction, never the answer's value.
 */
export interface ColumnDef {
  id: string;
  label: string;
  shortLabel: string;
  type: "category" | "numeric";
  getValue: (athlete: Athlete, seasonYear: string) => string | number | null;
  compare: (guess: Athlete, answer: Athlete, answerSeason: Season) => CompareResult;
  format: (value: string | number | null) => string;
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
  /** Exactly six ordered clues. Kept for archive copy; the board uses `columns`. */
  clueLadder: ClueDefinition[];
  /** At most six comparison columns. Order is the tile order. */
  columns: ColumnDef[];
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
  modeKey: string;
  modeLabel: string;
  columns: PublicColumn[];
}

export interface RosterEntry {
  name: string;
  aliases: string[];
  team: string;
  position: string;
}

export interface PublicColumn {
  id: string;
  label: string;
  shortLabel: string;
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
