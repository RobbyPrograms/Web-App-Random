export interface FuzzyCandidate {
  name: string;
  aliases?: readonly string[];
}

export interface FuzzyHit {
  name: string;
  score: number;
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) row[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let previous = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const inserted = current + 1;
      const deleted = (row[j - 1] ?? 0) + 1;
      const replaced = previous + cost;
      previous = current;
      row[j] = Math.min(inserted, deleted, replaced);
    }
  }
  return row[b.length] ?? 0;
}

function scoreLabel(query: string, label: string): number {
  if (!query || !label) return 0;
  if (query === label) return 100;
  if (label.startsWith(query)) return 92;
  if (label.includes(query)) return 80;
  const tokens = label.split(" ");
  let best = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (token === query) best = Math.max(best, 96);
    else if (token.startsWith(query) && query.length >= 2) best = Math.max(best, 88);
    else {
      const distance = levenshtein(query, token);
      const limit = token.length >= 8 ? 2 : token.length >= 5 ? 1 : 0;
      if (distance > 0 && distance <= limit) {
        best = Math.max(best, 70 - distance * 8);
      }
    }
  }
  const fullDistance = levenshtein(query, label);
  if (label.length >= 6 && fullDistance > 0 && fullDistance <= 2) {
    best = Math.max(best, 64 - fullDistance * 6);
  }
  return best;
}

/** Rank roster names and aliases. Typo-tolerant and accent-insensitive. */
export function fuzzySearch(
  query: string,
  candidates: readonly FuzzyCandidate[],
  limit = 8,
): FuzzyHit[] {
  const normalized = normalizeText(query);
  if (normalized.length < 1) return [];
  const hits: FuzzyHit[] = [];
  for (const candidate of candidates) {
    const labels = [candidate.name, ...(candidate.aliases ?? [])];
    let best = 0;
    for (const label of labels) {
      best = Math.max(best, scoreLabel(normalized, normalizeText(label)));
    }
    if (best >= 60) hits.push({ name: candidate.name, score: best });
  }
  hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const seen = new Set<string>();
  const unique: FuzzyHit[] = [];
  for (const hit of hits) {
    if (seen.has(hit.name)) continue;
    seen.add(hit.name);
    unique.push(hit);
    if (unique.length >= limit) break;
  }
  return unique;
}

/** Exact match after normalization. Used to judge a guess, not to suggest one. */
export function namesMatch(guess: string, candidate: string): boolean {
  const left = normalizeText(guess);
  const right = normalizeText(candidate);
  return left.length > 0 && left === right;
}
