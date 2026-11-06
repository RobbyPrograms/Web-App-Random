import { notFound } from "next/navigation";
import { Board } from "@/components/game/board";
import { loadPlay } from "@/lib/play-loader";
import { shareHost } from "@/lib/site";
import type { StreakState } from "@/lib/streaks";
import Link from "next/link";

export async function PlayExperience(props: {
  sportId?: string | null;
  puzzleNumber?: number | null;
  signedIn: boolean;
  initialStreak: StreakState;
  variant: "full" | "embed" | "hero";
}) {
  const load = await loadPlay({
    sportId: props.sportId,
    puzzleNumber: props.puzzleNumber,
  });
  if (load.kind === "unknown" || load.kind === "disabled") notFound();
  if (load.kind === "future") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl">That puzzle hasn&apos;t tipped off.</h1>
        <p className="mt-3 text-[var(--muted)]">BOXED #{load.puzzleNumber} opens with the rest of the slate.</p>
        <Link className="mt-6 inline-block text-[var(--cyan)]" href="/play">
          Play today
        </Link>
      </div>
    );
  }
  if (load.kind === "empty") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-4xl">{load.sport.name} is warming up.</h1>
        <p className="mt-3 text-[var(--muted)]">{load.message}</p>
      </div>
    );
  }
  return (
    <Board
      sport={load.sport}
      sports={load.sports}
      puzzle={load.puzzle}
      roster={load.roster}
      sponsor={load.sponsor}
      signedIn={props.signedIn}
      launchDate={load.launchDate}
      shareHost={shareHost()}
      showFilter={false}
      filterIds={[load.sport.id]}
    />
  );
}
