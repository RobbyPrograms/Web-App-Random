import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Convert a public stats CSV into a sport JSON file.
 * Usage:
 *   npx tsx scripts/import-csv.ts --sport nba --csv ./incoming.csv --mapping data/mappings/nba.json --out data/nba-players.json
 *
 * Rows that share an id become seasons on one athlete. Aliases, jersey numbers,
 * and facts may be pipe-separated inside a quoted CSV cell.
 */

interface Mapping {
  id: string;
  name: string;
  aliases?: string;
  position: string;
  heightInches: string;
  birthCountry: string;
  college?: string;
  draftYear?: string;
  draftPick?: string;
  jerseyNumbers: string;
  year: string;
  team: string;
  stats: Record<string, string>;
  headline?: string;
  facts?: string;
  origin?: string;
  verified?: string;
}

function argument(flag: string): string {
  const value = optional(flag);
  if (!value) throw new Error(`Missing ${flag}`);
  return value;
}

function optional(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char ?? "";
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

function blank(value: string | undefined): boolean {
  return value == null || value === "" || value === "-";
}

function numberOrNull(value: string | undefined): number | null {
  if (blank(value)) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new Error(`Bad number ${value}`);
  return parsed;
}

function splitList(value: string | undefined): string[] {
  if (value == null || value === "" || value === "-") return [];
  return value.split("|").map((part) => part.trim()).filter(Boolean);
}

const sport = argument("--sport");
const csvPath = resolve(argument("--csv"));
const mapping = JSON.parse(readFileSync(resolve(argument("--mapping")), "utf8")) as Mapping;
const outPath = resolve(optional("--out") ?? `data/${sport}-players.json`);
const rows = parseCsv(readFileSync(csvPath, "utf8"));
const header = rows[0];
if (!header) throw new Error("CSV is empty");
const records = rows.slice(1).map((row) => {
  const record: Record<string, string> = {};
  header.forEach((column, index) => {
    record[column] = row[index] ?? "";
  });
  return record;
});

interface AthleteDraft {
  id: string;
  sport: string;
  name: string;
  aliases: string[];
  verified: boolean;
  seasons: { year: string; team: string; stats: Record<string, number> }[];
  position: string;
  heightInches: number;
  birthCountry: string;
  college: string | null;
  draftYear: number | null;
  draftPick: number | null;
  jerseyNumbers: number[];
  teamHistory: { team: string; years: string[] }[];
  extra: Record<string, unknown>;
}

const byId = new Map<string, AthleteDraft>();
for (const record of records) {
  const id = record[mapping.id];
  if (!id) continue;
  const stats: Record<string, number> = {};
  for (const [key, column] of Object.entries(mapping.stats)) {
    const value = numberOrNull(record[column]);
    if (value == null) throw new Error(`${id} is missing ${key}`);
    stats[key] = value;
  }
  const season = { year: record[mapping.year] ?? "", team: record[mapping.team] ?? "", stats };
  const existing = byId.get(id);
  if (existing) {
    existing.seasons.push(season);
    if (!existing.teamHistory.some((stop) => stop.team === season.team)) {
      existing.teamHistory.push({ team: season.team, years: [season.year] });
    }
    continue;
  }
  const origin = mapping.origin ? record[mapping.origin] : "";
  const verifiedColumn = mapping.verified ? record[mapping.verified] : "";
  byId.set(id, {
    id: id.startsWith(`${sport}-`) ? id : `${sport}-${id}`,
    sport,
    name: record[mapping.name] ?? id,
    aliases: splitList(mapping.aliases ? record[mapping.aliases] : ""),
    verified: verifiedColumn === "true" || verifiedColumn === "1",
    seasons: [season],
    position: record[mapping.position] ?? "",
    heightInches: numberOrNull(record[mapping.heightInches]) ?? 0,
    birthCountry: record[mapping.birthCountry] ?? "",
    college: blank(mapping.college ? record[mapping.college] : "") ? null : (record[mapping.college ?? ""] ?? null),
    draftYear: numberOrNull(mapping.draftYear ? record[mapping.draftYear] : ""),
    draftPick: numberOrNull(mapping.draftPick ? record[mapping.draftPick] : ""),
    jerseyNumbers: splitList(record[mapping.jerseyNumbers]).map((value) => Number(value)),
    teamHistory: [{ team: season.team, years: [season.year] }],
    extra: {
      headline: mapping.headline ? record[mapping.headline] ?? "" : "",
      facts: splitList(mapping.facts ? record[mapping.facts] : ""),
      ...(blank(origin) ? {} : { origin }),
    },
  });
}

const players = [...byId.values()];
writeFileSync(outPath, `${JSON.stringify(players, null, 2)}\n`);
console.log(`Wrote ${players.length} athletes to ${outPath}`);
