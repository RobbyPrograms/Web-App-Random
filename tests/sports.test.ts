import { describe, expect, it } from "vitest";
import { alphabeticalRoster, buildPuzzle, evaluateRound, toPublicPuzzle } from "@/lib/puzzle";
import { nba } from "@/sports/nba/config";
import { getAllSports } from "@/sports/registry";

const minimums: Record<string, number> = {
  nba: 150,
  wnba: 120,
  nfl: 120,
  mlb: 120,
  nhl: 120,
  epl: 120,
};

const sports = getAllSports().map((config) => ({
  config,
  minimum: minimums[config.id] ?? 1,
}));

describe("sport configs and seed data", () => {
  it.each(sports)("$config.id validates every athlete and clears the minimum roster", ({ config, minimum }) => {
    expect(config.clueLadder).toHaveLength(6);
    expect(config.players.length).toBeGreaterThanOrEqual(minimum);
    for (const player of config.players) {
      expect(() => config.validate(player)).not.toThrow();
    }
  });

  it("returns the same athlete for the same sport and puzzle number", () => {
    for (const { config } of sports) {
      const first = buildPuzzle(config, 42);
      const second = buildPuzzle(config, 42);
      expect(second.athlete.id).toBe(first.athlete.id);
      expect(second.season.year).toBe(first.season.year);
    }
  });

  it("does not repeat a sport's pool until it wraps", () => {
    const config = nba;
    const seen = new Set<string>();
    for (let puzzle = 1; puzzle <= config.players.length; puzzle += 1) {
      seen.add(buildPuzzle(config, puzzle).athlete.id);
    }
    expect(seen.size).toBe(config.players.length);
    expect(buildPuzzle(config, config.players.length + 1).athlete.id).toBe(buildPuzzle(config, 1).athlete.id);
  });

  it("keeps the answer out of the public puzzle and a mid-game round", () => {
    const puzzle = buildPuzzle(nba, 7);
    const payload = JSON.stringify(toPublicPuzzle(puzzle));
    expect(payload.includes(puzzle.athlete.name)).toBe(false);
    expect(payload.includes(puzzle.athlete.id)).toBe(false);
    const mid = evaluateRound(puzzle, ["Not A Real Player"]);
    expect(mid.reveal).toBeUndefined();
    expect(JSON.stringify(mid).includes(puzzle.athlete.name)).toBe(false);
    const solved = evaluateRound(puzzle, [puzzle.athlete.name]);
    expect(solved.reveal?.name).toBe(puzzle.athlete.name);
    const roster = alphabeticalRoster(nba).map((entry) => entry.name);
    const sorted = [...roster].sort((a, b) => a.localeCompare(b));
    expect(roster).toEqual(sorted);
  });
});
