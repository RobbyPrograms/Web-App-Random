"use client";

import { useEffect, useState } from "react";
import { setSoundEnabled, soundEnabled } from "@/lib/local-game";

export function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(soundEnabled()), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      className="rounded-full border border-white/15 px-3 py-2 text-xs"
      onClick={() => {
        const next = !on;
        setSoundEnabled(next);
        setOn(next);
      }}
    >
      {on ? "Sound on" : "Sound off"}
    </button>
  );
}
