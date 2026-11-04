import type { Athlete } from "@/sports/types";
import raw from "@/data/mlb-players.json";
import { defaultClueLadder } from "../clues";
import { battingAverage, defineSport, era, integer } from "../define";

const players = raw as unknown as Athlete[];

const hitter = [
  { key: "avg", label: "AVG", format: battingAverage },
  { key: "hr", label: "HR", format: integer },
  { key: "rbi", label: "RBI", format: integer },
  { key: "ops", label: "OPS", format: battingAverage },
];

const pitcher = [
  { key: "era", label: "ERA", format: era },
  { key: "wins", label: "W", format: integer },
  { key: "strikeouts", label: "K", format: integer },
  { key: "whip", label: "WHIP", format: era },
];

const isPitcher = (position: string) => position === "SP" || position === "RP" || position === "P";

export const mlb = defineSport({
  id: "mlb",
  name: "MLB",
  shortName: "MLB",
  emoji: "⚾",
  accentColor: "#1D4ED8",
  statFields: hitter,
  statProfiles: [
    { id: "pitcher", label: "Pitcher", statFields: pitcher, matches: (player) => isPitcher(player.position) },
    { id: "hitter", label: "Hitter", statFields: hitter, matches: (player) => !isPitcher(player.position) },
  ],
  clueLadder: defaultClueLadder(),
  heightRange: { min: 66, max: 84 },
  ranges: {
    avg: { min: 0.15, max: 0.45 },
    hr: { min: 0, max: 75 },
    rbi: { min: 0, max: 200 },
    ops: { min: 0.4, max: 1.5 },
    era: { min: 0.5, max: 8 },
    wins: { min: 0, max: 35 },
    strikeouts: { min: 0, max: 400 },
    whip: { min: 0.6, max: 1.8 },
  },
  players,
});
