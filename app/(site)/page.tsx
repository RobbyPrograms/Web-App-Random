import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { PlayExperience } from "@/components/play-experience";
import { readStreak } from "@/lib/plays-store";
import { playPath } from "@/lib/sport-path";
import { defaultSportId } from "@/lib/site";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";

export const dynamic = "force-dynamic";

const FAQS = [
  {
    q: "Is it the same puzzle for everyone?",
    a: "Yes. Puzzle number and sport pick one athlete for every player. Your guesses stay on your device until you sign in.",
  },
  {
    q: "Do I need an account?",
    a: "No. Play and share anonymously. An account keeps your streak when you switch phones and unlocks Pro.",
  },
  {
    q: "What does Pro change?",
    a: "Create private leagues, open the full archive, drop the sponsor slot, and wear the gold badge. Joining a league stays free.",
  },
  {
    q: "Where do the stats come from?",
    a: "Seed seasons ship unverified so you can spot-check them. The selector prefers athletes you mark verified, and can require them.",
  },
];

export default async function HomePage() {
  const who = await viewer();
  const sports = getEnabledSports().map(toPublicSport);
  const activeId = defaultSportId(sports.map((sport) => sport.id));
  const active = sports.find((sport) => sport.id === activeId) ?? sports[0];
  const single = sports.length === 1;
  const streak = await readStreak(who.userId, activeId);
  const fan = single && active ? `${active.name} fans` : "multi-sport fans";

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--cyan)]">Daily stat line</p>
          <h1 className="mt-3 font-display text-6xl font-semibold leading-[0.9] sm:text-7xl">
            {single && active ? `${active.emoji} Name the ${active.shortName} season.` : "Six guesses. Every sport."}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
            BOXED gives {fan} one anonymous season and six tries to name the athlete. Wrong guesses open the next clue. The answer stays off your screen until the board ends.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/play" className="press rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-[#0A0A0F]">
              Play today
            </Link>
            <Link href="#how" className="rounded-full border border-white/15 px-5 py-3">
              How it works
            </Link>
          </div>
        </div>
        {active && (
          <PlayExperience
            sportId={active.id}
            isPro={who.isPro}
            signedIn={Boolean(who.userId)}
            initialStreak={streak}
            variant="hero"
          />
        )}
      </section>

      <section id="how" className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-3">
        {[
          ["01", "Read the ticket", "A season, four numbers, no name. The line is the same for every player of that sport."],
          ["02", "Spend six guesses", "Each miss fills the next row and opens one hint. You never see a hint before you earn it."],
          ["03", "Share the grid", "A spoiler-free result, a streak, and tomorrow's countdown. No account required."],
        ].map(([step, title, copy]) => (
          <article key={step} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="font-display text-3xl text-[var(--accent)]">{step}</p>
            <h2 className="mt-2 font-display text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{copy}</p>
          </article>
        ))}
      </section>

      {sports.length > 1 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="font-display text-4xl">Today&apos;s puzzles</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sports.map((sport) => (
              <Link
                key={sport.id}
                href={playPath(sport.id, sports, activeId)}
                className="rounded-3xl border border-white/10 bg-[#12121A] p-5"
                style={{ boxShadow: `0 0 40px -24px ${sport.accentColor}` }}
              >
                <p className="text-3xl" aria-hidden>{sport.emoji}</p>
                <p className="mt-2 font-display text-3xl">{sport.name}</p>
                <p className="text-sm text-[var(--muted)]">Open today&apos;s {sport.shortName} line</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-3">
        {[
          ["Same board", "One seeded puzzle per sport per day. No repeats until that pool runs out."],
          ["Clues, not spoilers", "The answer never ships to the browser before the game ends."],
          ["Play first", "Anonymous rounds save on this device and move to an account when you sign in."],
        ].map(([title, copy]) => (
          <article key={title} className="rounded-3xl border border-white/10 p-5">
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{copy}</p>
          </article>
        ))}
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="font-display text-4xl">Pro</h2>
        <p className="mt-2 max-w-xl text-[var(--muted)]">Leagues, the full archive, a quiet board, and a gold badge.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 p-5">
            <h3 className="font-display text-3xl">$3.99<span className="text-lg text-[var(--muted)]"> / month</span></h3>
            <CheckoutButton plan="monthly" label="Start monthly" signedIn={Boolean(who.userId)} />
          </article>
          <article className="rounded-3xl border border-[var(--accent)] p-5">
            <h3 className="font-display text-3xl">$29.99<span className="text-lg text-[var(--muted)]"> / year</span></h3>
            <CheckoutButton plan="yearly" label="Start yearly" signedIn={Boolean(who.userId)} />
          </article>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="font-display text-4xl">FAQ</h2>
        <div className="mt-4 space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="rounded-2xl border border-white/10 px-4 py-3">
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
