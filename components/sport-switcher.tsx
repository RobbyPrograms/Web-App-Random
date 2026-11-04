import Link from "next/link";
import { playPath } from "@/lib/sport-path";
import type { PublicSport } from "@/sports/types";

export function SportSwitcher(props: { sports: PublicSport[]; activeId: string; defaultSportId: string }) {
  if (props.sports.length < 2) return null;
  return (
    <nav aria-label="Sports" className="mb-5 flex gap-1 overflow-x-auto md:flex-wrap">
      {props.sports.map((sport) => {
        const active = sport.id === props.activeId;
        return (
          <Link
            key={sport.id}
            href={playPath(sport.id, props.sports, props.defaultSportId)}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm md:rounded-full md:border md:px-4 ${
              active ? "border-[var(--accent)] text-[var(--text)] md:bg-white/5" : "border-transparent text-[var(--muted)]"
            }`}
          >
            <span aria-hidden>{sport.emoji}</span> {sport.shortName}
          </Link>
        );
      })}
    </nav>
  );
}
