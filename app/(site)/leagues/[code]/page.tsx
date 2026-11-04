import { LeagueTable } from "@/components/leagues-board";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const who = await viewer();
  const { code } = await params;
  if (!who.userId) redirect(`/login?next=/leagues/${code}`);
  const sports = getEnabledSports().map(toPublicSport);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LeagueTable code={code.toUpperCase()} sports={sports} />
    </div>
  );
}
