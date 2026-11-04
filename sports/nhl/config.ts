import type { Athlete } from "@/sports/types";
import raw from "@/data/nhl-players.json";
import { defaultClueLadder } from "../clues";
import { defineSport, era, integer, savePct, signed } from "../define";

const players = raw as unknown as Athlete[];

const skater = [
  { key: "goals", label: "G", format: integer },
  { key: "assists", label: "A", format: integer },
  { key: "points", label: "PTS", format: integer },
  { key: "plusMinus", label: "+/-", format: signed },
];

const goalie = [
  { key: "wins", label: "W", format: integer },
  { key: "gaa", label: "GAA", format: era },
  { key: "savePct", label: "SV%", format: savePct },
  { key: "shutouts", label: "SO", format: integer },
];

export const nhl = defineSport({
  id: "nhl",
  name: "NHL",
  shortName: "NHL",
  emoji: "🏒",
  accentColor: "#38BDF8",
  statFields: skater,
  statProfiles: [
    { id: "goalie", label: "Goalie", statFields: goalie, matches: (player) => player.position === "G" },
    { id: "skater", label: "Skater", statFields: skater, matches: (player) => player.position !== "G" },
  ],
  clueLadder: defaultClueLadder(),
  heightRange: { min: 66, max: 84 },
  signedStatKeys: ["plusMinus"],
  ranges: {
    goals: { min: 0, max: 100 },
    assists: { min: 0, max: 170 },
    points: { min: 0, max: 220 },
    plusMinus: { min: -80, max: 130 },
    wins: { min: 0, max: 50 },
    gaa: { min: 1, max: 4.5 },
    savePct: { min: 0.85, max: 0.96 },
    shutouts: { min: 0, max: 16 },
  },
  players,
});
