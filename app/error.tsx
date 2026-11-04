"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="font-display text-5xl">The arena hit a snag.</h1>
      <p className="mt-3 text-[var(--muted)]">The puzzle is still there. Try the board again.</p>
      <button type="button" className="press mt-6 rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-[#0A0A0F]" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
