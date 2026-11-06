import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnabledSports } from "@/sports/registry";

const ORIGINAL = process.env.ENABLED_SPORTS;

afterEach(() => {
  if (ORIGINAL == null) delete process.env.ENABLED_SPORTS;
  else process.env.ENABLED_SPORTS = ORIGINAL;
});

describe("getEnabledSports", () => {
  it("defaults to every registered sport", () => {
    delete process.env.ENABLED_SPORTS;
    expect(getEnabledSports().map((sport) => sport.id)).toEqual(["nba", "wnba", "nfl", "mlb", "nhl", "epl"]);
  });

  it("treats all as every sport and nba as a single-sport deploy", () => {
    process.env.ENABLED_SPORTS = "all";
    expect(getEnabledSports()).toHaveLength(6);
    process.env.ENABLED_SPORTS = "nba";
    expect(getEnabledSports().map((sport) => sport.id)).toEqual(["nba"]);
  });

  it("ignores unknown ids and keeps the requested order", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env.ENABLED_SPORTS = "nfl, quidditch, nba, nfl";
    expect(getEnabledSports().map((sport) => sport.id)).toEqual(["nfl", "nba"]);
    expect(warn).toHaveBeenCalled();
  });
});
