import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-6xl px-4 pb-10 text-sm text-[var(--muted)]">
      <div className="flex flex-wrap gap-4">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/embed-builder">Embed</Link>
        <Link href="/advertise">Advertise</Link>
      </div>
      <p className="mt-4">Not affiliated with or endorsed by any league, team, or player.</p>
    </footer>
  );
}
