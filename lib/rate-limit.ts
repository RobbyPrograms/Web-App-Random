const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
  now = Date.now(),
): { ok: boolean; remaining: number } {
  const current = hits.get(key);
  if (!current || current.reset <= now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (current.count >= limit) return { ok: false, remaining: 0 };
  current.count += 1;
  return { ok: true, remaining: limit - current.count };
}

export function resetRateLimit(): void {
  hits.clear();
}
