import { StatsBoard } from "@/components/stats-board";
import { launchDate } from "@/lib/site";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const who = await viewer();
  const sports = getEnabledSports().map(toPublicSport);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-5xl">Stats</h1>
      <p className="mt-2 text-[var(--muted)]">
        {sports.length > 1 ? "Per sport, plus the Daily Sweep when every enabled puzzle is solved." : "Your streak, win rate, and calendar for this sport."}
      </p>
      <div className="mt-6">
        <StatsBoard sports={sports} launchDate={launchDate()} signedIn={Boolean(who.userId)} />
      </div>
    </div>
  );
}
