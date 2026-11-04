import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlayExperience } from "@/components/play-experience";
import { SportSwitcher } from "@/components/sport-switcher";
import { readStreak } from "@/lib/plays-store";
import { defaultSportId } from "@/lib/site";
import { viewer } from "@/lib/viewer";
import { getEnabledSports, getSportById } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Play" };

export default async function SportPlayPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport: sportId } = await params;
  const enabled = getEnabledSports();
  const known = getSportById(sportId);
  if (!known || !enabled.some((sport) => sport.id === known.id)) notFound();
  const sports = enabled.map(toPublicSport);
  const fallback = defaultSportId(sports.map((sport) => sport.id));
  if (enabled.length === 1 || known.id === fallback) redirect("/play");
  const who = await viewer();
  const streak = await readStreak(who.userId, known.id);
  return (
    <div className="mx-auto max-w-xl px-4 py-6" style={{ ["--accent" as string]: known.accentColor }}>
      <SportSwitcher sports={sports} activeId={known.id} defaultSportId={fallback} />
      <PlayExperience sportId={known.id} isPro={who.isPro} signedIn={Boolean(who.userId)} initialStreak={streak} variant="full" />
    </div>
  );
}
