import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { SoundToggle } from "@/components/sound-toggle";
import type { PublicSport } from "@/sports/types";

export function SiteHeader(props: {
  sports: PublicSport[];
  email: string | null;
  isPro: boolean;
}) {
  const brand = props.sports.length === 1 ? props.sports[0] : null;
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
      <Link href="/" className="font-display text-3xl font-semibold tracking-wide">
        {brand ? `${brand.emoji} ` : ""}BOXED
      </Link>
      <nav aria-label="Primary" className="hidden items-center gap-4 text-sm md:flex">
        <Link href="/play">Play</Link>
        <Link href="/stats">Stats</Link>
        <Link href="/archive">Archive</Link>
        <Link href="/leagues">Leagues</Link>
        <Link href="/advertise">Advertise</Link>
      </nav>
      <div className="flex items-center gap-2">
        {props.isPro && <span className="rounded-full border border-[#FACC15] px-2 py-1 text-[10px] uppercase tracking-widest text-[#FACC15]">Pro</span>}
        <SoundToggle />
        <AccountMenu email={props.email} />
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-full border border-white/15 px-3 py-2 text-sm">Menu</summary>
          <div className="absolute right-0 z-30 mt-2 w-44 rounded-2xl border border-white/10 bg-[#12121A] p-3 text-sm">
            <Link className="block py-2" href="/play">Play</Link>
            <Link className="block py-2" href="/stats">Stats</Link>
            <Link className="block py-2" href="/archive">Archive</Link>
            <Link className="block py-2" href="/leagues">Leagues</Link>
            <Link className="block py-2" href="/advertise">Advertise</Link>
          </div>
        </details>
      </div>
    </header>
  );
}
