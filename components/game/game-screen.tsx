"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Confetti } from "@/components/game/confetti";
import { ResultsDialog } from "@/components/game/results-dialog";
import { fuzzySearch } from "@/lib/fuzzy";
import {
  commitLocalResult,
  localStreak,
  readAnonId,
  readStoredPlay,
  soundEnabled,
  type StoredPlay,
} from "@/lib/local-game";
import type { StreakState } from "@/lib/streaks";
import type { PublicSponsor } from "@/lib/sponsors";
import type { PublicPuzzle, PublicSport, Reveal, RosterEntry } from "@/sports/types";

interface GuessResponse {
  status: "playing" | "won" | "lost";
  score: number;
  guessesUsed: number;
  solved: boolean;
  results: { guess: string; correct: boolean }[];
  clues: { label: string; text: string }[];
  token: string;
  reveal: Reveal | null;
  streak: { current: number; best: number } | null;
  sweep: { solved: number; total: number; current: number } | null;
  error?: string;
}

export interface GameScreenProps {
  sport: PublicSport;
  sports: PublicSport[];
  puzzle: PublicPuzzle;
  roster: RosterEntry[];
  clueLabels: string[];
  sponsor: PublicSponsor | null;
  isPro: boolean;
  signedIn: boolean;
  initialStreak: StreakState;
  defaultSportId: string;
  nextSport: PublicSport | null;
  shareHost: string;
  variant: "full" | "embed" | "hero";
}

function tone(kind: "wrong" | "win") {
  if (!soundEnabled()) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = kind === "win" ? 660 : 180;
  oscillator.type = kind === "win" ? "triangle" : "square";
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + (kind === "win" ? 0.22 : 0.12));
  window.setTimeout(() => void context.close(), 400);
}

function CountUp({ value, display }: { value: number; display: string }) {
  const reduced = useReducedMotion();
  const decimals = display.includes(".") ? (display.split(".")[1]?.length ?? 0) : 0;
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      setShown(value * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [decimals, reduced, value]);
  const done = reduced || Math.abs(shown - value) < 0.05;
  const text = decimals > 0 ? shown.toFixed(decimals) : String(Math.round(shown));
  return <span className="tabular">{done ? display : text}</span>;
}

export function GameScreen(props: GameScreenProps) {
  const reduced = useReducedMotion();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const [clues, setClues] = useState<{ label: string; text: string }[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [score, setScore] = useState(6);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [streak, setStreak] = useState(props.initialStreak);
  const [sweep, setSweep] = useState<{ emojis: string[]; solved: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const hits = useMemo(() => (query.trim().length < 1 ? [] : fuzzySearch(query, props.roster, 6)), [props.roster, query]);

  useEffect(() => {
    const saved = readStoredPlay(props.sport.id, props.puzzle.puzzleNumber);
    const local = localStreak(props.sport.id);
    if (!props.signedIn) setStreak(local);
    if (saved) applyPlay(saved, false);
    if (props.sports.length > 1) {
      const solved = props.sports.filter((sport) => readStoredPlay(sport.id, props.puzzle.puzzleNumber)?.status === "won").length;
      setSweep({ emojis: props.sports.map((sport) => sport.emoji), solved, total: props.sports.length });
    }
    setHydrated(true);
    if (saved && saved.status === "playing" && saved.guesses.length > 0) {
      void postGuesses(saved.guesses, saved.token, true);
    }
    // Replay once on mount for this puzzle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.puzzle.puzzleNumber, props.sport.id]);

  function applyPlay(play: StoredPlay, celebrate: boolean) {
    setGuesses(play.guesses);
    setResults(play.results);
    setClues(play.clues);
    setToken(play.token);
    setStatus(play.status);
    setScore(play.score);
    setReveal(play.reveal);
    if (play.status !== "playing") setShowResult(true);
    if (celebrate && play.status === "won") {
      setConfetti(true);
      tone("win");
    }
    if (celebrate && play.results.at(-1) === false) {
      setShake((value) => value + 1);
      tone("wrong");
    }
  }

  async function postGuesses(nextGuesses: string[], priorToken: string | null, replay: boolean) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/guess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sport: props.sport.id,
          puzzleNumber: props.puzzle.puzzleNumber,
          guesses: nextGuesses,
          token: priorToken ?? undefined,
          anonId: readAnonId(),
        }),
      });
      const payload = (await response.json()) as GuessResponse;
      if (!response.ok) {
        setError(payload.error ?? "That guess didn't land.");
        setBusy(false);
        return;
      }
      const play: StoredPlay = {
        guesses: payload.results.map((result) => result.guess),
        results: payload.results.map((result) => result.correct),
        clues: payload.clues,
        token: payload.token,
        status: payload.status,
        score: payload.score,
        reveal: payload.reveal,
      };
      const committed = commitLocalResult(
        props.sport.id,
        props.puzzle.puzzleNumber,
        play,
        props.sports.map((sport) => sport.id),
      );
      applyPlay(play, !replay);
      if (props.signedIn && payload.streak) {
        setStreak({ ...payload.streak, lastPlayedPuzzle: props.puzzle.puzzleNumber });
      } else if (!props.signedIn) {
        setStreak(committed.streak);
      }
      if (payload.sweep && payload.sweep.total > 1) {
        setSweep({
          emojis: props.sports.map((sport) => sport.emoji),
          solved: payload.sweep.solved,
          total: payload.sweep.total,
        });
      } else if (props.sports.length > 1) {
        setSweep({
          emojis: props.sports.map((sport) => sport.emoji),
          solved: committed.sweepSolved,
          total: props.sports.length,
        });
      }
    } catch {
      setError("The network dropped that guess. Try it again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(name: string) {
    const trimmed = name.trim();
    if (status !== "playing" || busy) return;
    if (trimmed.length < 2) {
      setError("Type a player's name.");
      return;
    }
    if (guesses.some((guess) => guess.toLowerCase() === trimmed.toLowerCase())) {
      setError("You already tried that name.");
      return;
    }
    setQuery("");
    setOpen(false);
    void postGuesses([...guesses, trimmed], token, false);
  }

  const finished = status !== "playing";

  return (
    <section
      className={`relative mx-auto w-full ${props.variant === "hero" ? "max-w-xl" : "max-w-xl"}`}
      style={{ ["--accent" as string]: props.sport.accentColor }}
      aria-busy={!hydrated}
    >
      <Confetti fire={confetti} />
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            {props.sport.emoji} {props.sport.shortName}
          </p>
          {props.variant === "hero" ? (
            <p className="font-display text-4xl font-semibold leading-none sm:text-5xl">
              BOXED <span className="text-[var(--accent)]">#{props.puzzle.puzzleNumber}</span>
            </p>
          ) : (
            <h1 className="font-display text-4xl font-semibold leading-none sm:text-5xl">
              BOXED <span className="text-[var(--accent)]">#{props.puzzle.puzzleNumber}</span>
            </h1>
          )}
        </div>
        <p className="text-right text-sm text-[var(--muted)]">
          <span className="block font-display text-2xl text-[var(--text)] tabular">{streak.current}</span>
          day streak
        </p>
      </div>

      <article className="ticket" aria-label="Season stat line">
        <div className="shimmer" />
        <div className="px-5 pb-4 pt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Anonymous season</p>
          <p className="mt-2 font-display text-3xl tabular">{props.puzzle.seasonYear}</p>
        </div>
        <div className="ticket-perf" />
        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4">
          {props.puzzle.chips.map((chip) => (
            <div key={chip.label}>
              <p className="font-display text-3xl tabular text-[var(--text)]">
                <CountUp value={chip.value} display={chip.display} />
              </p>
              <p className="text-xs uppercase tracking-widest text-[var(--muted)]">{chip.label}</p>
            </div>
          ))}
        </div>
      </article>
      {props.sponsor && (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Today&apos;s puzzle presented by{" "}
          {props.sponsor.url ? (
            <a className="text-[var(--text)] underline" href={props.sponsor.url} rel="noreferrer">
              {props.sponsor.name}
            </a>
          ) : (
            <span className="text-[var(--text)]">{props.sponsor.name}</span>
          )}
          {props.sponsor.tagline ? ` · ${props.sponsor.tagline}` : ""}
        </p>
      )}
      {props.isPro && props.variant === "full" && (
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#FACC15]">Pro · no sponsor slot</p>
      )}

      <ol className="mt-5 grid gap-2" aria-label="Clues">
        {props.clueLabels.map((label, index) => {
          const clue = clues[index];
          return (
            <li key={label} className="min-h-14 [perspective:800px]">
              {clue ? (
                <motion.div
                  initial={reduced ? false : { rotateX: -80, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{clue.label}</p>
                  <p className="font-display text-xl">{clue.text}</p>
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-[var(--muted)]">
                  Clue {index + 1} · {label}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 space-y-2" aria-label="Guesses">
        {guesses.map((guess, index) => (
          <li key={`${guess}-${index}`}>
            <div
              key={index === guesses.length - 1 ? shake : 0}
              className={`rounded-2xl border px-4 py-3 ${results[index] ? "border-[var(--ok)] text-[var(--ok)]" : "border-[var(--bad)]/70"} ${
                index === guesses.length - 1 && shake > 0 && results[index] === false ? "shake" : ""
              }`}
            >
              {guess}
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 z-20 mt-4 border-t border-white/10 bg-[#0A0A0F]/90 py-3 backdrop-blur md:static md:border-0 md:bg-transparent">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const picked = open && hits[active] ? hits[active].name : query;
            submit(picked);
          }}
        >
          <label className="sr-only" htmlFor={`${listId}-input`}>
            Guess the athlete
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id={`${listId}-input`}
                role="combobox"
                aria-expanded={open && hits.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && hits[active] ? `${listId}-opt-${active}` : undefined}
                disabled={finished || busy}
                value={query}
                placeholder={finished ? "Board closed" : "Name the athlete"}
                className="w-full rounded-full border border-white/15 bg-[#12121A] px-4 py-3 text-base outline-none"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                  setActive(0);
                }}
                onKeyDown={(event) => {
                  if (!open || hits.length === 0) return;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActive((value) => (value + 1) % hits.length);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((value) => (value - 1 + hits.length) % hits.length);
                  } else if (event.key === "Escape") {
                    setOpen(false);
                  }
                }}
              />
              {open && hits.length > 0 && !finished && (
                <ul id={listId} role="listbox" className="absolute bottom-14 z-30 max-h-56 w-full overflow-auto rounded-2xl border border-white/10 bg-[#12121A] py-1 shadow-glow md:bottom-auto md:top-14">
                  {hits.map((hit, index) => (
                    <li key={hit.name} role="option" id={`${listId}-opt-${index}`} aria-selected={index === active}>
                      <button
                        type="button"
                        className={`w-full px-4 py-2 text-left ${index === active ? "bg-white/10" : ""}`}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => submit(hit.name)}
                      >
                        {hit.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="submit"
              disabled={finished || busy}
              className="press rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F] disabled:opacity-40"
            >
              Guess
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-2 text-sm text-[var(--bad)]" role="alert">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--muted)]">{Math.max(props.puzzle.maxGuesses - guesses.length, 0)} guesses left</p>
      </div>

      {finished && (
        <button type="button" className="mt-2 text-sm text-[var(--cyan)]" onClick={() => setShowResult(true)}>
          Show result
        </button>
      )}

      <ResultsDialog
        open={showResult}
        sport={props.sport}
        sports={props.sports}
        defaultSportId={props.defaultSportId}
        puzzleNumber={props.puzzle.puzzleNumber}
        score={score}
        guessesUsed={results.length}
        solved={status === "won"}
        results={results}
        streak={streak.current}
        reveal={reveal}
        sponsorName={props.sponsor ? props.sponsor.name : null}
        nextSport={props.variant === "embed" ? null : props.nextSport}
        shareHost={props.shareHost}
        sweep={props.sports.length > 1 ? sweep : null}
        onClose={() => setShowResult(false)}
      />
    </section>
  );
}
