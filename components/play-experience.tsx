import { notFound } from "next/navigation";
import { GameScreen } from "@/components/game/game-screen";
import { loadPlay } from "@/lib/play-loader";
import { shareHost } from "@/lib/site";
import type { StreakState } from "@/lib/streaks";
import Link from "next/link";

export async function PlayExperience(props: {
  sportId?: string | null;
  puzzleNumber?: number | null;
  isPro: boolean;
  signedIn: boolean;
  initialStreak: StreakState;
  variant: "full" | "embed" | "hero";
}) {
  const load = await loadPlay({
    sportId: props.sportId,
    puzzleNumber: props.puzzleNumber,
    isPro: props.isPro,
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
  if (load.kind === "locked") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          {load.sport.emoji} {load.sport.name}
        </p>
        <h1 className="mt-2 font-display text-4xl">BOXED #{load.puzzleNumber} is in the archive.</h1>
        <p className="mt-3 text-[var(--muted)]">
          Free players get today and the previous two days. Pro opens every past puzzle, with the stat line still hidden until you play it.
        </p>
        <Link href="/#pricing" className="press mt-6 inline-block rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-[#0A0A0F]">
          See Pro
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
    <GameScreen
      sport={load.sport}
      sports={load.sports}
      puzzle={load.puzzle}
      roster={load.roster}
      clueLabels={load.clueLabels}
      sponsor={load.sponsor}
      isPro={props.isPro}
      signedIn={props.signedIn}
      initialStreak={props.initialStreak}
      defaultSportId={load.defaultSportId}
      nextSport={load.nextSport}
      shareHost={shareHost()}
      variant={props.variant}
    />
  );
}
