"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicSport } from "@/sports/types";

function IconButton(props: { label: string; onClick?: () => void; href?: string; children: React.ReactNode }) {
  const className = "grid h-9 w-9 place-items-center rounded-full border border-white/10 text-[var(--text)]";
  if (props.href) {
    return (
      <Link href={props.href} aria-label={props.label} className={className}>
        {props.children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={props.label} className={className} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

export function SiteHeader(props: { sports: PublicSport[]; email: string | null }) {
  const [open, setOpen] = useState(false);
  const openModal = (name: "help" | "stats" | "settings") => {
    window.dispatchEvent(new CustomEvent("boxed-open", { detail: name }));
  };
  return (
    <header className="mx-auto flex w-full max-w-[520px] items-center justify-between gap-3 px-4 py-3">
      <Link href="/" className="font-display text-2xl font-semibold tracking-wide">
        BOXED
      </Link>
      <div className="flex items-center gap-1.5">
        <IconButton label="How to play" onClick={() => openModal("help")}>
          <span className="text-sm font-semibold">?</span>
        </IconButton>
        <IconButton label="Stats" onClick={() => openModal("stats")}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20h2V10H4zm7 0h2V4h-2zm7 0h2v-7h-2z" /></svg>
        </IconButton>
        <IconButton label="Settings" onClick={() => openModal("settings")}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 2h-4l-.3 2.9a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1L11 22h4l.3-2.9a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z" /></svg>
        </IconButton>
        <IconButton label="Menu" onClick={() => setOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" /></svg>
        </IconButton>
        {props.email ? (
          <Link href="/settings" aria-label="Account" className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-[#0A0A0F]">
            {props.email.slice(0, 1).toUpperCase()}
          </Link>
        ) : (
          <Link href="/login" className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#0A0A0F]">
            Sign in
          </Link>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
          <nav className="ml-auto flex h-full w-64 flex-col gap-3 bg-[#12121A] p-5 text-sm" onClick={(event) => event.stopPropagation()} aria-label="More">
            <button type="button" className="self-end text-[var(--muted)]" onClick={() => setOpen(false)} aria-label="Close menu">Close</button>
            <Link href="/archive" onClick={() => setOpen(false)}>Archive</Link>
            <Link href="/leagues" onClick={() => setOpen(false)}>Leagues</Link>
            <Link href="/advertise" onClick={() => setOpen(false)}>Advertise</Link>
            <Link href="/stats" onClick={() => setOpen(false)}>Stats page</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
