import { LeaguesBoard } from "@/components/leagues-board";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";

export const dynamic = "force-dynamic";

export default async function LeaguesPage() {
  const who = await viewer();
  const sports = getEnabledSports().map(toPublicSport);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-5xl">Leagues</h1>
      <p className="mt-2 text-[var(--muted)]">Private boards by invite code. Sign in to create one or join with a code.</p>
      <div className="mt-6">
        <LeaguesBoard sports={sports} signedIn={Boolean(who.userId)} />
      </div>
    </div>
  );
}
