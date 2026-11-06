import { notFound, redirect } from "next/navigation";
import { getEnabledSports, getSportById } from "@/sports/registry";

export const dynamic = "force-dynamic";

export default async function SportPlayPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport: sportId } = await params;
  const known = getSportById(sportId);
  const enabled = getEnabledSports();
  if (!known || !enabled.some((sport) => sport.id === known.id)) notFound();
  redirect(`/?sports=${known.id}`);
}
