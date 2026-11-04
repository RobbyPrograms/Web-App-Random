import { EmbedBuilder } from "@/components/embed-builder";
import { defaultSportId, siteUrl } from "@/lib/site";
import { getEnabledSports } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";

export const dynamic = "force-dynamic";

export default function EmbedBuilderPage() {
  const sports = getEnabledSports().map(toPublicSport);
  const fallback = defaultSportId(sports.map((sport) => sport.id));
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-5xl">Embed today&apos;s puzzle</h1>
      <p className="mt-2 text-[var(--muted)]">A partner frame of the live puzzle. Disabled sports are left out.</p>
      <div className="mt-6">
        <EmbedBuilder sports={sports} siteUrl={siteUrl()} defaultSportId={fallback} />
      </div>
    </div>
  );
}
