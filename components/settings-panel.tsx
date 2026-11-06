"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function SettingsPanel(props: { email: string | null; username: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState(props.username ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveUsername() {
    setError(null);
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Could not save that username.");
      return;
    }
    setMessage("Username saved.");
    router.refresh();
  }

  async function signOut() {
    const supabase = createBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!props.email) {
    return <p className="text-[var(--muted)]">Sign in to set a username or move this device&apos;s games onto an account.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">{props.email}</p>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void saveUsername(); }}>
        <label className="block text-sm" htmlFor="username">Username</label>
        <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-full border border-white/15 bg-transparent px-4 py-3 text-base" />
        <button type="submit" className="press rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F]">Save username</button>
      </form>
      <button type="button" className="block text-sm text-[var(--muted)]" onClick={() => void signOut()}>
        Sign out
      </button>
      {message && <p className="text-sm text-[var(--ok)]">{message}</p>}
      {error && <p className="text-sm text-[var(--bad)]" role="alert">{error}</p>}
    </div>
  );
}
