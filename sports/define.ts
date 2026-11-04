import type { ZodType } from "zod";
import { createSportSchema } from "./schema";
import type { Athlete, ClueDefinition, SportConfig, StatField, StatProfile } from "./types";

export interface DefineSportInput {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  accentColor: string;
  statFields: StatField[];
  statProfiles?: StatProfile[];
  clueLadder: ClueDefinition[];
  heightRange: { min: number; max: number };
  signedStatKeys?: string[];
  ranges: Record<string, { min: number; max: number }>;
  players: Athlete[];
}

export function defineSport(input: DefineSportInput): SportConfig {
  const profiles = input.statProfiles ?? [];
  const schema: ZodType<Athlete> = createSportSchema({
    sportId: input.id,
    heightRange: input.heightRange,
    signedStatKeys: input.signedStatKeys ?? [],
    profiles,
    defaultStatKeys: input.statFields.map((field) => field.key),
    ranges: input.ranges,
  });
  return {
    id: input.id,
    name: input.name,
    shortName: input.shortName,
    emoji: input.emoji,
    accentColor: input.accentColor,
    statFields: input.statFields,
    statProfiles: profiles,
    clueLadder: input.clueLadder,
    heightRange: input.heightRange,
    signedStatKeys: input.signedStatKeys ?? [],
    schema,
    validate: (player: unknown) => schema.parse(player),
    players: input.players,
  };
}

export const oneDecimal = (value: number): string => value.toFixed(1);
export const integer = (value: number): string => String(Math.round(value));
export const signed = (value: number): string => (value > 0 ? `+${Math.round(value)}` : String(Math.round(value)));
export const era = (value: number): string => value.toFixed(2);
export const battingAverage = (value: number): string => value.toFixed(3).replace(/^0(?=\.)/, "");
export const savePct = (value: number): string => value.toFixed(3).replace(/^0(?=\.)/, "");
