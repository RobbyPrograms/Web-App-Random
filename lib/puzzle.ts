import "server-only";
import type { SportConfig } from "@/sports/types";
import type { Athlete, PublicColumn, PublicPuzzle, PuzzleAthlete, Reveal, Season, StatProfile, TileStatus } from "@/sports/types";
import { hashString, seededShuffle } from "./hash";
import { namesMatch } from "./fuzzy";
import { scoreGame, type ScoreResult } from "./scoring";

export interface BuiltPuzzle {
  sport: SportConfig;
  puzzleNumber: number;
  athlete: Athlete;
  season: Season;
  profile: StatProfile | null;
  poolVersion: string;
}

export function poolVersion(players: readonly { id: string }[]): string {
  const joined = players
    .map((player) => player.id)
    .slice()
    .sort()
    .join("|");
  return hashString(joined).toString(36);
}

/** Verified athletes are shuffled first so they are preferred, then everyone else. No repeats until the pool wraps. */
export function orderPool(players: readonly Athlete[], sportId: string): Athlete[] {
  const version = poolVersion(players);
  const verified = seededShuffle(
    players.filter((player) => player.verified),
    `${sportId}:${version}:verified`,
  );
  const rest = seededShuffle(
    players.filter((player) => !player.verified),
    `${sportId}:${version}:rest`,
  );
  return [...verified, ...rest];
}

export function athleteAt(pool: readonly Athlete[], puzzleNumber: number): Athlete {
  if (pool.length === 0) {
    throw new Error("Puzzle pool is empty");
  }
  const index = (puzzleNumber - 1) % pool.length;
  const athlete = pool[index];
  if (!athlete) throw new Error("Puzzle index missing");
  return athlete;
}

export function selectSeason(athlete: Athlete, seed: string): Season {
  const season = athlete.seasons[hashString(`${seed}:${athlete.id}:season`) % athlete.seasons.length];
  if (!season) throw new Error(`No season for ${athlete.id}`);
  return season;
}

export function selectProfile(sport: SportConfig, athlete: Athlete, seed: string): StatProfile | null {
  const matches = sport.statProfiles.filter((profile) => profile.matches(athlete));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0] ?? null;
  const index = hashString(`${seed}:${athlete.id}:profile`) % matches.length;
  return matches[index] ?? null;
}

export function activePool(sport: SportConfig, requireVerified: boolean): Athlete[] {
  const source = requireVerified ? sport.players.filter((player) => player.verified) : sport.players;
  return orderPool(source, sport.id);
}

export function buildPuzzle(sport: SportConfig, puzzleNumber: number, requireVerified = false): BuiltPuzzle {
  const pool = activePool(sport, requireVerified);
  if (pool.length === 0) {
    throw new Error(
      requireVerified
        ? `No verified ${sport.name} athletes. Import checked data or turn REQUIRE_VERIFIED off.`
        : `No ${sport.name} athletes in the pool.`,
    );
  }
  const version = poolVersion(pool);
  const seed = `${sport.id}:${version}`;
  const athlete = athleteAt(pool, puzzleNumber);
  return {
    sport,
    puzzleNumber,
    athlete,
    season: selectSeason(athlete, seed),
    profile: selectProfile(sport, athlete, seed),
    poolVersion: version,
  };
}

export function renderPuzzle(puzzle: BuiltPuzzle): { statLine: string; chips: PublicPuzzle["chips"] } {
  const fields = puzzle.profile?.statFields ?? puzzle.sport.statFields;
  const chips = fields.map((field) => {
    const value = puzzle.season.stats[field.key] ?? 0;
    return { label: field.label, value, display: field.format(value) };
  });
  const statLine = `${puzzle.season.year} · ${chips.map((chip) => `${chip.display} ${chip.label}`).join(" · ")}`;
  return { statLine, chips };
}

export function toPublicPuzzle(puzzle: BuiltPuzzle, mode?: { key: string; label: string }): PublicPuzzle {
  const rendered = renderPuzzle(puzzle);
  return {
    sportId: puzzle.sport.id,
    puzzleNumber: puzzle.puzzleNumber,
    seasonYear: puzzle.season.year,
    statLine: rendered.statLine,
    chips: rendered.chips,
    maxGuesses: 6,
    modeKey: mode?.key ?? puzzle.sport.id,
    modeLabel: mode?.label ?? puzzle.sport.shortName,
    columns: publicColumns(puzzle.sport),
  };
}

export function clueStrings(puzzle: BuiltPuzzle, count: number): string[] {
  const view: PuzzleAthlete = { ...puzzle.athlete, selectedSeason: puzzle.season };
  return puzzle.sport.clueLadder.slice(0, count).map((clue) => clue.extract(view));
}

export function isCorrectGuess(athlete: Athlete, guess: string): boolean {
  return [athlete.name, ...athlete.aliases].some((label) => namesMatch(guess, label));
}

export interface RoundResult extends ScoreResult {
  results: { guess: string; correct: boolean }[];
  clues: string[];
  reveal?: Reveal;
}

export function buildReveal(athlete: Athlete, sportName: string): Reveal {
  const rawFacts = athlete.extra.facts;
  const facts = Array.isArray(rawFacts)
    ? rawFacts.filter((fact): fact is string => typeof fact === "string" && fact.length > 0).slice(0, 4)
    : [];
  const headline =
    typeof athlete.extra.headline === "string" && athlete.extra.headline.length > 0
      ? athlete.extra.headline
      : `${athlete.position} from ${athlete.birthCountry}`;
  return {
    name: athlete.name,
    headline,
    facts,
    position: athlete.position,
    sportName,
  };
}

/** Judge a guess list. The reveal is attached only after a win or a loss. */
export function evaluateRound(puzzle: BuiltPuzzle, guesses: readonly string[]): RoundResult {
  const results: { guess: string; correct: boolean }[] = [];
  for (const guess of guesses) {
    const correct = isCorrectGuess(puzzle.athlete, guess);
    results.push({ guess, correct });
    if (correct || results.length >= 6) break;
  }
  const scored = scoreGame(results);
  const wrongCount = results.filter((result) => !result.correct).length;
  const round: RoundResult = {
    ...scored,
    results,
    clues: clueStrings(puzzle, wrongCount),
  };
  if (scored.status === "playing") return round;
  return { ...round, reveal: buildReveal(puzzle.athlete, puzzle.sport.name) };
}

export function alphabeticalRoster(sport: SportConfig): { name: string; aliases: string[]; team: string; position: string }[] {
  return sport.players
    .map((player) => ({
      name: player.name,
      aliases: [...player.aliases],
      team: player.seasons.at(-1)?.team ?? "",
      position: player.position,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function modeKey(sportIds: readonly string[]): string {
  return [...sportIds]
    .map((id) => id.trim().toLowerCase())
    .filter((id) => id.length > 0)
    .sort()
    .join(",");
}

export function orderModePool(sports: readonly SportConfig[], requireVerified: boolean): { sport: SportConfig; athlete: Athlete }[] {
  const entries: { sport: SportConfig; athlete: Athlete }[] = [];
  for (const sport of sports) {
    for (const athlete of activePool(sport, requireVerified)) entries.push({ sport, athlete });
  }
  const version = poolVersion(entries.map((entry) => ({ id: entry.athlete.id })));
  return seededShuffle(entries, `${modeKey(sports.map((sport) => sport.id))}:${version}`);
}

/** Same filter and puzzle number always resolve to the same athlete. The pool walks without repeats until it wraps. */
export function buildModePuzzle(sports: readonly SportConfig[], puzzleNumber: number, requireVerified = false): BuiltPuzzle {
  const pool = orderModePool(sports, requireVerified);
  if (pool.length === 0) {
    throw new Error("Puzzle pool is empty");
  }
  const pick = pool[(puzzleNumber - 1) % pool.length];
  if (!pick) throw new Error("Puzzle index missing");
  const version = poolVersion(pool.map((entry) => ({ id: entry.athlete.id })));
  const seed = `${modeKey(sports.map((sport) => sport.id))}:${version}`;
  return {
    sport: pick.sport,
    puzzleNumber,
    athlete: pick.athlete,
    season: selectSeason(pick.athlete, seed),
    profile: selectProfile(pick.sport, pick.athlete, seed),
    poolVersion: version,
  };
}

export function findByName(sport: SportConfig, guess: string): Athlete | undefined {
  return sport.players.find((player) => [player.name, ...player.aliases].some((label) => namesMatch(guess, label)));
}

export interface PublicTile {
  id: string;
  label: string;
  display: string;
  status: TileStatus;
  direction?: "higher" | "lower";
}

export interface GuessRow {
  name: string;
  correct: boolean;
  tiles: PublicTile[];
}

export function compareGuess(puzzle: BuiltPuzzle, player: Athlete): GuessRow {
  const tiles = puzzle.sport.columns.map((column) => {
    const value = column.getValue(player, puzzle.season.year);
    const result = column.compare(player, puzzle.athlete, puzzle.season);
    return {
      id: column.id,
      label: column.label,
      display: column.format(value),
      status: result.status,
      ...(result.direction ? { direction: result.direction } : {}),
    };
  });
  return { name: player.name, correct: player.id === puzzle.athlete.id, tiles };
}

export function lastNameHint(name: string): string {
  const cleaned = name.replace(/\b(Jr\.?|Sr\.?|II|III|IV|V)\b/gi, "").trim();
  const parts = cleaned.split(/\s+/).filter((part) => part.length > 0);
  const first = parts[0] ?? "";
  const last = parts.at(-1) ?? "";
  return `${first.slice(0, 1).toUpperCase()} · ${last.length}`;
}

export function hintsFor(puzzle: BuiltPuzzle, guessCount: number): { team: string | null; letters: string | null } {
  return {
    team: guessCount >= 4 ? puzzle.season.team : null,
    letters: guessCount >= 5 ? lastNameHint(puzzle.athlete.name) : null,
  };
}

export function publicColumns(sport: SportConfig): PublicColumn[] {
  return sport.columns.map((column) => ({ id: column.id, label: column.label, shortLabel: column.shortLabel }));
}

export function evaluateBoard(puzzle: BuiltPuzzle, guesses: readonly string[]): { rows: GuessRow[]; unknown: string | null } & RoundResult {
  const rows: GuessRow[] = [];
  for (const guess of guesses) {
    const player = findByName(puzzle.sport, guess);
    if (!player) return { rows, unknown: guess, results: [], clues: [], status: "playing", score: 6, guessesUsed: 0, solved: false };
    rows.push(compareGuess(puzzle, player));
    if (player.id === puzzle.athlete.id || rows.length >= 6) break;
  }
  const scored = scoreGame(rows.map((row) => ({ correct: row.correct })));
  const round: RoundResult = { ...scored, results: rows.map((row) => ({ guess: row.name, correct: row.correct })), clues: [] };
  if (scored.status === "playing") return { ...round, rows, unknown: null };
  return { ...round, rows, unknown: null, reveal: buildReveal(puzzle.athlete, puzzle.sport.name) };
}
