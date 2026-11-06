import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 w-full px-4 pb-10 text-sm text-[var(--muted)]">
      <div className="flex flex-wrap gap-4">
        <Link href="/archive">Archive</Link>
        <Link href="/leagues">Leagues</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/embed-builder">Embed</Link>
        <Link href="/advertise">Advertise</Link>
      </div>
      <p className="mt-4">Not affiliated with or endorsed by any league, team, or player.</p>
    </footer>
  );
}
