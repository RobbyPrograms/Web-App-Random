"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicSport } from "@/sports/types";

interface LeagueCard {
  id: string;
  name: string;
  invite_code: string;
  sports: string[];
  owner_id: string;
}

export function LeaguesBoard(props: { sports: PublicSport[]; isPro: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueCard[]>([]);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>(props.sports.map((sport) => sport.id));
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!props.signedIn) {
      setLoaded(true);
      return;
    }
    void fetch("/api/leagues")
      .then((response) => response.json())
      .then((payload: { leagues?: LeagueCard[] }) => setLeagues(payload.leagues ?? []))
      .finally(() => setLoaded(true));
  }, [props.signedIn]);

  async function createLeague() {
    setError(null);
    const response = await fetch("/api/leagues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, sports: picked }),
    });
    const payload = (await response.json()) as { inviteCode?: string; error?: string };
    if (!response.ok || !payload.inviteCode) {
      setError(payload.error ?? "Could not create the league.");
      return;
    }
    router.push(`/leagues/${payload.inviteCode}`);
  }

  async function joinLeague() {
    setError(null);
    const response = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = (await response.json()) as { inviteCode?: string; error?: string };
    if (!response.ok || !payload.inviteCode) {
      setError(payload.error ?? "Could not join.");
      return;
    }
    router.push(`/leagues/${payload.inviteCode}`);
  }

  return (
    <div className="space-y-8">
      {!props.signedIn && <p className="text-[var(--muted)]">Sign in to join a league. Creating one is a Pro perk.</p>}
      <section className="rounded-3xl border border-white/10 p-5">
        <h2 className="font-display text-3xl">Join</h2>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void joinLeague(); }}>
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Invite code" className="flex-1 rounded-full border border-white/15 bg-transparent px-4 py-3 text-base" aria-label="Invite code" />
          <button type="submit" className="press rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F]" disabled={!props.signedIn}>Join</button>
        </form>
      </section>
      <section className="rounded-3xl border border-white/10 p-5">
        <h2 className="font-display text-3xl">Create</h2>
        {props.isPro ? (
          <form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); void createLeague(); }}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="League name" aria-label="League name" className="w-full rounded-full border border-white/15 bg-transparent px-4 py-3 text-base" />
            <div className="flex flex-wrap gap-2">
              {props.sports.map((sport) => {
                const on = picked.includes(sport.id);
                return (
                  <button
                    type="button"
                    key={sport.id}
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-2 text-sm ${on ? "border-[var(--accent)]" : "border-white/15 text-[var(--muted)]"}`}
                    onClick={() => setPicked((current) => on ? current.filter((id) => id !== sport.id) : [...current, sport.id])}
                  >
                    {sport.emoji} {sport.shortName}
                  </button>
                );
              })}
            </div>
            <button type="submit" className="press rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F]">Create league</button>
          </form>
        ) : (
          <p className="mt-2 text-[var(--muted)]">Pro members create leagues. Everyone else can join with a code.</p>
        )}
      </section>
      {error && <p className="text-sm text-[var(--bad)]" role="alert">{error}</p>}
      <section>
        <h2 className="font-display text-3xl">Your leagues</h2>
        {!loaded && <p className="mt-3 text-[var(--muted)]">Loading leagues…</p>}
        {loaded && leagues.length === 0 && <p className="mt-3 text-[var(--muted)]">No leagues yet.</p>}
        <ul className="mt-3 space-y-2">
          {leagues.map((league) => (
            <li key={league.id}>
              <a href={`/leagues/${league.invite_code}`} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <span>{league.name}</span>
                <span className="text-sm text-[var(--muted)]">{league.invite_code}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

interface Member {
  id: string;
  username: string | null;
}

interface PlayRow {
  user_id: string;
  sport: string;
  puzzle_number: number;
  score: number;
  solved: boolean;
}

export function LeagueTable(props: {
  code: string;
  sports: PublicSport[];
}) {
  const [sport, setSport] = useState("all");
  const [range, setRange] = useState<"daily" | "all">("daily");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [plays, setPlays] = useState<PlayRow[]>([]);
  const [today, setToday] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/leagues/${props.code}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          error?: string;
          league?: { name: string };
          today?: number;
          members?: Member[];
          plays?: PlayRow[];
        };
        if (!response.ok) {
          setError(payload.error ?? "Could not open that league.");
          return;
        }
        setName(payload.league?.name ?? "");
        setToday(payload.today ?? 0);
        setMembers(payload.members ?? []);
        setPlays(payload.plays ?? []);
      })
      .catch(() => setError("Could not open that league."));
  }, [props.code]);

  const rows = useMemo(() => {
    return members
      .map((member) => {
        const mine = plays.filter((play) => {
          if (play.user_id !== member.id) return false;
          if (sport !== "all" && play.sport !== sport) return false;
          if (range === "daily" && play.puzzle_number !== today) return false;
          return true;
        });
        const score = mine.reduce((sum, play) => sum + (typeof play.score === "number" ? play.score : 0), 0);
        return { id: member.id, label: member.username ?? "Player", score, played: mine.length };
      })
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }, [members, plays, range, sport, today]);

  if (error) return <p className="text-[var(--bad)]">{error}</p>;
  if (!name) return <p className="text-[var(--muted)]">Loading the board…</p>;

  return (
    <div>
      <h1 className="font-display text-5xl">{name}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Invite code {props.code}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={`rounded-full border px-3 py-2 text-sm ${range === "daily" ? "border-[var(--accent)]" : "border-white/10"}`} onClick={() => setRange("daily")}>Today</button>
        <button type="button" className={`rounded-full border px-3 py-2 text-sm ${range === "all" ? "border-[var(--accent)]" : "border-white/10"}`} onClick={() => setRange("all")}>All time</button>
        <button type="button" className={`rounded-full border px-3 py-2 text-sm ${sport === "all" ? "border-[var(--accent)]" : "border-white/10"}`} onClick={() => setSport("all")}>All sports</button>
        {props.sports.map((item) => (
          <button key={item.id} type="button" className={`rounded-full border px-3 py-2 text-sm ${sport === item.id ? "border-[var(--accent)]" : "border-white/10"}`} onClick={() => setSport(item.id)}>
            {item.emoji} {item.shortName}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-[var(--muted)]">No scores in this filter yet.</p>
      ) : (
        <ol className="mt-6 space-y-2">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span>{index + 1}. {row.label}</span>
              <span className="tabular">{row.played === 0 ? "—" : row.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
