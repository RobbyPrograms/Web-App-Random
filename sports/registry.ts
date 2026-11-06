import "server-only";
import type { SportConfig } from "./types";
import { epl } from "./epl/config";
import { mlb } from "./mlb/config";
import { nba } from "./nba/config";
import { nfl } from "./nfl/config";
import { nhl } from "./nhl/config";
import { wnba } from "./wnba/config";

/**
 * Every shipped sport. Adding a sport means:
 * 1. /sports/<id>/config.ts
 * 2. /data/<id>-players.json
 * 3. one entry in this array
 */
const REGISTERED: SportConfig[] = [nba, wnba, nfl, mlb, nhl, epl];

const BY_ID = new Map(REGISTERED.map((sport) => [sport.id, sport]));

export function getAllSports(): SportConfig[] {
  return [...REGISTERED];
}

export function getSportById(id: string): SportConfig | undefined {
  return BY_ID.get(id.trim().toLowerCase());
}

/**
 * Reads ENABLED_SPORTS. Unset, blank, or `all` enables every registered sport.
 * Unknown ids are ignored with a console warning. Order follows the env string.
 */
function envValue(name: string): string | undefined {
  return process.env[name];
}

export function getEnabledSports(): SportConfig[] {
  const raw = envValue("ENABLED_SPORTS");
  const value = raw == null || raw.trim() === "" || raw.trim().toLowerCase() === "all" ? "all" : raw;
  if (value === "all") return [...REGISTERED];
  const ids = value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
  const enabled: SportConfig[] = [];
  for (const id of ids) {
    const sport = BY_ID.get(id);
    if (!sport) {
      console.warn(`[boxed] Unknown sport id "${id}" ignored.`);
      continue;
    }
    if (!enabled.some((item) => item.id === sport.id)) enabled.push(sport);
  }
  return enabled;
}
