"use client";

import { useMemo, useState } from "react";
import type { PublicSport } from "@/sports/types";

export function EmbedBuilder(props: { sports: PublicSport[]; siteUrl: string; defaultSportId: string }) {
  const [sportId, setSportId] = useState(props.defaultSportId);
  const sport = props.sports.find((item) => item.id === sportId) ?? props.sports[0];
  const [accent, setAccent] = useState(sport?.accentColor ?? "#FF5A1F");
  const [copied, setCopied] = useState(false);
  const snippet = useMemo(() => {
    if (!sport) return "";
    const path = sport.id === props.defaultSportId ? "/embed" : `/embed/${sport.id}`;
    const src = `${props.siteUrl}${path}?accent=${encodeURIComponent(accent)}`;
    return `<iframe src="${src}" width="420" height="760" style="border:0;border-radius:24px;background:#0A0A0F" title="BOXED ${sport.shortName}"></iframe>`;
  }, [accent, props.defaultSportId, props.siteUrl, sport]);

  if (!sport) return <p>No sports are enabled.</p>;

  return (
    <div className="space-y-4">
      <label className="block text-sm" htmlFor="embed-sport">Sport</label>
      <select
        id="embed-sport"
        value={sport.id}
        className="w-full rounded-full border border-white/15 bg-[#12121A] px-4 py-3"
        onChange={(event) => {
          const next = props.sports.find((item) => item.id === event.target.value);
          setSportId(event.target.value);
          if (next) setAccent(next.accentColor);
        }}
      >
        {props.sports.map((item) => (
          <option key={item.id} value={item.id}>{item.emoji} {item.name}</option>
        ))}
      </select>
      <label className="block text-sm" htmlFor="embed-accent">Accent</label>
      <input id="embed-accent" type="color" value={accent} onChange={(event) => setAccent(event.target.value)} aria-label="Accent color" />
      <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">{snippet}</pre>
      <button
        type="button"
        className="press rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F]"
        onClick={() => {
          void navigator.clipboard.writeText(snippet).then(() => setCopied(true));
        }}
      >
        {copied ? "Copied" : "Copy embed"}
      </button>
    </div>
  );
}
