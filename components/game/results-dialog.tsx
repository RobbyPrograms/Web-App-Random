"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCountdown, msUntilNextEasternMidnight } from "@/lib/dates";
import { buildShareText, buildSweepLine } from "@/lib/share";
import { playPath } from "@/lib/sport-path";
import type { PublicSport, Reveal } from "@/sports/types";

interface ResultsDialogProps {
  open: boolean;
  sport: PublicSport;
  sports: readonly PublicSport[];
  defaultSportId: string;
  puzzleNumber: number;
  score: number;
  guessesUsed: number;
  solved: boolean;
  results: boolean[];
  streak: number;
  reveal: Reveal | null;
  sponsorName: string | null;
  nextSport: PublicSport | null;
  shareHost: string;
  sweep: { emojis: string[]; solved: number; total: number } | null;
  onClose: () => void;
}

export function ResultsDialog(props: ResultsDialogProps) {
  const [copied, setCopied] = useState(false);
  const [ms, setMs] = useState(0);
  const [bars, setBars] = useState<{ buckets: number[]; losses: number; total: number } | null>(null);

  useEffect(() => {
    if (!props.open) return;
    setMs(msUntilNextEasternMidnight());
    const timer = window.setInterval(() => setMs(msUntilNextEasternMidnight()), 1000);
    return () => window.clearInterval(timer);
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    void fetch(`/api/distribution?sport=${props.sport.id}&puzzle=${props.puzzleNumber}`)
      .then((response) => response.json())
      .then((payload: { buckets?: number[]; losses?: number; total?: number }) => {
        if (cancelled || !payload.buckets) return;
        setBars({
          buckets: payload.buckets,
          losses: payload.losses ?? 0,
          total: payload.total ?? 0,
        });
      })
      .catch(() => setBars({ buckets: [0, 0, 0, 0, 0, 0], losses: 0, total: 0 }));
    return () => {
      cancelled = true;
    };
  }, [props.open, props.puzzleNumber, props.sport.id]);

  if (!props.open || !props.reveal) return null;

  const share = buildShareText({
    puzzleNumber: props.puzzleNumber,
    emoji: props.sport.emoji,
    results: props.results,
    solved: props.solved,
    streak: props.streak,
    host: props.shareHost,
  });
  const fullShare = props.sweep
    ? `${share}\n${buildSweepLine(props.sweep.emojis, props.sweep.solved, props.sweep.total)}`
    : share;

  async function shareResult() {
    const text = fullShare;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      // Fall through to the clipboard when the sheet is dismissed or unsupported.
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const displayBuckets = bars?.buckets ?? [0, 0, 0, 0, 0, 0];
  const displayLosses = bars?.losses ?? 0;
  const solo = (bars?.total ?? 0) === 0;
  const buckets = solo
    ? displayBuckets.map((count, index) => (props.solved && index + 1 === props.guessesUsed ? 1 : count))
    : displayBuckets;
  const losses = solo && !props.solved ? 1 : displayLosses;
  const maxBar = Math.max(1, ...buckets, losses);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#12121A] p-5 shadow-glow"
      >
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          {props.sport.emoji} BOXED #{props.puzzleNumber}
        </p>
        <h2 id="result-title" className="mt-2 font-display text-4xl font-semibold">
          {props.reveal.name}
        </h2>
        <p className="mt-1 text-[var(--muted)]">{props.reveal.headline}</p>
        <p className="mt-4 font-display text-5xl tabular text-[var(--accent)]">{props.score}</p>
        <p className="text-sm text-[var(--muted)]">
          Score · {props.solved ? `${props.guessesUsed}/6 guesses` : "0 after six misses"} · streak {props.streak}
        </p>
        {props.reveal.facts.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {props.reveal.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        )}
        {props.sponsorName && (
          <p className="mt-4 text-sm text-[var(--muted)]">Today&apos;s puzzle presented by {props.sponsorName}</p>
        )}
        <div className="mt-5 space-y-2" aria-label="Today's score distribution">
          {buckets.map((count, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span className="w-4 tabular">{index + 1}</span>
              <div className="h-3 flex-1 overflow-hidden rounded bg-white/5">
                <div className="h-full bg-[var(--accent)]" style={{ width: `${(count / maxBar) * 100}%` }} />
              </div>
              <span className="w-6 text-right tabular">{count}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-4">X</span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-white/5">
              <div className="h-full bg-[var(--bad)]" style={{ width: `${(losses / maxBar) * 100}%` }} />
            </div>
            <span className="w-6 text-right tabular">{losses}</span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {bars && bars.total > 0
              ? `${bars.total} finished games today.`
              : "Global totals show up once finished games are saved. Your bar is the one you just played."}
          </p>
        </div>
        <p className="mt-4 font-display text-2xl tabular">Next puzzle {formatCountdown(ms)}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" className="press rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F]" onClick={() => void shareResult()}>
            {copied ? "Copied result" : "Share"}
          </button>
          {props.nextSport && (
            <Link
              href={playPath(props.nextSport.id, props.sports, props.defaultSportId)}
              className="rounded-full border border-white/15 px-4 py-3 text-center"
            >
              Play {props.nextSport.shortName} {props.nextSport.emoji}
            </Link>
          )}
          <button type="button" className="rounded-full px-4 py-2 text-sm text-[var(--muted)]" onClick={props.onClose}>
            Back to the board
          </button>
        </div>
        <p className="sr-only">{fullShare}</p>
      </div>
    </div>
  );
}
