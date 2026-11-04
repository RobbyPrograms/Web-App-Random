"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm(props: { nextPath: string; configured: boolean }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    setError(null);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Add Supabase keys to turn on sign-in. Play still works without an account.");
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(props.nextPath)}`;
    const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (authError) {
      setError(authError.message);
      return;
    }
    setMessage("Check your email for the sign-in link.");
  }

  async function google() {
    setError(null);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Add Supabase keys to turn on sign-in. Play still works without an account.");
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(props.nextPath)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (authError) setError(authError.message);
  }

  return (
    <div className="space-y-4">
      {!props.configured && (
        <p className="text-sm text-[var(--muted)]">Sign-in needs a Supabase project. Today&apos;s puzzle does not.</p>
      )}
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void sendLink(); }}>
        <label htmlFor="email" className="block text-sm">Email</label>
        <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-full border border-white/15 bg-transparent px-4 py-3 text-base" />
        <button type="submit" className="press w-full rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F]" disabled={!props.configured}>
          Email me a link
        </button>
      </form>
      <button type="button" className="w-full rounded-full border border-white/15 px-4 py-3" onClick={() => void google()} disabled={!props.configured}>
        Continue with Google
      </button>
      {message && <p className="text-sm text-[var(--ok)]">{message}</p>}
      {error && <p className="text-sm text-[var(--bad)]" role="alert">{error}</p>}
    </div>
  );
}
