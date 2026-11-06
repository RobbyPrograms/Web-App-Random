import { cookies } from "next/headers";
import { Board } from "@/components/game/board";
import { puzzleNumberFor } from "@/lib/dates";
import { alphabeticalRoster, buildModePuzzle, modeKey, toPublicPuzzle } from "@/lib/puzzle";
import { pickSponsor, type SponsorRecord } from "@/lib/sponsors";
import { launchDate, requireVerified, shareHost } from "@/lib/site";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";
import { toPublicSport, type SportConfig } from "@/sports/types";
import { CheckoutButton } from "@/components/checkout-button";

export const dynamic = "force-dynamic";

const FAQS = [
  {
    q: "Is it the same puzzle for everyone?",
    a: "Same filter, same day, same athlete. A different mix of sports is a different puzzle.",
  },
  {
    q: "Do I need an account?",
    a: "No. Play and share anonymously. An account keeps your streak when you switch phones.",
  },
  {
    q: "Where do the stats come from?",
    a: "Seed seasons ship unverified so you can spot-check them. Mark athletes verified when you have a source.",
  },
];

function chosenSports(enabled: SportConfig[], raw: string | undefined): SportConfig[] {
  if (enabled.length < 2) return enabled;
  if (!raw) return enabled;
  const ids = raw.split(",").map((id) => id.trim().toLowerCase()).filter((id) => id.length > 0);
  const picked = enabled.filter((sport) => ids.includes(sport.id));
  return picked.length > 0 ? picked : enabled;
}

async function sponsorFor(sportId: string, puzzleNumber: number) {
  const admin = createAdminSupabase();
  if (!admin) return null;
  const { data, error } = await admin.from("sponsors").select("id, name, logo_url, tagline, url, sport, puzzle_number, active").eq("active", true);
  if (error || !data) return null;
  const records: SponsorRecord[] = data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    tagline: row.tagline ? String(row.tagline) : null,
    url: row.url ? String(row.url) : null,
    sport: row.sport ? String(row.sport) : null,
    puzzleNumber: typeof row.puzzle_number === "number" ? row.puzzle_number : null,
    active: Boolean(row.active),
  }));
  return pickSponsor(records, sportId, puzzleNumber);
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ sports?: string }> }) {
  const query = await searchParams;
  const jar = await cookies();
  const enabled = getEnabledSports();
  const sports = enabled.map(toPublicSport);
  const filter = chosenSports(enabled, query.sports ?? jar.get("boxed-sports")?.value);
  const who = await viewer();
  const number = puzzleNumberFor(launchDate());
  let built;
  try {
    built = buildModePuzzle(filter, number, requireVerified());
  } catch {
    return (
      <div className="mx-auto max-w-[520px] px-4 py-16">
        <h1 className="font-display text-4xl">The board is warming up.</h1>
        <p className="mt-3 text-[var(--muted)]">No verified athletes match this filter yet.</p>
      </div>
    );
  }
  const key = modeKey(filter.map((sport) => sport.id));
  const label = filter.length === 1 ? `${filter[0]?.shortName ?? built.sport.shortName} only` : "Any sport";
  const puzzle = toPublicPuzzle(built, { key, label });
  const sport = toPublicSport(built.sport);

  return (
    <div>
      <Board
        sport={sport}
        sports={sports}
        puzzle={puzzle}
        roster={alphabeticalRoster(built.sport)}
        sponsor={await sponsorFor(built.sport.id, number)}
        signedIn={Boolean(who.userId)}
        launchDate={launchDate()}
        shareHost={shareHost()}
        showFilter={enabled.length > 1}
        filterIds={filter.map((item) => item.id)}
      />

      <div className="mx-auto max-w-[520px] px-4">
        <section id="how" className="grid gap-3 py-8">
          {[
            ["01", "Read the ticket", "One season, one sport, no name. Everyone with this filter sees the same line."],
            ["02", "Guess in color", "Each guess is a row of tiles. Green matches, yellow is close, arrows point at the answer."],
            ["03", "Share the grid", "A spoiler-free result and a countdown. The name stays off the share."],
          ].map(([step, title, copy]) => (
            <article key={step} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-display text-2xl text-[var(--accent)]">{step}</p>
              <h2 className="mt-1 font-display text-xl">{title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{copy}</p>
            </article>
          ))}
        </section>

        <section id="pro" className="rounded-2xl border border-white/10 p-4">
          <h2 className="font-display text-3xl">Pro</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Gold badge, archive extras, and a quiet thank-you. The daily board stays free.</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Monthly or yearly. Cancel whenever.</li>
            <li>Leagues and the daily puzzle never require it.</li>
          </ul>
          <div className="mt-4">
            <CheckoutButton />
          </div>
        </section>

        <section id="faq" className="py-8">
          <h2 className="font-display text-3xl">FAQ</h2>
          <div className="mt-3 space-y-2">
            {FAQS.map((item) => (
              <details key={item.q} className="rounded-2xl border border-white/10 px-4 py-3">
                <summary className="cursor-pointer font-medium">{item.q}</summary>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
