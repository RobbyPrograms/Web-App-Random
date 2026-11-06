import { describe, expect, it } from "vitest";
import { puzzleNumberFor } from "@/lib/dates";
import { buildModePuzzle, evaluateBoard, hintsFor, modeKey, orderModePool, toPublicPuzzle } from "@/lib/puzzle";
import { nextStreak } from "@/lib/streaks";
import { basketballColumns, footballColumns, baseballColumns, hockeyColumns, soccerColumns, numericCompare } from "@/sports/compare";
import { nba } from "@/sports/nba/config";
import { nfl } from "@/sports/nfl/config";
import type { Athlete, Season } from "@/sports/types";

function player(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: "id",
    sport: "nba",
    name: "Alex Example",
    aliases: [],
    verified: false,
    seasons: [{ year: "2022-23", team: "Boston Celtics", stats: { ppg: 20 } }],
    position: "PG",
    heightInches: 76,
    birthCountry: "USA",
    college: "Duke",
    draftYear: 2018,
    draftPick: 10,
    jerseyNumbers: [11],
    teamHistory: [],
    extra: {},
    ...overrides,
  };
}

const season: Season = { year: "2022-23", team: "Boston Celtics", stats: {} };

describe("column comparison", () => {
  const columns = {
    nba: basketballColumns(),
    nfl: footballColumns(),
    mlb: baseballColumns(),
    nhl: hockeyColumns(),
    epl: soccerColumns(),
  };

  it("marks exact, close, higher, and lower", () => {
    const answer = player();
    const guess = player({
      id: "g",
      position: "SG",
      heightInches: 74,
      draftYear: 2014,
      college: "North Carolina",
      jerseyNumbers: [20],
      seasons: [{ year: "2022-23", team: "Los Angeles Lakers", stats: {} }],
      teamHistory: [{ team: "Boston Celtics", years: ["2019-20"] }],
    });
    const byId = Object.fromEntries(columns.nba.map((column) => [column.id, column.compare(guess, answer, season)]));
    expect(byId.team).toEqual({ status: "close" });
    expect(byId.position).toEqual({ status: "close" });
    expect(byId.height).toEqual({ status: "close", direction: "higher" });
    expect(byId.draft).toEqual({ status: "miss", direction: "higher" });
    expect(byId.origin?.status).toBe("close");
    expect(byId.jersey).toEqual({ status: "miss", direction: "lower" });
    expect(numericCompare(11, 11, 3)).toEqual({ status: "exact" });
    expect(numericCompare(null, null, 3)).toEqual({ status: "exact" });
  });

  it("gives every sport six columns", () => {
    for (const set of Object.values(columns)) expect(set).toHaveLength(6);
    const sameTeam = player();
    expect(columns.nfl[0]?.compare(sameTeam, sameTeam, season).status).toBe("exact");
    expect(columns.mlb.find((column) => column.id === "debut")?.compare(sameTeam, sameTeam, season).status).toBe("exact");
    expect(columns.nhl.find((column) => column.id === "country")?.compare(sameTeam, player({ birthCountry: "Canada" }), season).status).toBe("miss");
    expect(columns.epl.find((column) => column.id === "birth")?.format(null)).toBe("—");
  });
});

describe("filter puzzles", () => {
  it("is deterministic and does not repeat inside one filter", () => {
    expect(modeKey(["nfl", "nba"])).toBe("nba,nfl");
    const first = buildModePuzzle([nba], 9);
    const again = buildModePuzzle([nba], 9);
    expect(again.athlete.id).toBe(first.athlete.id);
    const pool = orderModePool([nba], false);
    const seen = new Set<string>();
    for (let number = 1; number <= Math.min(pool.length, 40); number += 1) {
      const id = buildModePuzzle([nba], number).athlete.id;
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    const mixed = [1, 2, 3, 4, 5].some((number) => buildModePuzzle([nba], number).athlete.id !== buildModePuzzle([nba, nfl], number).athlete.id);
    expect(mixed).toBe(true);
  });

  it("keeps the answer out of the public payload and mid-game rows", () => {
    const puzzle = buildModePuzzle([nba], 4);
    const payload = JSON.stringify(toPublicPuzzle(puzzle, { key: "nba", label: "NBA only" }));
    expect(payload).not.toContain(puzzle.athlete.id);
    expect(payload).not.toContain(puzzle.athlete.name);
    const other = nba.players.find((item) => item.id !== puzzle.athlete.id);
    expect(other).toBeTruthy();
    const mid = evaluateBoard(puzzle, [other!.name]);
    const midJson = JSON.stringify(mid);
    expect(mid.reveal).toBeUndefined();
    expect(midJson).not.toContain(puzzle.athlete.name);
    expect(mid.rows[0]?.tiles.every((tile) => tile.display.length > 0)).toBe(true);
    expect(hintsFor(puzzle, 3)).toEqual({ team: null, letters: null });
    expect(hintsFor(puzzle, 4).team).toBe(puzzle.season.team);
    expect(hintsFor(puzzle, 5).letters).toMatch(/^[A-Z] · \d+$/);
  });
});

describe("rollover and streaks", () => {
  it("rolls the puzzle number at Eastern midnight", () => {
    expect(puzzleNumberFor("2026-01-01", new Date("2026-01-02T04:59:00Z"))).toBe(1);
    expect(puzzleNumberFor("2026-01-01", new Date("2026-01-02T05:00:00Z"))).toBe(2);
  });

  it("counts one global day once", () => {
    const after = nextStreak({ current: 3, best: 3, lastPlayedPuzzle: 10 }, 11, true);
    const replay = nextStreak(after, 11, true);
    expect(after.current).toBe(4);
    expect(replay).toEqual(after);
    expect(nextStreak(after, 12, false).current).toBe(0);
  });
});
