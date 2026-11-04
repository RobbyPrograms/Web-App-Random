import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="font-display text-5xl">That page isn&apos;t in the arena.</h1>
      <p className="mt-3 text-[var(--muted)]">The sport may be turned off, or the link is from a different slate.</p>
      <Link href="/play" className="mt-6 inline-block text-[var(--cyan)]">
        Back to today&apos;s puzzle
      </Link>
    </div>
  );
}
