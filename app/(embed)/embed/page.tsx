import Link from "next/link";
import { PlayExperience } from "@/components/play-experience";
import { readStreak } from "@/lib/plays-store";
import { defaultSportId } from "@/lib/site";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";

export const dynamic = "force-dynamic";

export default async function EmbedPage({ searchParams }: { searchParams: Promise<{ accent?: string }> }) {
  const query = await searchParams;
  const who = await viewer();
  const sports = getEnabledSports();
  const activeId = defaultSportId(sports.map((sport) => sport.id));
  const accent = safeAccent(query.accent) ?? sports.find((sport) => sport.id === activeId)?.accentColor ?? "#FF5A1F";
  const streak = await readStreak(who.userId, activeId);
  return (
    <div style={{ ["--accent" as string]: accent }}>
      <PlayExperience sportId={activeId} isPro={who.isPro} signedIn={Boolean(who.userId)} initialStreak={streak} variant="embed" />
      <p className="mt-4 text-center text-xs text-[var(--muted)]">
        <Link href="/play">Play on BOXED</Link>
      </p>
    </div>
  );
}

function safeAccent(value: string | undefined): string | null {
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) return null;
  return value;
}
