"use client";

import { useState } from "react";

export function CheckoutButton() {
  const [message, setMessage] = useState<string | null>(null);

  async function start(plan: "monthly" | "yearly") {
    setMessage(null);
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (response.status === 401) {
      window.location.href = "/login?next=/";
      return;
    }
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setMessage(data.error ?? "Checkout is unavailable.");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="press rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0A0A0F]" onClick={() => void start("monthly")}>
          Monthly
        </button>
        <button type="button" className="rounded-full border border-white/15 px-4 py-2 text-sm" onClick={() => void start("yearly")}>
          Yearly
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
