import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const SPORT_PATH = /^\/(play|embed|archive|r)\/([^/]+)/;

function readEnv(name: "ENABLED_SPORTS" | "DEFAULT_SPORT"): string | undefined {
  if (name === "ENABLED_SPORTS") return process.env["ENABLED_SPORTS"] || process.env.ENABLED_SPORTS;
  return process.env["DEFAULT_SPORT"] || process.env.DEFAULT_SPORT;
}

const REGISTERED_IDS = ["nba", "wnba", "nfl", "mlb", "nhl", "epl"];

function enabledIds(): string[] {
  const raw = readEnv("ENABLED_SPORTS");
  const value = raw == null || raw.trim() === "" || raw.trim().toLowerCase() === "all" ? "all" : raw;
  if (value === "all") return [...REGISTERED_IDS];
  const ids: string[] = [];
  for (const part of value.split(",")) {
    const id = part.trim().toLowerCase();
    if (id && REGISTERED_IDS.includes(id) && !ids.includes(id)) ids.push(id);
  }
  return ids.length > 0 ? ids : ["nba"];
}

function defaultSport(ids: readonly string[]): string {
  const preferred = readEnv("DEFAULT_SPORT")?.trim().toLowerCase();
  if (preferred && ids.includes(preferred)) return preferred;
  return ids[0] ?? "nba";
}

function withSessionCookies(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}

function friendlyMissing(): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Not found · BOXED</title></head><body style="margin:0;background:#0A0A0F;color:#f4f4f5;font-family:Inter,Segoe UI,sans-serif"><main style="max-width:36rem;margin:0 auto;padding:5rem 1rem"><h1 style="font-size:2.75rem;line-height:0.95;letter-spacing:-0.03em">That page isn't in the arena.</h1><p style="color:#a1a1aa">The sport may be turned off, or the link is from a different slate.</p><p><a style="color:#22D3EE" href="/play">Back to today's puzzle</a></p></main></body></html>`;
  return new NextResponse(html, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function middleware(request: NextRequest) {
  const session = await updateSession(request);
  const vanity = request.nextUrl.pathname.match(/^\/(nba|wnba|nfl|mlb|nhl|epl)$/);
  if (vanity) {
    const sport = vanity[1] ?? "";
    const enabled = enabledIds();
    if (!enabled.includes(sport)) return withSessionCookies(session, friendlyMissing());
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("sports", sport);
    return withSessionCookies(session, NextResponse.redirect(url));
  }

  const match = request.nextUrl.pathname.match(SPORT_PATH);
  if (!match) return session;

  const section = match[1] ?? "";
  const sport = decodeURIComponent(match[2] ?? "").toLowerCase();
  const enabled = enabledIds();
  if (!enabled.includes(sport)) {
    return withSessionCookies(session, friendlyMissing());
  }

  const fallback = defaultSport(enabled);
  if (section === "play" && (enabled.length === 1 || sport === fallback)) {
    const url = request.nextUrl.clone();
    url.pathname = "/play";
    return withSessionCookies(session, NextResponse.redirect(url));
  }

  return session;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
