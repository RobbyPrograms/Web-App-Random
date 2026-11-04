"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readAnonId } from "@/lib/local-game";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function AccountMenu(props: { email: string | null }) {
  const [email, setEmail] = useState(props.email);
  useEffect(() => setEmail(props.email), [props.email]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase || !email) return;
    const anonId = readAnonId();
    const marker = `boxed-migrated:${anonId}`;
    if (sessionStorage.getItem(marker)) return;
    void fetch("/api/account/migrate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anonId }),
    }).then((response) => {
      if (response.ok) sessionStorage.setItem(marker, "1");
    });
  }, [email]);

  if (!email) {
    return (
      <Link href="/login" className="rounded-full bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#0A0A0F]">
        Sign in
      </Link>
    );
  }
  return (
    <Link href="/settings" className="max-w-[9rem] truncate text-sm text-[var(--muted)]">
      {email}
    </Link>
  );
}
