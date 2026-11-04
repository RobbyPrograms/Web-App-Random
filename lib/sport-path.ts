import type { PublicSport } from "@/sports/types";

export function playPath(sportId: string, sports: readonly { id: string }[], defaultId: string): string {
  if (sports.length < 2) return "/play";
  if (sportId === defaultId) return "/play";
  return `/play/${sportId}`;
}

export function embedPath(sportId: string, defaultId: string): string {
  if (sportId === defaultId) return "/embed";
  return `/embed/${sportId}`;
}

export function nextEnabledSport(currentId: string, sports: readonly PublicSport[]): PublicSport | null {
  if (sports.length < 2) return null;
  const index = sports.findIndex((sport) => sport.id === currentId);
  if (index < 0) return sports[0] ?? null;
  return sports[(index + 1) % sports.length] ?? null;
}
