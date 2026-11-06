import type { Athlete } from "@/sports/types";
import raw from "@/data/nba-players.json";
import { defaultClueLadder } from "../clues";
import { basketballColumns } from "../compare";
import { defineSport, oneDecimal } from "../define";

const players = raw as unknown as Athlete[];

const fields = [
  { key: "ppg", label: "PPG", format: oneDecimal },
  { key: "rpg", label: "RPG", format: oneDecimal },
  { key: "apg", label: "APG", format: oneDecimal },
  { key: "fg", label: "FG%", format: oneDecimal },
];

export const nba = defineSport({
  id: "nba",
  name: "NBA",
  shortName: "NBA",
  emoji: "🏀",
  accentColor: "#FF5A1F",
  statFields: fields,
  clueLadder: defaultClueLadder(),
  columns: basketballColumns(),
  heightRange: { min: 63, max: 96 },
  ranges: {
    ppg: { min: 0, max: 55 },
    rpg: { min: 0, max: 30 },
    apg: { min: 0, max: 16 },
    fg: { min: 0, max: 80 },
  },
  players,
});
