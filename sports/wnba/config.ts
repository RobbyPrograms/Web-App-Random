import type { Athlete } from "@/sports/types";
import raw from "@/data/wnba-players.json";
import { defaultClueLadder } from "../clues";
import { basketballColumns } from "../compare";
import { defineSport, oneDecimal } from "../define";

const players = raw as unknown as Athlete[];

export const wnba = defineSport({
  id: "wnba",
  name: "WNBA",
  shortName: "WNBA",
  emoji: "🏀",
  accentColor: "#E11D48",
  statFields: [
    { key: "ppg", label: "PPG", format: oneDecimal },
    { key: "rpg", label: "RPG", format: oneDecimal },
    { key: "apg", label: "APG", format: oneDecimal },
    { key: "fg", label: "FG%", format: oneDecimal },
  ],
  clueLadder: defaultClueLadder(),
  columns: basketballColumns(),
  heightRange: { min: 64, max: 90 },
  ranges: {
    ppg: { min: 0, max: 40 },
    rpg: { min: 0, max: 20 },
    apg: { min: 0, max: 12 },
    fg: { min: 0, max: 70 },
  },
  players,
});
