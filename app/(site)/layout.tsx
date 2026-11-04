import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { viewer } from "@/lib/viewer";
import { getEnabledSports } from "@/sports/registry";
import { toPublicSport } from "@/sports/types";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const sports = getEnabledSports().map(toPublicSport);
  const accent = sports.length === 1 ? sports[0]?.accentColor ?? "#FF5A1F" : "#FF5A1F";
  const who = await viewer();
  return (
    <div style={{ ["--accent" as string]: accent }}>
      <SiteHeader sports={sports} email={who.email} isPro={who.isPro} />
      <main id="content">{children}</main>
      <SiteFooter />
    </div>
  );
}
