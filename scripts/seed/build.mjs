import { readdirSync } from "node:fs";
import { compileSport, readLines, writeSport } from "./compile.mjs";

const sports = ["nba", "wnba", "nfl", "mlb", "nhl", "epl"];

function linesFor(sport) {
  const files = readdirSync("scripts/seed")
    .filter((file) => file === `${sport}.psv` || file.startsWith(`${sport}-`))
    .sort();
  return files.flatMap((file) => readLines(`scripts/seed/${file}`));
}

for (const sport of sports) {
  const lines = linesFor(sport);
  if (lines.length === 0) {
    console.log(`${sport}: skipped`);
    continue;
  }
  const players = compileSport(sport, lines);
  const count = writeSport(sport, players);
  console.log(`${sport}: ${count}`);
}
