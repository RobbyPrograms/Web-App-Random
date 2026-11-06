import type { Athlete } from "@/sports/types";
import raw from "@/data/nfl-players.json";
import { defaultClueLadder } from "../clues";
import { footballColumns } from "../compare";
import { defineSport, integer, oneDecimal } from "../define";

const players = raw as unknown as Athlete[];

const qb = [
  { key: "passYds", label: "PASS YDS", format: integer },
  { key: "passTd", label: "TD", format: integer },
  { key: "interceptions", label: "INT", format: integer },
  { key: "rating", label: "RTG", format: oneDecimal },
];

const rb = [
  { key: "rushYds", label: "RUSH YDS", format: integer },
  { key: "rushTd", label: "TD", format: integer },
  { key: "ypc", label: "YPC", format: oneDecimal },
];

const wr = [
  { key: "receptions", label: "REC", format: integer },
  { key: "recYds", label: "YDS", format: integer },
  { key: "recTd", label: "TD", format: integer },
];

export const nfl = defineSport({
  id: "nfl",
  name: "NFL",
  shortName: "NFL",
  emoji: "🏈",
  accentColor: "#3B82F6",
  statFields: qb,
  statProfiles: [
    { id: "qb", label: "Quarterback", statFields: qb, matches: (player) => player.position === "QB" },
    { id: "rb", label: "Running back", statFields: rb, matches: (player) => player.position === "RB" },
    {
      id: "receiver",
      label: "Receiver",
      statFields: wr,
      matches: (player) => player.position === "WR" || player.position === "TE",
    },
  ],
  clueLadder: defaultClueLadder(),
  columns: footballColumns(),
  heightRange: { min: 66, max: 82 },
  ranges: {
    passYds: { min: 0, max: 6000 },
    passTd: { min: 0, max: 60 },
    interceptions: { min: 0, max: 35 },
    rating: { min: 0, max: 158.3 },
    rushYds: { min: 0, max: 2500 },
    rushTd: { min: 0, max: 30 },
    ypc: { min: 0, max: 12 },
    receptions: { min: 0, max: 160 },
    recYds: { min: 0, max: 2000 },
    recTd: { min: 0, max: 25 },
  },
  players,
});
