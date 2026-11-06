import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveAccess } from "@/lib/archive";
import { fuzzySearch, namesMatch } from "@/lib/fuzzy";
import { assessGuessList } from "@/lib/guess-policy";
import { orderPool, poolVersion } from "@/lib/puzzle";
import { buildShareText, buildSweepLine, isLegalPattern } from "@/lib/share";
import { scoreGame } from "@/lib/scoring";
import { pickSponsor, type SponsorRecord } from "@/lib/sponsors";
import { nextStreak } from "@/lib/streaks";
import type { Athlete } from "@/sports/types";

const ORIGINAL = process.env.ENABLED_SPORTS;

afterEach(() => {
  if (ORIGINAL == null) delete process.env.ENABLED_SPORTS;
  else process.env.ENABLED_SPORTS = ORIGINAL;
  vi.restoreAllMocks();
});

function athlete(id: string, verified = false): Athlete {
  return {
    id,
    sport: "nba",
    name: id,
    aliases: [],
    verified,
    seasons: [{ year: "2016-17", team: "Test", stats: { ppg: 10, rpg: 5, apg: 4, fg: 45 } }],
    position: "G",
    heightInches: 75,
    birthCountry: "USA",
    college: null,
    draftYear: 2010,
    draftPick: 1,
    jerseyNumbers: [0],
    teamHistory: [{ team: "Test", years: ["2016-17"] }],
    extra: {},
  };
}

describe("scoring", () => {
  it("scores a correct guess from 6 down to 1 and a miss as 0", () => {
    expect(scoreGame([{ correct: true }]).score).toBe(6);
    expect(scoreGame([false, false, false, true].map((correct) => ({ correct }))).score).toBe(3);
    expect(scoreGame([false, false, false, false, false, true].map((correct) => ({ correct }))).score).toBe(1);
    expect(scoreGame([false, false, false, false, false, false].map((correct) => ({ correct }))).score).toBe(0);
  });
});

describe("share text", () => {
  it("builds the single-sport line", () => {
    const text = buildShareText({
      puzzleNumber: 42,
      emoji: "🏀",
      results: [false, false, false, true],
      solved: true,
      streak: 12,
      host: "boxed.app",
    });
    expect(text).toBe("BOXED #42 🏀 4/6 🟥🟥🟥🟩⬜⬜  🔥 12-day streak  boxed.app");
  });

  it("builds the daily sweep line", () => {
    expect(buildSweepLine(["🏀", "🏈", "⚾"], 3, 3)).toBe("BOXED Sweep 🏀🏈⚾ 3/3 today");
  });

  it("accepts a legal result pattern", () => {
    expect(isLegalPattern("RRRGWW")).toBe(true);
    expect(isLegalPattern("RRRRRR")).toBe(true);
    expect(isLegalPattern("GWWWWW")).toBe(true);
    expect(isLegalPattern("WRRRRR")).toBe(false);
    expect(isLegalPattern("RRGGRR")).toBe(false);
  });
});

describe("fuzzy matching", () => {
  const roster = [{ name: "LeBron James", aliases: ["King James"] }, { name: "José Alvarado", aliases: [] }];

  it("matches accents, aliases, and a one-letter typo", () => {
    expect(namesMatch("jose alvarado", "José Alvarado")).toBe(true);
    expect(fuzzySearch("lebron", roster)[0]?.name).toBe("LeBron James");
    expect(fuzzySearch("king james", roster)[0]?.name).toBe("LeBron James");
    expect(fuzzySearch("lebran", roster).some((hit) => hit.name === "LeBron James")).toBe(true);
  });
});

describe("puzzle pool", () => {
  it("is deterministic and does not repeat until the pool is exhausted", () => {
    const players = ["a", "b", "c", "d", "e"].map((id, index) => athlete(id, index < 2));
    const first = orderPool(players, "nba").map((player) => player.id);
    const second = orderPool(players, "nba").map((player) => player.id);
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(players.length);
    expect(first.slice(0, 2).every((id) => id === "a" || id === "b")).toBe(true);
    expect(poolVersion(players)).toBe(poolVersion([...players].reverse()));
  });
});

describe("streaks, archive, and sponsors", () => {
  it("extends a streak only across consecutive puzzles", () => {
    const won = nextStreak({ current: 2, best: 4, lastPlayedPuzzle: 9 }, 10, true);
    expect(won.current).toBe(3);
    const gap = nextStreak(won, 12, true);
    expect(gap.current).toBe(1);
    const loss = nextStreak(gap, 13, false);
    expect(loss.current).toBe(0);
    expect(nextStreak(loss, 13, true)).toEqual(loss);
  });

  it("opens every past puzzle and keeps the future closed", () => {
    expect(archiveAccess(10, 10)).toBe("ok");
    expect(archiveAccess(1, 10)).toBe("ok");
    expect(archiveAccess(11, 10)).toBe("future");
    expect(archiveAccess(0, 10)).toBe("future");
  });

  it("picks the most specific active sponsor", () => {
    const sponsors: SponsorRecord[] = [
      { id: "1", name: "Global", logoUrl: null, tagline: null, url: null, sport: null, puzzleNumber: null, active: true },
      { id: "2", name: "Sport", logoUrl: null, tagline: null, url: null, sport: "nba", puzzleNumber: null, active: true },
      { id: "3", name: "Night", logoUrl: null, tagline: "Late", url: null, sport: "nba", puzzleNumber: 4, active: true },
    ];
    expect(pickSponsor(sponsors, "nba", 4)?.name).toBe("Night");
    expect(pickSponsor(sponsors, "nfl", 4)?.name).toBe("Global");
  });

  it("rejects a guess list that skips ahead", () => {
    const decision = assessGuessList({
      stored: ["A"],
      incoming: ["B"],
      token: null,
      sportId: "nba",
      puzzleNumber: 1,
    });
    expect(decision.ok).toBe(false);
  });
});
