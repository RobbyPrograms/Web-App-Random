"use client";

import { useEffect, useMemo, useState } from "react";
import { dateFromPuzzleNumber } from "@/lib/dates";
import { listLocalPlays, localStreak } from "@/lib/local-game";
import type { PublicSport } from "@/sports/types";

interface ServerPlay {
  sport: string;
  puzzle_number: number;
  solved: boolean;
  score: number;
  completed_at: string | null;
}

interface ServerStreak {
  sport: string;
  current: number;
  best: number;
}

export function StatsBoard(props: { sports: PublicSport[]; launchDate: string; signedIn: boolean }) {
  const [filter, setFilter] = useState("all");
  const [remote, setRemote] = useState<ServerPlay[]>([]);
  const [remoteStreaks, setRemoteStreaks] = useState<ServerStreak[]>([]);
  const [localVersion, setLocalVersion] = useState(0);

  useEffect(() => {
    setLocalVersion((value) => value + 1);
    if (!props.signedIn) return;
    void fetch("/api/stats")
      .then((response) => response.json())
      .then((payload: { plays?: ServerPlay[]; streaks?: ServerStreak[] }) => {
        setRemote(payload.plays ?? []);
        setRemoteStreaks(payload.streaks ?? []);
      })
      .catch(() => undefined);
  }, [props.signedIn]);

  const plays = useMemo(() => {
    if (props.signedIn && remote.length > 0) {
      return remote
        .filter((play) => play.completed_at)
        .map((play) => ({
          sportId: play.sport,
          puzzleNumber: play.puzzle_number,
          solved: play.solved,
          score: play.score,
        }));
    }
    void localVersion;
    return listLocalPlays()
      .filter((item) => item.play.status !== "playing")
      .map((item) => ({
        sportId: item.sportId,
        puzzleNumber: item.puzzleNumber,
        solved: item.play.status === "won",
        score: item.play.score,
      }));
  }, [localVersion, props.signedIn, remote]);

  const scoped = plays.filter((play) => filter === "all" || play.sportId === filter);
  const wins = scoped.filter((play) => play.solved).length;
  const winRate = scoped.length === 0 ? 0 : Math.round((wins / scoped.length) * 100);
  const buckets = [0, 0, 0, 0, 0, 0];
  let losses = 0;
  for (const play of scoped) {
    if (!play.solved) {
      losses += 1;
      continue;
    }
    const index = 6 - play.score;
    const current = buckets[index];
    if (current != null) buckets[index] = current + 1;
  }
  const streak = props.signedIn
    ? remoteStreaks.find((item) => item.sport === (filter === "all" ? "sweep" : filter))
    : localStreak(filter === "all" ? "sweep" : filter);
  const current = streak && "current" in streak ? streak.current : 0;
  const best = streak && "best" in streak ? streak.best : 0;
  const playedDays = new Set(scoped.map((play) => dateFromPuzzleNumber(props.launchDate, play.puzzleNumber)));

  const cells = [];
  const today = new Date();
  for (let offset = 111; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    cells.push({ iso, on: playedDays.has(iso) });
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="All" />
        {props.sports.map((sport) => (
          <FilterButton key={sport.id} active={filter === sport.id} onClick={() => setFilter(sport.id)} label={`${sport.emoji} ${sport.shortName}`} />
        ))}
      </div>
      {scoped.length === 0 ? (
        <p className="mt-8 text-[var(--muted)]">No finished games yet. Play today and the board fills in.</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Current streak" value={String(current)} />
            <Stat label="Best streak" value={String(best)} />
            <Stat label="Win rate" value={`${winRate}%`} />
            <Stat label="Played" value={String(scoped.length)} />
          </div>
          <h2 className="mt-8 font-display text-2xl">Guess distribution</h2>
          <ul className="mt-3 space-y-2">
            {buckets.map((count, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className="w-4 tabular">{index + 1}</span>
                <div className="h-3 flex-1 rounded bg-white/5">
                  <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${(count / Math.max(1, ...buckets, losses)) * 100}%` }} />
                </div>
                <span className="w-6 text-right tabular">{count}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm">
              <span className="w-4">X</span>
              <div className="h-3 flex-1 rounded bg-white/5">
                <div className="h-full rounded bg-[var(--bad)]" style={{ width: `${(losses / Math.max(1, ...buckets, losses)) * 100}%` }} />
              </div>
              <span className="w-6 text-right tabular">{losses}</span>
            </li>
          </ul>
          <h2 className="mt-8 font-display text-2xl">Calendar</h2>
          <div className="mt-3 grid grid-cols-12 gap-1" aria-label="Play calendar">
            {cells.map((cell) => (
              <span key={cell.iso} title={cell.iso} className={`aspect-square rounded-sm ${cell.on ? "bg-[var(--accent)]" : "bg-white/10"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterButton(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={props.onClick} className={`shrink-0 rounded-full border px-3 py-2 text-sm ${props.active ? "border-[var(--accent)]" : "border-white/10 text-[var(--muted)]"}`}>
      {props.label}
    </button>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--muted)]">{props.label}</p>
      <p className="font-display text-4xl tabular">{props.value}</p>
    </article>
  );
}
