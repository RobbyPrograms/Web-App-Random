import Link from "next/link";
import { notFound } from "next/navigation";
import { isLegalPattern } from "@/lib/share";
import { playPath } from "@/lib/sport-path";
import { defaultSportId } from "@/lib/site";
import { getEnabledSports, getSportById } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ sport: string; puzzle: string; pattern: string }>;
}) {
  const { sport: sportId, puzzle, pattern } = await params;
  const known = getSportById(sportId);
  const enabled = getEnabledSports();
  if (!known || !enabled.some((sport) => sport.id === known.id)) notFound();
  const normalized = pattern.toUpperCase();
  if (!isLegalPattern(normalized)) notFound();
  const sports = enabled.map(toPublicSport);
  const squares = normalized.replaceAll("R", "🟥").replaceAll("G", "🟩").replaceAll("W", "⬜");
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">{known.emoji} BOXED #{puzzle}</p>
      <p className="mt-4 font-display text-3xl tracking-widest">{squares}</p>
      <p className="mt-3 text-[var(--muted)]">The athlete stays on the board, not in the link.</p>
      <Link href={playPath(known.id, sports, defaultSportId(sports.map((sport) => sport.id)))} className="mt-6 inline-block text-[var(--cyan)]">
        Play {known.shortName}
      </Link>
    </div>
  );
}
