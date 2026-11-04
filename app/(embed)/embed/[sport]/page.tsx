import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayExperience } from "@/components/play-experience";
import { readStreak } from "@/lib/plays-store";
import { defaultSportId } from "@/lib/site";
import { playPath } from "@/lib/sport-path";
import { viewer } from "@/lib/viewer";
import { getEnabledSports, getSportById } from "@/sports/registry";

export const dynamic = "force-dynamic";

export default async function EmbedSportPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams: Promise<{ accent?: string }>;
}) {
  const { sport: sportId } = await params;
  const query = await searchParams;
  const known = getSportById(sportId);
  const enabled = getEnabledSports();
  if (!known || !enabled.some((sport) => sport.id === known.id)) notFound();
  const who = await viewer();
  const streak = await readStreak(who.userId, known.id);
  const accent = query.accent && /^#[0-9a-fA-F]{6}$/.test(query.accent) ? query.accent : known.accentColor;
  return (
    <div style={{ ["--accent" as string]: accent }}>
      <PlayExperience sportId={known.id} isPro={who.isPro} signedIn={Boolean(who.userId)} initialStreak={streak} variant="embed" />
      <p className="mt-4 text-center text-xs text-[var(--muted)]">
        <Link href={playPath(known.id, enabled, defaultSportId(enabled.map((sport) => sport.id)))}>Play on BOXED</Link>
      </p>
    </div>
  );
}
