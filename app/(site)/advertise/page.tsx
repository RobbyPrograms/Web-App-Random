import { AdvertiseForm } from "@/components/advertise-form";
import { getEnabledSports } from "@/sports/registry";

export const dynamic = "force-dynamic";

export default function AdvertisePage() {
  const sports = getEnabledSports();
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-5xl">Advertise on the daily board.</h1>
        <p className="mt-3 text-[var(--muted)]">
          A sponsor slot sits under the stat ticket and again on the result. Reach is everyone who opens that day&apos;s puzzle. Sport targeting puts the slot only on the sports you pick.
        </p>
        <ul className="mt-6 space-y-3">
          {[
            ["$99", "Board week", "One puzzle, one sport or the whole slate, logo and tagline."],
            ["$299", "Sport week", `Seven puzzles on one sport. Live sports: ${sports.map((sport) => sport.shortName).join(", ") || "NBA"}.`],
            ["$799", "Full slate week", "Every enabled sport for seven days. The widest daily placement."],
          ].map(([price, name, copy]) => (
            <li key={name} className="rounded-3xl border border-white/10 p-4">
              <p className="font-display text-3xl">{price} <span className="text-lg text-[var(--muted)]">{name}</span></p>
              <p className="text-sm text-[var(--muted)]">{copy}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-white/10 p-5">
        <h2 className="font-display text-3xl">Tell us the week</h2>
        <div className="mt-4">
          <AdvertiseForm />
        </div>
      </div>
    </div>
  );
}
