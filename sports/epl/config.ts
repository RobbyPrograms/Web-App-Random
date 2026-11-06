import type { Athlete } from "@/sports/types";
import raw from "@/data/epl-players.json";
import { defaultClueLadder, nationalityClue, originClue } from "../clues";
import { soccerColumns } from "../compare";
import { defineSport, integer } from "../define";

const players = raw as unknown as Athlete[];

const outfield = [
  { key: "goals", label: "G", format: integer },
  { key: "assists", label: "A", format: integer },
  { key: "apps", label: "APPS", format: integer },
];

const keeper = [
  { key: "cleanSheets", label: "CS", format: integer },
  { key: "saves", label: "SV", format: integer },
  { key: "apps", label: "APPS", format: integer },
];

export const epl = defineSport({
  id: "epl",
  name: "Premier League",
  shortName: "EPL",
  emoji: "⚽",
  accentColor: "#7C3AED",
  statFields: outfield,
  statProfiles: [
    { id: "gk", label: "Goalkeeper", statFields: keeper, matches: (player) => player.position === "GK" },
    { id: "outfield", label: "Outfield", statFields: outfield, matches: (player) => player.position !== "GK" },
  ],
  clueLadder: defaultClueLadder({
    draft: { label: "Path to the league", extract: originClue },
    background: { label: "Nationality", extract: nationalityClue },
  }),
  columns: soccerColumns(),
  heightRange: { min: 64, max: 84 },
  ranges: {
    goals: { min: 0, max: 45 },
    assists: { min: 0, max: 25 },
    apps: { min: 1, max: 42 },
    cleanSheets: { min: 0, max: 25 },
    saves: { min: 0, max: 180 },
  },
  players,
});
