"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { Confetti } from "@/components/game/confetti";
import { msUntilNextEasternMidnight, puzzleNumberFor } from "@/lib/dates";
import { fuzzySearch } from "@/lib/fuzzy";
import {
  commitLocalResult,
  contrastMode,
  hapticsEnabled,
  helpSeen,
  localStreak,
  markHelpSeen,
  motionOverride,
  readAnonId,
  readSportFilter,
  readStoredPlay,
  setContrastMode,
  setHapticsEnabled,
  setMotionOverride,
  setSoundEnabled,
  soundEnabled,
  writeLocalStreak,
  writeSportFilter,
  type StoredPlay,
  type StoredRow,
} from "@/lib/local-game";
import { buildShareGrid, gridPattern } from "@/lib/share";
import { nextStreak } from "@/lib/streaks";
import type { PublicSponsor } from "@/lib/sponsors";
import type { PublicPuzzle, PublicSport, Reveal, RosterEntry } from "@/sports/types";

interface Tile {
  id: string;
  label: string;
  display: string;
  status: "exact" | "close" | "miss";
  direction?: "higher" | "lower";
}

interface GuessResponse {
  status: "playing" | "won" | "lost";
  guessesUsed: number;
  solved: boolean;
  rows: { name: string; tiles: Tile[] }[];
  hints: { team: string | null; letters: string | null };
  token: string;
  reveal: Reveal | null;
  error?: string;
  code?: string;
}

const WINS = [
  "Clean sheet.",
  "That's the one.",
  "Boxed. Nicely done.",
  "You saw it early.",
  "Tape that one up.",
];

const LOSSES = [
  "That one got away.",
  "Six swings, no contact.",
  "Tomorrow's ticket is blank.",
  "Close only counts in horseshoes.",
  "The board wins this one.",
];

function pickLine(lines: string[], seed: number): string {
  return lines[Math.abs(seed) % lines.length] ?? lines[0] ?? "";
}

function describeTile(tile: Tile): string {
  if (tile.status === "exact") return `${tile.label}: exact match`;
  if (tile.id === "height" && tile.direction === "higher") return "Height: close, answer is taller";
  if (tile.id === "height" && tile.direction === "lower") return "Height: close, answer is shorter";
  if (tile.status === "close" && tile.direction === "higher") return `${tile.label}: close, answer is higher`;
  if (tile.status === "close" && tile.direction === "lower") return `${tile.label}: close, answer is lower`;
  if (tile.status === "close") return `${tile.label}: close`;
  if (tile.direction === "higher") return `${tile.label}: no match, answer is higher`;
  if (tile.direction === "lower") return `${tile.label}: no match, answer is lower`;
  return `${tile.label}: no match`;
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

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function Board(props: {
  sport: PublicSport;
  sports: PublicSport[];
  puzzle: PublicPuzzle;
  roster: RosterEntry[];
  sponsor: PublicSponsor | null;
  signedIn: boolean;
  launchDate: string;
  shareHost: string;
  showFilter: boolean;
  filterIds: string[];
}) {
  const router = useRouter();
  const listId = useId();
  const systemReduced = useReducedMotion();
  const [reduce, setReduce] = useState(false);
  const reduced = Boolean(systemReduced) || reduce;
  const [rows, setRows] = useState<StoredRow[]>([]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [hints, setHints] = useState<{ team: string | null; letters: string | null }>({ team: null, letters: null });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [modal, setModal] = useState<"help" | "stats" | "settings" | "results" | null>(null);
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState("");
  const [streak, setStreak] = useState(0);
  const [sound, setSound] = useState(false);
  const [haptics, setHaptics] = useState(false);
  const [contrast, setContrast] = useState<"default" | "high">("default");
  const [flipKey, setFlipKey] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  const storageKey = props.puzzle.modeKey;
  const finished = status !== "playing";
  const suggestions = useMemo(() => {
    if (query.trim().length < 1) return [];
    return fuzzySearch(query, props.roster, 6).map((hit) => {
      const entry = props.roster.find((item) => item.name === hit.name);
      return { name: hit.name, team: entry?.team ?? "", position: entry?.position ?? "" };
    });
  }, [query, props.roster]);

  useEffect(() => {
    setSound(soundEnabled());
    setHaptics(hapticsEnabled());
    const contrastValue = contrastMode();
    const motion = motionOverride();
    setContrast(contrastValue);
    setReduce(motion === "reduce");
    document.documentElement.dataset.contrast = contrastValue;
    document.documentElement.dataset.motion = motion === "reduce" ? "reduce" : "";
    const stored = readStoredPlay(storageKey, props.puzzle.puzzleNumber);
    if (stored) {
      setGuesses(stored.guesses);
      setToken(stored.token);
      setStatus(stored.status);
      setReveal(stored.reveal);
      setRows(stored.rows ?? []);
      setHints(stored.hints ?? { team: null, letters: null });
    }
    setStreak(localStreak("daily").current);
    if (!helpSeen()) setModal("help");
  }, [storageKey, props.puzzle.puzzleNumber]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (name === "help" || name === "stats" || name === "settings") setModal(name);
    };
    window.addEventListener("boxed-open", onOpen);
    return () => window.removeEventListener("boxed-open", onOpen);
  }, []);

  useEffect(() => {
    const tick = () => setClock(formatClock(msUntilNextEasternMidnight()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onFocus = () => {
      if (puzzleNumberFor(props.launchDate) !== props.puzzle.puzzleNumber) router.refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [props.launchDate, props.puzzle.puzzleNumber, router]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty("--kb", `${inset}px`);
    };
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, []);

  function persist(next: StoredPlay) {
    const committed = commitLocalResult(storageKey, props.puzzle.puzzleNumber, next, props.sports.map((sport) => sport.id));
    if (next.status !== "playing" && next.puzzleSport) {
      const daily = nextStreak(localStreak("daily"), props.puzzle.puzzleNumber, true);
      writeLocalStreak("daily", daily);
      setStreak(daily.current);
      writeLocalStreak(storageKey, committed.streak);
    } else {
      setStreak(localStreak("daily").current);
    }
  }

  function flash(message: string) {
    setToast(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
    window.setTimeout(() => setToast(null), 1800);
    if (hapticsEnabled() && navigator.vibrate) navigator.vibrate(12);
    tone("wrong");
  }

  async function submit(name: string) {
    const trimmed = name.trim();
    if (!trimmed || finished) return;
    const known = props.roster.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase() || entry.aliases.some((alias) => alias.toLowerCase() === trimmed.toLowerCase()));
    if (!known) {
      flash("Not in the list");
      return;
    }
    if (guesses.some((guess) => guess.toLowerCase() === known.name.toLowerCase())) {
      flash("Already guessed");
      return;
    }
    const nextGuesses = [...guesses, known.name];
    const response = await fetch("/api/guess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sport: props.puzzle.sportId,
        sports: props.filterIds,
        puzzleNumber: props.puzzle.puzzleNumber,
        guesses: nextGuesses,
        ...(token ? { token } : {}),
        anonId: readAnonId(),
      }),
    });
    const data = (await response.json()) as GuessResponse;
    if (!response.ok) {
      flash(data.code === "unknown" ? "Not in the list" : data.error ?? "Already guessed");
      return;
    }
    setGuesses(nextGuesses);
    setRows(data.rows);
    setHints(data.hints);
    setToken(data.token);
    setStatus(data.status);
    setReveal(data.reveal);
    setQuery("");
    setOpen(false);
    setFlipKey((value) => value + 1);
    const play: StoredPlay = {
      guesses: nextGuesses,
      results: data.rows.map((row) => row.tiles.every((tile) => tile.status === "exact")),
      clues: [],
      token: data.token,
      status: data.status,
      score: data.guessesUsed,
      reveal: data.reveal,
      rows: data.rows,
      hints: data.hints,
      puzzleSport: props.puzzle.sportId,
    };
    persist(play);
    if (hapticsEnabled() && navigator.vibrate) navigator.vibrate(8);
    if (data.status === "won") tone("win");
    if (data.status !== "playing") {
      const wait = reduced ? 200 : data.rows[data.rows.length - 1]!.tiles.length * 250 + 280;
      window.setTimeout(() => setModal("results"), wait);
    }
    window.setTimeout(() => activeRowRef.current?.scrollIntoView({ block: "nearest" }), 50);
  }

  function toggleSport(id: string) {
    const current = props.filterIds;
    const exists = current.includes(id);
    const next = exists ? current.filter((item) => item !== id) : [...current, id];
    if (next.length === 0) return;
    writeSportFilter(next);
    router.push(`/?sports=${[...next].sort().join(",")}`);
  }

  function selectAll() {
    const next = props.sports.map((sport) => sport.id);
    writeSportFilter(next);
    router.push(`/?sports=${next.join(",")}`);
  }

  const shareRows = rows.map((row) => row.tiles.map((tile) => tile.status));
  const shareText = buildShareGrid({
    puzzleNumber: props.puzzle.puzzleNumber,
    emoji: props.sport.emoji,
    modeLabel: props.puzzle.modeLabel,
    rows: shareRows,
    solved: status === "won",
    streak,
    host: props.shareHost,
  });

  async function share() {
    const pattern = gridPattern(shareRows);
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        /* clipboard fallback */
      }
    }
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
    void pattern;
  }

  const allOn = props.filterIds.length === props.sports.length;
  const activeIndex = Math.min(rows.length, 5);

  return (
    <div className="relative mx-auto w-full max-w-[520px] px-4 pb-28" style={{ ["--accent" as string]: props.sport.accentColor }}>
      <Confetti fire={status === "won" && modal === "results"} />
      {toast && (
        <p role="status" className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#0A0A0F]">
          {toast}
        </p>
      )}

      {props.showFilter && (
        <div className="sport-scroll mb-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Sports">
          <button type="button" aria-pressed={allOn} onClick={selectAll} className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${allOn ? "bg-white text-[#0A0A0F]" : "border border-white/15"}`}>
            All
          </button>
          {props.sports.map((sport) => {
            const on = props.filterIds.includes(sport.id);
            return (
              <button
                key={sport.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSport(sport.id)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${on ? "bg-white text-[#0A0A0F]" : "border border-white/15"}`}
              >
                {sport.emoji} {sport.shortName}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-3 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl leading-none">BOXED #{props.puzzle.puzzleNumber}</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{props.puzzle.modeLabel}</p>
        </div>
        <p className="flex items-center gap-1 text-sm" aria-label={`${streak} day streak`}>
          <Flame /> {streak}
        </p>
      </div>

      <article className="ticket px-6 py-4" aria-label={`${props.sport.name} season ticket`}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-display text-xl tracking-wide">{props.puzzle.seasonYear}</span>
          <span className="rounded-full border border-white/15 px-2 py-1 text-xs">{props.sport.emoji} {props.sport.shortName}</span>
        </div>
        <div className="ticket-perf my-3" />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(props.puzzle.chips.length, 1)}, minmax(0, 1fr))` }}>
          {props.puzzle.chips.map((chip) => (
            <div key={chip.label} className="min-w-0 text-center">
              <p className="truncate font-display text-2xl leading-none tabular">{chip.display}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">{chip.label}</p>
            </div>
          ))}
        </div>
      </article>

      {(hints.team || hints.letters) && (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" aria-live="polite">
          Hint{hints.team && hints.letters ? "s" : ""}: {hints.team ? `Team ${hints.team}` : ""}{hints.team && hints.letters ? " · " : ""}{hints.letters ? `Name ${hints.letters}` : ""}
        </p>
      )}

      <div className="mt-3 grid grid-cols-6 gap-1 px-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]" aria-hidden="true">
        {props.puzzle.columns.map((column) => (
          <span key={column.id} className="truncate">{column.shortLabel}</span>
        ))}
      </div>

      <div className="mt-1 space-y-2" aria-label="Guesses">
        {Array.from({ length: 6 }, (_, index) => {
          const row = rows[index];
          const waiting = !row && index === rows.length && !finished;
          return (
            <div key={index} ref={waiting ? activeRowRef : undefined} className={`scroll-mb-28 ${waiting ? "active-row" : ""}`}>
              {row ? (
                <GuessRowView row={row} animate={index === rows.length - 1} reduced={reduced} flipKey={flipKey} bounce={status === "won" && index === rows.length - 1} />
              ) : (
                <div className={`grid grid-cols-6 gap-1 ${waiting ? "opacity-100" : "opacity-50"}`} aria-hidden="true">
                  {props.puzzle.columns.map((column) => (
                    <div key={column.id} className="aspect-square rounded-md border border-white/25" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <span className="sr-only">Row {activeIndex + 1} of 6</span>

      <p className="mt-3 text-center text-xs text-[var(--muted)]">
        <span className="tile-swatch tile-exact mr-1 inline-block h-2.5 w-2.5 align-middle" /> match
        <span className="tile-swatch tile-close mx-1 ml-3 inline-block h-2.5 w-2.5 align-middle" /> close
        <span className="ml-3">▲▼ answer is higher or lower</span>
      </p>

      {finished && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <span>Next BOXED in {clock}</span>
          <button type="button" className="font-semibold text-[var(--cyan)]" onClick={() => setModal("results")}>View results</button>
        </div>
      )}

      <form
        className={`guess-dock sticky bottom-0 z-20 -mx-4 mt-4 border-t border-white/10 bg-[#0A0A0F]/95 px-4 py-3 backdrop-blur ${shake ? "shake" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          const pick = suggestions[active];
          void submit(pick?.name ?? query);
        }}
      >
        <div className="relative">
          {open && suggestions.length > 0 && (
            <ul id={listId} role="listbox" className="absolute bottom-full z-30 mb-2 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-[#12121A] py-1 shadow-xl">
              {suggestions.map((entry, index) => (
                <li key={entry.name} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${index === active ? "bg-white/10" : ""}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      void submit(entry.name);
                    }}
                  >
                    <span className="truncate font-medium">{entry.name}</span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">{entry.team} · {entry.position}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={inputRef}
            value={query}
            disabled={finished}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder={finished ? "Board locked" : "Guess a player"}
            className="w-full rounded-xl border border-white/15 bg-[#12121A] px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:opacity-60"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => {
              setOpen(true);
              activeRowRef.current?.scrollIntoView({ block: "center" });
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((value) => Math.min(suggestions.length - 1, value + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((value) => Math.max(0, value - 1));
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </div>
      </form>

      {props.sponsor && (
        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          {props.sponsor.url ? <a href={props.sponsor.url}>{props.sponsor.name}</a> : props.sponsor.name}
          {props.sponsor.tagline ? ` · ${props.sponsor.tagline}` : ""}
        </p>
      )}

      {modal === "help" && <HelpModal reduced={reduced} onClose={() => { markHelpSeen(); setModal(null); }} />}
      {modal === "stats" && (
        <StatsModal
          modeKey={storageKey}
          puzzleNumber={props.puzzle.puzzleNumber}
          clock={clock}
          sports={props.sports}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "settings" && (
        <SettingsModal
          sound={sound}
          haptics={haptics}
          contrast={contrast}
          reduce={reduce}
          sports={props.sports}
          showFilter={props.showFilter}
          onSound={(on) => { setSoundEnabled(on); setSound(on); }}
          onHaptics={(on) => { setHapticsEnabled(on); setHaptics(on); }}
          onContrast={(mode) => { setContrastMode(mode); setContrast(mode); document.documentElement.dataset.contrast = mode; }}
          onReduce={(on) => { setMotionOverride(on ? "reduce" : "system"); setReduce(on); document.documentElement.dataset.motion = on ? "reduce" : ""; }}
          onSport={(id) => { writeSportFilter([id]); router.push(`/?sports=${id}`); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "results" && finished && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="results-title">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121A] p-5">
            <h2 id="results-title" className="font-display text-3xl">{status === "won" ? pickLine(WINS, props.puzzle.puzzleNumber + rows.length) : pickLine(LOSSES, props.puzzle.puzzleNumber)}</h2>
            {reveal && (
              <>
                <p className="mt-2 text-lg">{reveal.name}</p>
                <p className="text-sm text-[var(--muted)]">{reveal.headline}</p>
              </>
            )}
            <p className="mt-3 text-sm">{status === "won" ? `${rows.length}/6` : "X/6"} · {streak}-day streak</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Next BOXED in {clock}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="press flex-1 rounded-full bg-[var(--accent)] py-2 font-semibold text-[#0A0A0F]" onClick={() => void share()}>
                {copied ? "Copied" : "Share"}
              </button>
              <button type="button" className="rounded-full border border-white/15 px-4 py-2" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuessRowView(props: { row: StoredRow; animate: boolean; reduced: boolean; flipKey: number; bounce: boolean }) {
  const [tip, setTip] = useState<number | null>(null);
  return (
    <div className={props.bounce && !props.reduced ? "win-bounce" : ""}>
      <p className="mb-1 truncate text-left text-xs text-[var(--muted)]">{props.row.name}</p>
      <div className="grid grid-cols-6 gap-1">
        {props.row.tiles.map((tile, index) => (
          <button
            key={`${tile.id}-${props.flipKey}`}
            type="button"
            className={`tile tile-${tile.status} relative aspect-square min-w-0 rounded-md px-0.5 text-[13px] font-semibold leading-tight ${props.animate && !props.reduced ? "tile-flip" : ""} ${props.animate && props.reduced ? "tile-fade" : ""}`}
            style={{ animationDelay: props.animate ? `${index * 250}ms` : "0ms" }}
            aria-label={describeTile(tile)}
            onClick={() => setTip(tip === index ? null : index)}
          >
            <span className="block truncate">{tile.display}</span>
            {tile.direction && <span className="absolute right-0.5 top-0.5 text-[9px] text-[#F4F4F5]" aria-hidden="true">{tile.direction === "higher" ? "▲" : "▼"}</span>}
            {tip === index && <span className="absolute -top-8 left-1/2 z-10 w-max max-w-[10rem] -translate-x-1/2 rounded bg-white px-2 py-1 text-[10px] font-medium text-[#0A0A0F]">{describeTile(tile)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function HelpModal(props: { reduced: boolean; onClose: () => void }) {
  const samples: Tile[] = [
    { id: "team", label: "Team", display: "LAL", status: "exact" },
    { id: "position", label: "Position", display: "G", status: "close" },
    { id: "height", label: "Height", display: "6-6", status: "miss", direction: "higher" },
    { id: "draft", label: "Draft", display: "2003", status: "exact" },
    { id: "origin", label: "From", display: "USA", status: "close" },
    { id: "jersey", label: "Jersey", display: "23", status: "miss" },
  ];
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/70 px-4 pb-8 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121A] p-5">
        <h2 id="help-title" className="font-display text-3xl">How to play</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Name the athlete behind the ticket. Each guess flips a tile per column.</p>
        <div className="mt-4">
          <GuessRowView row={{ name: "Example", tiles: samples }} animate={!props.reduced} reduced={props.reduced} flipKey={1} bounce={false} />
        </div>
        <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          <li>Green is an exact match.</li>
          <li>Yellow is close. Arrows say if the answer is higher or lower.</li>
          <li>Gray is no match. Six guesses. Hints sit above the board.</li>
        </ul>
        <button type="button" className="press mt-4 w-full rounded-full bg-white py-2 font-semibold text-[#0A0A0F]" onClick={props.onClose}>Play</button>
      </div>
    </div>
  );
}

function StatsModal(props: { modeKey: string; puzzleNumber: number; clock: string; sports: PublicSport[]; onClose: () => void }) {
  const [played, setPlayed] = useState(0);
  const [wins, setWins] = useState(0);
  const [current, setCurrent] = useState(0);
  const [best, setBest] = useState(0);
  const [dist, setDist] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [today, setToday] = useState<number | null>(null);
  const [rates, setRates] = useState<{ id: string; name: string; played: number; wins: number }[]>([]);

  useEffect(() => {
    const plays = Object.keys(localStorage)
      .filter((key) => key.startsWith("boxed-v1:"))
      .map((key) => {
        try {
          return JSON.parse(localStorage.getItem(key) ?? "") as StoredPlay;
        } catch {
          return null;
        }
      })
      .filter((play): play is StoredPlay => Boolean(play && (play.status === "won" || play.status === "lost")));
    const modePlays = Object.keys(localStorage)
      .filter((key) => key.startsWith(`boxed-v1:${props.modeKey}:`))
      .map((key) => {
        const puzzle = Number(key.split(":").at(-1));
        try {
          const play = JSON.parse(localStorage.getItem(key) ?? "") as StoredPlay;
          return { puzzle, play };
        } catch {
          return null;
        }
      })
      .filter((item): item is { puzzle: number; play: StoredPlay } => Boolean(item && (item.play.status === "won" || item.play.status === "lost")));
    const histogram = [0, 0, 0, 0, 0, 0];
    let modeWins = 0;
    for (const item of modePlays) {
      if (item.play.status === "won") {
        modeWins += 1;
        const slot = Math.min(6, Math.max(1, item.play.guesses.length)) - 1;
        histogram[slot] = (histogram[slot] ?? 0) + 1;
        if (item.puzzle === props.puzzleNumber) setToday(slot);
      }
    }
    setPlayed(modePlays.length);
    setWins(modeWins);
    setDist(histogram);
    const daily = localStreak("daily");
    setCurrent(daily.current);
    setBest(daily.best);
    const bySport = new Map<string, { played: number; wins: number }>();
    for (const play of plays) {
      const id = play.puzzleSport;
      if (!id) continue;
      const bucket = bySport.get(id) ?? { played: 0, wins: 0 };
      bucket.played += 1;
      if (play.status === "won") bucket.wins += 1;
      bySport.set(id, bucket);
    }
    setRates(props.sports.map((sport) => ({ id: sport.id, name: sport.shortName, played: bySport.get(sport.id)?.played ?? 0, wins: bySport.get(sport.id)?.wins ?? 0 })));
  }, [props.modeKey, props.puzzleNumber, props.sports]);

  const max = Math.max(1, ...dist);
  const winPct = played === 0 ? 0 : Math.round((wins / played) * 100);

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/70 px-4 pb-8 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="stats-title">
      <div className="max-h-[85vh] w-full max-w-sm overflow-auto rounded-2xl border border-white/10 bg-[#12121A] p-5">
        <h2 id="stats-title" className="font-display text-3xl">Stats</h2>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
          <Stat n={played} label="Played" />
          <Stat n={winPct} label="Win %" />
          <Stat n={current} label="Streak" />
          <Stat n={best} label="Best" />
        </div>
        <div className="mt-4 space-y-1">
          {dist.map((count, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span className="w-3">{index + 1}</span>
              <div className={`h-5 rounded-sm ${today === index ? "bg-[var(--accent)]" : "bg-white/15"}`} style={{ width: `${Math.max(8, (count / max) * 100)}%` }} />
              <span>{count}</span>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-1 text-sm text-[var(--muted)]">
          {rates.map((rate) => (
            <li key={rate.id}>{rate.name} {rate.played === 0 ? "—" : `${Math.round((rate.wins / rate.played) * 100)}%`}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">Next BOXED in {props.clock}</p>
        <button type="button" className="mt-4 w-full rounded-full border border-white/15 py-2" onClick={props.onClose}>Close</button>
      </div>
    </div>
  );
}

function Stat(props: { n: number; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl">{props.n}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{props.label}</p>
    </div>
  );
}

function SettingsModal(props: {
  sound: boolean;
  haptics: boolean;
  contrast: "default" | "high";
  reduce: boolean;
  sports: PublicSport[];
  showFilter: boolean;
  onSound: (on: boolean) => void;
  onHaptics: (on: boolean) => void;
  onContrast: (mode: "default" | "high") => void;
  onReduce: (on: boolean) => void;
  onSport: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/70 px-4 pb-8 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121A] p-5">
        <h2 id="settings-title" className="font-display text-3xl">Settings</h2>
        <label className="mt-4 flex items-center justify-between text-sm"><span>Sound</span><input type="checkbox" checked={props.sound} onChange={(event) => props.onSound(event.target.checked)} /></label>
        <label className="mt-3 flex items-center justify-between text-sm"><span>Haptics</span><input type="checkbox" checked={props.haptics} onChange={(event) => props.onHaptics(event.target.checked)} /></label>
        <label className="mt-3 flex items-center justify-between text-sm"><span>Color-blind palette</span><input type="checkbox" checked={props.contrast === "high"} onChange={(event) => props.onContrast(event.target.checked ? "high" : "default")} /></label>
        <label className="mt-3 flex items-center justify-between text-sm"><span>Reduce motion</span><input type="checkbox" checked={props.reduce} onChange={(event) => props.onReduce(event.target.checked)} /></label>
        {props.showFilter && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Jump to a sport</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {props.sports.map((sport) => (
                <button key={sport.id} type="button" className="rounded-full border border-white/15 px-3 py-1 text-sm" onClick={() => props.onSport(sport.id)}>
                  {sport.shortName}
                </button>
              ))}
            </div>
          </div>
        )}
        <button type="button" className="mt-4 w-full rounded-full border border-white/15 py-2" onClick={props.onClose}>Close</button>
      </div>
    </div>
  );
}

function Flame() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="text-[var(--accent)]">
      <path fill="currentColor" d="M12 2s2 4 2 6-2 3-2 3 3 1 3 4-2 7-5 7-6-3-6-7 4-8 4-8 1 3 2 3-1-5 2-8z" />
    </svg>
  );
}

export function syncStoredFilter(enabledIds: readonly string[], urlSports: string | null) {
  if (urlSports) return;
  const stored = readSportFilter().filter((id) => enabledIds.includes(id));
  if (stored.length === 0) return;
  writeSportFilter(stored);
}
