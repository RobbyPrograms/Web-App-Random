import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * One-time compiler for the shipped seed.
 * Line format (pipe-separated, "-" means empty):
 * id|name|aliases|pos|ht|country|college|draftYear|draftPick|jerseys|year|team|s1|s2|s3|s4|headline|facts|origin|history
 * aliases, jerseys, facts use "/". history uses ";" and "@": Team@1990-1996
 * id is the slug without the sport prefix.
 */

const STAT_KEYS = {
  nba: ["ppg", "rpg", "apg", "fg"],
  wnba: ["ppg", "rpg", "apg", "fg"],
  "nfl:QB": ["passYds", "passTd", "interceptions", "rating"],
  "nfl:RB": ["rushYds", "rushTd", "ypc"],
  "nfl:WR": ["receptions", "recYds", "recTd"],
  "nfl:TE": ["receptions", "recYds", "recTd"],
  "mlb:SP": ["era", "wins", "strikeouts", "whip"],
  "mlb:RP": ["era", "wins", "strikeouts", "whip"],
  "nhl:G": ["wins", "gaa", "savePct", "shutouts"],
  "epl:GK": ["cleanSheets", "saves", "apps"],
};

const Hitter = ["avg", "hr", "rbi", "ops"];
const Skater = ["goals", "assists", "points", "plusMinus"];
const Outfield = ["goals", "assists", "apps"];

function keysFor(sport, position) {
  if (sport === "mlb") return position === "SP" || position === "RP" ? STAT_KEYS[`mlb:${position}`] : Hitter;
  if (sport === "nhl") return position === "G" ? STAT_KEYS["nhl:G"] : Skater;
  if (sport === "epl") return position === "GK" ? STAT_KEYS["epl:GK"] : Outfield;
  return STAT_KEYS[`${sport}:${position}`] ?? STAT_KEYS[sport];
}

function blank(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" || trimmed === "-";
}

function num(value) {
  if (blank(value)) return null;
  value = String(value).trim();
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new Error(`Bad number ${value}`);
  return parsed;
}

export function compileSport(sport, lines) {
  /** @type {Map<string, any>} */
  const byId = new Map();
  lines.forEach((line, index) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 18) {
      throw new Error(`${sport} line ${index + 1} has ${parts.length} columns`);
    }
    const [
      slug, name, aliases, position, height, country, college, draftYear, draftPick, jerseys,
      year, team, s1, s2, s3, s4, headline, facts, origin = "-", history = "-",
    ] = parts;
    const id = `${sport}-${slug}`;
    const statKeys = keysFor(sport, position);
    if (!statKeys) throw new Error(`${sport} ${position} has no stat profile on line ${index + 1}`);
    const values = [s1, s2, s3, s4].slice(0, statKeys.length).map(num);
    if (values.some((value) => value == null)) {
      throw new Error(`${sport} ${name} is missing a stat`);
    }
    const stats = Object.fromEntries(statKeys.map((key, i) => [key, values[i]]));
    const season = { year, team, stats };
    const stop = { team, years: [year] };
    const extraStops = blank(history)
      ? []
      : history.split(";").filter(Boolean).map((chunk) => {
          const [historyTeam, years] = chunk.split("@");
          return { team: historyTeam, years: (years ?? year).split("/") };
        });
    const existing = byId.get(id);
    if (existing) {
      existing.seasons.push(season);
      if (!existing.teamHistory.some((item) => item.team === team)) existing.teamHistory.push(stop);
      return;
    }
    const teamHistory = extraStops.length > 0 ? extraStops : [stop];
    if (!teamHistory.some((item) => item.team === team)) teamHistory.push(stop);
    byId.set(id, {
      id,
      sport,
      name,
      aliases: blank(aliases) ? [] : aliases.split("/").map((alias) => alias.trim()).filter(Boolean),
      verified: false,
      seasons: [season],
      position,
      heightInches: Number(height),
      birthCountry: country,
      college: blank(college) ? null : college,
      draftYear: num(draftYear),
      draftPick: num(draftPick),
      jerseyNumbers: jerseys.split("/").map((jersey) => Number(jersey)),
      teamHistory,
      extra: {
        headline,
        facts: blank(facts) ? [] : facts.split("/").map((fact) => fact.trim()).filter(Boolean),
        ...(blank(origin) ? {} : { origin }),
      },
    });
  });
  return [...byId.values()];
}

export function writeSport(sport, players) {
  const target = resolve("data", `${sport}-players.json`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(players, null, 2)}\n`);
  return players.length;
}

export function readLines(file) {
  return readFileSync(resolve(file), "utf8").split(/\r?\n/);
}
