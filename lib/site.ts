function envValue(name: string): string | undefined {
  return process.env[name];
}

export function siteUrl(): string {
  const raw = envValue("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function shareHost(): string {
  try {
    return new URL(siteUrl()).host;
  } catch {
    return "boxed.app";
  }
}

export function launchDate(): string {
  const value = envValue("LAUNCH_DATE") ?? "2026-01-01";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "2026-01-01";
  return value;
}

export function requireVerified(): boolean {
  return envValue("REQUIRE_VERIFIED") === "true";
}

export function defaultSportId(enabledIds: readonly string[]): string {
  const preferred = envValue("DEFAULT_SPORT")?.trim().toLowerCase();
  if (preferred && enabledIds.includes(preferred)) return preferred;
  return enabledIds[0] ?? "nba";
}
