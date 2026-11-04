"use client";

import { useState } from "react";

export function AdvertiseForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [tier, setTier] = useState("Sport week · $299");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/sponsor-lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        company,
        message: `${tier}. ${note}`.trim(),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Could not send that note.");
      return;
    }
    setMessage("Got it. We'll reply about the week you want.");
    setNote("");
  }

  return (
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label className="block text-sm" htmlFor="lead-name">Name</label>
      <input id="lead-name" required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-full border border-white/15 bg-transparent px-4 py-3 text-base" />
      <label className="block text-sm" htmlFor="lead-email">Email</label>
      <input id="lead-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-full border border-white/15 bg-transparent px-4 py-3 text-base" />
      <label className="block text-sm" htmlFor="lead-company">Company</label>
      <input id="lead-company" value={company} onChange={(event) => setCompany(event.target.value)} className="w-full rounded-full border border-white/15 bg-transparent px-4 py-3 text-base" />
      <label className="block text-sm" htmlFor="lead-tier">Tier</label>
      <select id="lead-tier" value={tier} onChange={(event) => setTier(event.target.value)} className="w-full rounded-full border border-white/15 bg-[#12121A] px-4 py-3 text-base">
        <option>Board week · $99</option>
        <option>Sport week · $299</option>
        <option>Full slate week · $799</option>
      </select>
      <label className="block text-sm" htmlFor="lead-note">Note</label>
      <textarea id="lead-note" required minLength={10} value={note} onChange={(event) => setNote(event.target.value)} className="min-h-28 w-full rounded-3xl border border-white/15 bg-transparent px-4 py-3 text-base" />
      <button type="submit" className="press rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F]">Send</button>
      {message && <p className="text-sm text-[var(--ok)]">{message}</p>}
      {error && <p className="text-sm text-[var(--bad)]" role="alert">{error}</p>}
    </form>
  );
}
