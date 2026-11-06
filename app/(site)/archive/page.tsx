import Link from "next/link";
import { dateFromPuzzleNumber, puzzleNumberFor } from "@/lib/dates";
import { launchDate } from "@/lib/site";
import { getEnabledSports } from "@/sports/registry";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const sports = getEnabledSports();
  const today = puzzleNumberFor(launchDate());
  const numbers: number[] = [];
  for (let puzzle = today; puzzle >= 1; puzzle -= 1) numbers.push(puzzle);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-5xl">Archive</h1>
      <p className="mt-2 text-[var(--muted)]">Every past puzzle is open.</p>
      {sports.length === 0 && <p className="mt-8">No sports are enabled.</p>}
      <div className="mt-6 space-y-8">
        {sports.map((sport) => (
          <section key={sport.id}>
            <h2 className="font-display text-3xl">{sport.emoji} {sport.name}</h2>
            <ul className="mt-3 grid max-h-96 gap-2 overflow-auto pr-1">
              {numbers.map((puzzle) => (
                <li key={puzzle}>
                  <Link href={`/archive/${sport.id}/${puzzle}`} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                    <span>BOXED #{puzzle}</span>
                    <span className="text-sm text-[var(--muted)]">{dateFromPuzzleNumber(launchDate(), puzzle)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
