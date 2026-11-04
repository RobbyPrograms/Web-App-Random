const EASTERN = "America/New_York";

export function easternDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** Puzzle #1 is launchDate (Eastern calendar). */
export function puzzleNumberFor(launchDate: string, now = new Date()): number {
  return daysBetween(launchDate, easternDateString(now)) + 1;
}

export function dateFromPuzzleNumber(launchDate: string, puzzleNumber: number): string {
  const start = Date.parse(`${launchDate}T00:00:00Z`);
  const next = new Date(start + (puzzleNumber - 1) * 86_400_000);
  return next.toISOString().slice(0, 10);
}

export function msUntilNextEasternMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const second = Number(parts.find((part) => part.type === "second")?.value ?? "0");
  const elapsed = hour * 3600 + minute * 60 + second;
  const remaining = 24 * 3600 - elapsed;
  return remaining * 1000;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
