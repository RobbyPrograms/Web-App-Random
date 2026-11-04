import Link from "next/link";
import { dateFromPuzzleNumber, puzzleNumberFor } from "@/lib/dates";
import { launchDate } from "@/lib/site";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const who = await viewer();
  const sports = getEnabledSports();
  const today = puzzleNumberFor(launchDate());
  const start = who.isPro ? 1 : Math.max(1, today - 2);
  const numbers: number[] = [];
  for (let puzzle = today; puzzle >= start; puzzle -= 1) numbers.push(puzzle);
  const lockedStart = who.isPro ? 0 : Math.max(0, today - 3);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-5xl">Archive</h1>
      <p className="mt-2 text-[var(--muted)]">
        {who.isPro ? "Every past puzzle is open." : "Today and the previous two days are free. Older boards are a Pro perk."}
      </p>
      {sports.length === 0 && <p className="mt-8">No sports are enabled.</p>}
      <div className="mt-6 space-y-8">
        {sports.map((sport) => (
          <section key={sport.id}>
            <h2 className="font-display text-3xl">{sport.emoji} {sport.name}</h2>
            <ul className="mt-3 grid gap-2">
              {numbers.map((puzzle) => (
                <li key={puzzle}>
                  <Link href={`/archive/${sport.id}/${puzzle}`} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                    <span>BOXED #{puzzle}</span>
                    <span className="text-sm text-[var(--muted)]">{dateFromPuzzleNumber(launchDate(), puzzle)}</span>
                  </Link>
                </li>
              ))}
              {!who.isPro && lockedStart > 0 && (
                <li className="rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm text-[var(--muted)]">
                  {lockedStart} older {sport.shortName} puzzle{lockedStart === 1 ? "" : "s"} stay locked.{" "}
                  <Link href="/#pricing" className="text-[var(--cyan)]">Unlock with Pro</Link>
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
      </div>
  );
}
