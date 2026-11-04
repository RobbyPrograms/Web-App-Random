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
  const players = compileSport(sport, linesFor(sport));
  const count = writeSport(sport, players);
  console.log(`${sport}: ${count}`);
}
