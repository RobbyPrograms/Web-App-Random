import { z, type ZodType } from "zod";
import type { Athlete, StatProfile } from "./types";

const seasonSchema = z.object({
  year: z.string().regex(/^\d{4}(-\d{2})?$/, "season year must look like 2016 or 2016-17"),
  team: z.string().min(2).max(80),
  stats: z.record(z.string(), z.number().finite()),
});

export const athleteObjectSchema = z
  .object({
    id: z.string().min(3).max(80),
    sport: z.string().min(2),
    name: z.string().min(2).max(80),
    aliases: z.array(z.string().min(1)).max(12),
    verified: z.boolean(),
    seasons: z.array(seasonSchema).min(1).max(12),
    position: z.string().min(1).max(24),
    heightInches: z.number().int(),
    birthCountry: z.string().min(2).max(56),
    college: z.string().min(2).max(80).nullable(),
    draftYear: z.number().int().min(1940).max(2035).nullable(),
    draftPick: z.number().int().positive().max(2000).nullable(),
    jerseyNumbers: z.array(z.number().int().min(0).max(99)).min(1).max(8),
    teamHistory: z
      .array(
        z.object({
          team: z.string().min(2).max(80),
          years: z.array(z.string().min(4).max(20)).min(1),
        }),
      )
      .min(1),
    extra: z.record(z.string(), z.unknown()),
  })
  .superRefine((player, ctx) => {
    if (player.draftPick != null && player.draftYear == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "draft pick without draft year",
        path: ["draftPick"],
      });
    }
  });

export interface SportSchemaOptions {
  sportId: string;
  heightRange: { min: number; max: number };
  signedStatKeys: string[];
  profiles: StatProfile[];
  defaultStatKeys: string[];
  /** Inclusive numeric ranges keyed by stat key. */
  ranges: Record<string, { min: number; max: number }>;
}

function matchingProfiles(player: Athlete, profiles: StatProfile[]): StatProfile[] {
  return profiles.filter((profile) => profile.matches(player));
}

export function createSportSchema(options: SportSchemaOptions): ZodType<Athlete> {
  return athleteObjectSchema.superRefine((player, ctx) => {
    if (player.sport !== options.sportId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `sport must be ${options.sportId}`,
        path: ["sport"],
      });
    }
    if (!player.id.startsWith(`${options.sportId}-`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `id must start with ${options.sportId}-`,
        path: ["id"],
      });
    }
    if (
      player.heightInches < options.heightRange.min ||
      player.heightInches > options.heightRange.max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `height ${player.heightInches} is outside ${options.heightRange.min}-${options.heightRange.max}`,
        path: ["heightInches"],
      });
    }

    const profiles = matchingProfiles(player, options.profiles);
    const keys =
      profiles.length > 0
        ? profiles[0]!.statFields.map((field) => field.key)
        : options.defaultStatKeys;

    if (options.profiles.length > 0 && profiles.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `position ${player.position} does not match a stat profile`,
        path: ["position"],
      });
    }

    player.seasons.forEach((season, index) => {
      for (const key of keys) {
        const value = season.stats[key];
        if (typeof value !== "number") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `missing stat ${key}`,
            path: ["seasons", index, "stats", key],
          });
          continue;
        }
        const range = options.ranges[key];
        if (!range) continue;
        if (value < range.min || value > range.max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} ${value} is outside ${range.min}-${range.max}`,
            path: ["seasons", index, "stats", key],
          });
        }
      }
      for (const [key, value] of Object.entries(season.stats)) {
        if (value < 0 && !options.signedStatKeys.includes(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `negative stat ${key}`,
            path: ["seasons", index, "stats", key],
          });
        }
      }
    });
  }) as ZodType<Athlete>;
}
