"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CheckoutButton(props: { plan: "monthly" | "yearly"; label: string; signedIn: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!props.signedIn) {
      router.push("/login?next=/settings");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: props.plan }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Checkout is unavailable.");
        setBusy(false);
        return;
      }
      window.location.href = payload.url;
    } catch {
      setError("Checkout is unavailable.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="press w-full rounded-full bg-[var(--accent)] px-4 py-3 font-semibold text-[#0A0A0F] disabled:opacity-50" disabled={busy} onClick={() => void start()}>
        {busy ? "Opening checkout" : props.label}
      </button>
      {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
    </div>
  );
}
