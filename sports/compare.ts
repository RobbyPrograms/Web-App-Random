import type { Athlete, ColumnDef, CompareResult } from "./types";

export function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function positionsOf(raw: string): string[] {
  return raw
    .toUpperCase()
    .split(/[/,&\- ]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function positionCompare(guess: string, answer: string, groups: Record<string, string[]>): CompareResult {
  const guessParts = positionsOf(guess);
  const answerParts = positionsOf(answer);
  if (guessParts.some((part) => answerParts.includes(part))) return { status: "exact" };
  const groupOf = (part: string) => Object.entries(groups).find(([, members]) => members.includes(part))?.[0];
  const guessGroups = new Set(guessParts.map(groupOf).filter((group): group is string => Boolean(group)));
  const answerGroups = new Set(answerParts.map(groupOf).filter((group): group is string => Boolean(group)));
  for (const group of guessGroups) {
    if (answerGroups.has(group)) return { status: "close" };
  }
  return { status: "miss" };
}

export function numericCompare(guess: number | null, answer: number | null, within: number): CompareResult {
  if (guess == null || answer == null) {
    if (guess == null && answer == null) return { status: "exact" };
    return { status: "miss" };
  }
  if (guess === answer) return { status: "exact" };
  const direction = answer > guess ? "higher" : "lower";
  if (Math.abs(guess - answer) <= within) return { status: "close", direction };
  return { status: "miss", direction };
}

export function formatHeight(value: string | number | null): string {
  if (typeof value !== "number") return "—";
  const feet = Math.floor(value / 12);
  const inches = value % 12;
  return `${feet}'${inches}"`;
}

export function formatYear(value: string | number | null): string {
  if (typeof value !== "number") return "UD";
  return String(value);
}

export function formatJersey(value: string | number | null): string {
  if (typeof value !== "number") return "—";
  return `#${value}`;
}

export function formatText(value: string | number | null): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function teamsOf(athlete: Athlete): string[] {
  const names = new Set<string>();
  for (const season of athlete.seasons) names.add(normalizeToken(season.team));
  for (const stop of athlete.teamHistory) names.add(normalizeToken(stop.team));
  return [...names];
}

export function teamInYear(athlete: Athlete, year: string): string {
  return athlete.seasons.find((season) => season.year === year)?.team ?? athlete.seasons.at(-1)?.team ?? "";
}

export function teamColumn(label = "Team", shortLabel = "TEAM"): ColumnDef {
  return {
    id: "team",
    label,
    shortLabel,
    type: "category",
    getValue: (athlete, seasonYear) => teamInYear(athlete, seasonYear),
    compare: (guess, answer, answerSeason) => {
      const answerTeam = normalizeToken(answerSeason.team);
      const guessThatYear = guess.seasons.find((season) => season.year === answerSeason.year);
      if (guessThatYear && normalizeToken(guessThatYear.team) === answerTeam) return { status: "exact" };
      if (teamsOf(guess).includes(answerTeam)) return { status: "close" };
      return { status: "miss" };
    },
    format: formatText,
  };
}

export function positionColumn(groups: Record<string, string[]>): ColumnDef {
  return {
    id: "position",
    label: "Position",
    shortLabel: "POS",
    type: "category",
    getValue: (athlete) => athlete.position,
    compare: (guess, answer) => positionCompare(guess.position, answer.position, groups),
    format: formatText,
  };
}

export function heightColumn(): ColumnDef {
  return {
    id: "height",
    label: "Height",
    shortLabel: "HT",
    type: "numeric",
    getValue: (athlete) => athlete.heightInches,
    compare: (guess, answer) => numericCompare(guess.heightInches, answer.heightInches, 2),
    format: formatHeight,
  };
}

export function yearColumn(id: string, label: string, shortLabel: string, read: (athlete: Athlete) => number | null, within = 3): ColumnDef {
  return {
    id,
    label,
    shortLabel,
    type: "numeric",
    getValue: (athlete) => read(athlete),
    compare: (guess, answer) => numericCompare(read(guess), read(answer), within),
    format: formatYear,
  };
}

export function jerseyColumn(label = "Jersey", shortLabel = "#"): ColumnDef {
  return {
    id: "jersey",
    label,
    shortLabel,
    type: "numeric",
    getValue: (athlete) => athlete.jerseyNumbers[0] ?? null,
    compare: (guess, answer) => numericCompare(guess.jerseyNumbers[0] ?? null, answer.jerseyNumbers[0] ?? null, 3),
    format: formatJersey,
  };
}

const CONFERENCES: Record<string, string> = {
  duke: "ACC",
  northcarolina: "ACC",
  virginia: "ACC",
  syracuse: "ACC",
  louisville: "ACC",
  kentucky: "SEC",
  florida: "SEC",
  tennessee: "SEC",
  alabama: "SEC",
  kansas: "Big 12",
  texas: "Big 12",
  baylor: "Big 12",
  ucla: "Pac-12",
  arizona: "Pac-12",
  oregon: "Pac-12",
  gonzaga: "WCC",
  villanova: "Big East",
  connecticut: "Big East",
  michigan: "Big Ten",
  michiganstate: "Big Ten",
  ohio: "Big Ten",
  indianastate: "Big Ten",
  purdue: "Big Ten",
  wakeforest: "ACC",
  georgetown: "Big East",
};

function conferenceOf(college: string | null): string | null {
  if (!college) return null;
  return CONFERENCES[normalizeToken(college)] ?? null;
}

function isUsa(country: string): boolean {
  const token = normalizeToken(country);
  return token === "usa" || token === "unitedstates" || token === "us";
}

export function originValue(athlete: Athlete): string {
  if (!isUsa(athlete.birthCountry) && !athlete.college) return athlete.birthCountry;
  return athlete.college ?? athlete.birthCountry;
}

export function originColumn(): ColumnDef {
  return {
    id: "origin",
    label: "From",
    shortLabel: "FROM",
    type: "category",
    getValue: (athlete) => originValue(athlete),
    compare: (guess, answer) => {
      const guessOrigin = normalizeToken(originValue(guess));
      const answerOrigin = normalizeToken(originValue(answer));
      if (guessOrigin.length > 0 && guessOrigin === answerOrigin) return { status: "exact" };
      const guessConference = conferenceOf(guess.college);
      const answerConference = conferenceOf(answer.college);
      if (guessConference && guessConference === answerConference) return { status: "close" };
      if (normalizeToken(guess.birthCountry) === normalizeToken(answer.birthCountry)) return { status: "close" };
      return { status: "miss" };
    },
    format: formatText,
  };
}

export function countryColumn(label = "Country", shortLabel = "FROM"): ColumnDef {
  return {
    id: "country",
    label,
    shortLabel,
    type: "category",
    getValue: (athlete) => athlete.birthCountry,
    compare: (guess, answer) =>
      normalizeToken(guess.birthCountry) === normalizeToken(answer.birthCountry)
        ? { status: "exact" }
        : { status: "miss" },
    format: formatText,
  };
}

export function collegeColumn(): ColumnDef {
  return {
    id: "college",
    label: "College",
    shortLabel: "SCHOOL",
    type: "category",
    getValue: (athlete) => athlete.college ?? "—",
    compare: (guess, answer) => {
      if (!guess.college || !answer.college) {
        if (!guess.college && !answer.college) return { status: "exact" };
        return { status: "miss" };
      }
      if (normalizeToken(guess.college) === normalizeToken(answer.college)) return { status: "exact" };
      const guessConference = conferenceOf(guess.college);
      const answerConference = conferenceOf(answer.college);
      if (guessConference && guessConference === answerConference) return { status: "close" };
      return { status: "miss" };
    },
    format: formatText,
  };
}

export function debutYear(athlete: Athlete): number | null {
  const extra = athlete.extra.debutYear;
  if (typeof extra === "number" && Number.isFinite(extra)) return extra;
  const years = athlete.seasons
    .map((season) => Number(season.year.slice(0, 4)))
    .filter((year) => Number.isFinite(year));
  if (years.length === 0) return null;
  return Math.min(...years);
}

export function birthYear(athlete: Athlete): number | null {
  const extra = athlete.extra.birthYear;
  return typeof extra === "number" && Number.isFinite(extra) ? extra : null;
}

export const NBA_GROUPS: Record<string, string[]> = {
  G: ["PG", "SG", "G"],
  F: ["SF", "PF", "F"],
  C: ["C"],
};

export const NFL_GROUPS: Record<string, string[]> = {
  QB: ["QB"],
  RB: ["RB", "FB"],
  REC: ["WR", "TE"],
  OL: ["OT", "OG", "C", "OL"],
  DL: ["DE", "DT", "DL"],
  LB: ["LB", "OLB", "ILB"],
  DB: ["CB", "S", "FS", "SS", "DB"],
  ST: ["K", "P"],
};

export const MLB_GROUPS: Record<string, string[]> = {
  C: ["C"],
  IF: ["1B", "2B", "3B", "SS", "IF", "DH"],
  OF: ["LF", "CF", "RF", "OF"],
  P: ["SP", "RP", "P", "CL"],
};

export const NHL_GROUPS: Record<string, string[]> = {
  F: ["C", "LW", "RW", "F"],
  D: ["D"],
  G: ["G"],
};

export const EPL_GROUPS: Record<string, string[]> = {
  GK: ["GK"],
  DF: ["CB", "LB", "RB", "DF", "WB"],
  MF: ["MF", "CM", "AM", "DM", "WM"],
  FW: ["FW", "ST", "W", "CF"],
};

export function basketballColumns(): ColumnDef[] {
  return [
    teamColumn(),
    positionColumn(NBA_GROUPS),
    heightColumn(),
    yearColumn("draft", "Draft year", "DRAFT", (athlete) => athlete.draftYear),
    originColumn(),
    jerseyColumn(),
  ];
}

export function footballColumns(): ColumnDef[] {
  return [
    teamColumn(),
    positionColumn(NFL_GROUPS),
    heightColumn(),
    yearColumn("draft", "Draft year", "DRAFT", (athlete) => athlete.draftYear),
    collegeColumn(),
    jerseyColumn(),
  ];
}

export function baseballColumns(): ColumnDef[] {
  return [
    teamColumn(),
    positionColumn(MLB_GROUPS),
    heightColumn(),
    yearColumn("debut", "Debut year", "DEBUT", debutYear, 3),
    countryColumn(),
    jerseyColumn(),
  ];
}

export function hockeyColumns(): ColumnDef[] {
  return [
    teamColumn(),
    positionColumn(NHL_GROUPS),
    heightColumn(),
    yearColumn("draft", "Draft year", "DRAFT", (athlete) => athlete.draftYear),
    countryColumn(),
    jerseyColumn(),
  ];
}

export function soccerColumns(): ColumnDef[] {
  return [
    teamColumn("Club", "CLUB"),
    positionColumn(EPL_GROUPS),
    heightColumn(),
    { ...yearColumn("birth", "Birth year", "BORN", birthYear, 2), format: (value) => (typeof value === "number" ? String(value) : "—") },
    countryColumn("Nationality", "NATION"),
    jerseyColumn("Shirt", "#"),
  ];
}

