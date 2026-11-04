import { writeFileSync } from "node:fs";
import { ZodError } from "zod";
import { normalizeText } from "../lib/fuzzy";
import type { Athlete, SportConfig } from "../sports/types";
import { epl } from "../sports/epl/config";
import { mlb } from "../sports/mlb/config";
import { nba } from "../sports/nba/config";
import { nfl } from "../sports/nfl/config";
import { nhl } from "../sports/nhl/config";
import { wnba } from "../sports/wnba/config";

const sports: SportConfig[] = [nba, wnba, nfl, mlb, nhl, epl];

interface Issue {
  sport: string;
  id: string;
  message: string;
}

const issues: Issue[] = [];
const lines: string[] = ["# Verify these athletes", ""];
lines.push(
  "Every seed athlete ships with `verified: false`. The daily puzzle still uses them until `REQUIRE_VERIFIED=true`.",
);
lines.push("Check the season line, then set `verified` to `true` in the JSON (or re-import from a checked CSV).");
lines.push("");

function flag(sport: string, id: string, message: string) {
  issues.push({ sport, id, message });
}

for (const sport of sports) {
  const ids = new Set<string>();
  const names = new Map<string, string>();
  lines.push(`## ${sport.name} (${sport.players.length})`, "");

  sport.players.forEach((player, index) => {
    let parsed: Athlete | null = null;
    try {
      parsed = sport.validate(player);
    } catch (error) {
      const message =
        error instanceof ZodError
          ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
          : "invalid player";
      flag(sport.id, player.id || `#${index}`, message);
    }

    if (ids.has(player.id)) flag(sport.id, player.id, "duplicate id");
    ids.add(player.id);

    const nameKey = normalizeText(player.name);
    const prior = names.get(nameKey);
    if (prior) flag(sport.id, player.id, `duplicate name with ${prior}`);
    else names.set(nameKey, player.id);

    if (player.draftPick != null && player.draftYear == null) {
      flag(sport.id, player.id, "draft pick without draft year");
    }
    if (player.heightInches < sport.heightRange.min || player.heightInches > sport.heightRange.max) {
      flag(sport.id, player.id, `height ${player.heightInches} out of range`);
    }
    for (const season of player.seasons) {
      for (const [key, value] of Object.entries(season.stats)) {
        if (value < 0 && !sport.signedStatKeys.includes(key)) {
          flag(sport.id, player.id, `negative ${key} in ${season.year}`);
        }
      }
    }

    const seasonBits = player.seasons
      .map((season) => `${season.year} ${season.team} ${JSON.stringify(season.stats)}`)
      .join("<br>");
    lines.push(`- [ ] \`${player.id}\` **${player.name}** (${player.position}) — ${seasonBits}`);
  });
  lines.push("");
}

const bySport = new Map<string, number>();
for (const issue of issues) bySport.set(issue.sport, (bySport.get(issue.sport) ?? 0) + 1);

console.log("BOXED data report");
for (const sport of sports) {
  console.log(`  ${sport.id}: ${sport.players.length} athletes, ${bySport.get(sport.id) ?? 0} issues`);
}

if (issues.length > 0) {
  console.log("");
  for (const issue of issues.slice(0, 80)) {
    console.log(`  ${issue.sport} ${issue.id}: ${issue.message}`);
  }
  if (issues.length > 80) console.log(`  … ${issues.length - 80} more`);
}

writeFileSync("data/VERIFY-ME.md", `${lines.join("\n")}\n`);
console.log(`wrote data/VERIFY-ME.md (${issues.length} issues)`);

if (issues.length > 0) process.exit(1);
