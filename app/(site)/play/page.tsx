import type { Metadata } from "next";
import { PlayExperience } from "@/components/play-experience";
import { SportSwitcher } from "@/components/sport-switcher";
import { readStreak } from "@/lib/plays-store";
import { defaultSportId } from "@/lib/site";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Play" };

export default async function PlayPage() {
  const who = await viewer();
  const sports = getEnabledSports().map(toPublicSport);
  const activeId = defaultSportId(sports.map((sport) => sport.id));
  const active = sports.find((sport) => sport.id === activeId) ?? sports[0];
  const streak = await readStreak(who.userId, activeId);
  return (
    <div className="mx-auto max-w-xl px-4 py-6" style={{ ["--accent" as string]: active?.accentColor ?? "#FF5A1F" }}>
      <SportSwitcher sports={sports} activeId={activeId} defaultSportId={activeId} />
      <PlayExperience sportId={activeId} isPro={who.isPro} signedIn={Boolean(who.userId)} initialStreak={streak} variant="full" />
    </div>
  );
}
