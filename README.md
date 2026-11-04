# BOXED

A daily, multi-sport guessing game. Every player sees the same anonymous season stat line, gets six guesses, and scores the guesses they have left. Sports are plugins: nothing sport-specific lives outside `sports/<sportId>/`.

Anonymous play works with no account. Supabase and Stripe are optional until you want accounts, cloud streaks, leagues, sponsors, or Pro.

## Local setup

Node.js 22 and npm.

```bash
npm install
```

Copy the env template. On PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set `GAME_SECRET` to a long random string. Leave the Supabase and Stripe placeholders in place if you only want to play locally. Then:

```bash
npm run dev
```

Open http://localhost:3000.

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | Vitest, then `validate:data` |
| `npm run validate:data` | Zod-check every seed file and rewrite `data/VERIFY-ME.md` |
| `npm run import:csv` | Turn a public stats CSV into a sport JSON file |

## Environment

Every variable is listed in `.env.example`.

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, no trailing slash. Auth redirects, Stripe return URLs, share host, sitemap. |
| `ENABLED_SPORTS` | Comma-separated sport ids. Blank defaults to `nba`. Unknown ids are ignored with a console warning. |
| `DEFAULT_SPORT` | Which sport `/play` and `/embed` open when several are enabled. Must be one of the enabled ids. |
| `LAUNCH_DATE` | `YYYY-MM-DD` in US Eastern. That date is puzzle #1 for every sport. |
| `REQUIRE_VERIFIED` | `true` limits the daily pool to athletes with `verified: true`. Seed data ships unverified, so leave this `false` until you have checked them. |
| `GAME_SECRET` | HMAC secret for guess tokens. Required in production. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Plays, streaks, webhooks, sponsor leads, league joins. |
| `STRIPE_SECRET_KEY` | Secret key. Use a test key locally. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from the Stripe CLI or the Dashboard endpoint. |
| `STRIPE_PRICE_MONTHLY` | Recurring price id for $3.99/month. |
| `STRIPE_PRICE_YEARLY` | Recurring price id for $29.99/year. |

Placeholder values containing `your-project`, `your-anon`, `your-service-role`, or `replace_me` are treated as unset. The game still runs.

## Supabase migration and seed

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/001_init.sql`. It creates `profiles`, `plays`, `streaks`, `leagues`, `league_members`, `sponsors`, and `sponsor_leads`, enables RLS on each, and adds the signup trigger plus a trigger that blocks clients from editing `is_pro` or `stripe_customer_id`.
3. Optionally run `supabase/seed.sql`. It inserts one inactive sample sponsor (`Night Signal`). Set `active = true` when you want it on the board.
4. Authentication → Providers: enable Email (magic link) and Google.
5. Authentication → URL configuration: site URL `http://localhost:3000` (and your production URL later). Add redirect `http://localhost:3000/auth/callback`.
6. Copy the project URL, anon key, and service role key into `.env.local`.

Signing in is optional. A guest gets an `anon_id` in localStorage. After the first sign-in, `POST /api/account/migrate` copies that guest history onto the account and recomputes streaks.

## Stripe webhook testing

Create a product in test mode with two recurring prices: $3.99/month and $29.99/year. Put the secret key and both price ids in `.env.local`.

Forward webhooks with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Put the CLI's `whsec_...` value in `STRIPE_WEBHOOK_SECRET` and restart the dev server.

The handler accepts:

- `checkout.session.completed` (subscription mode) — sets `profiles.is_pro` and stores the customer id. The Checkout session sends the signed-in user id as `client_reference_id`.
- `customer.subscription.updated` — `is_pro` is true for `active` and `trialing`.
- `customer.subscription.deleted` — sets `is_pro` to false.

Sign in, open Settings, and start Checkout. After the webhook, reload Settings: the gold badge appears, league creation unlocks, the archive lists every past puzzle, and sponsor banners are omitted. The Customer Portal button calls `/api/stripe/portal`.

Pro is $3.99/month or $29.99/year. Perks: create leagues (anyone can join), the full archive (free accounts get today and the previous two days), no sponsor slot, and a gold badge.

## Vercel

1. Import the repository. Framework preset is Next.js. Build command `npm run build`.
2. Add the same environment variables. Set `NEXT_PUBLIC_SITE_URL` to the production origin and `GAME_SECRET` to a new long random string.
3. In Supabase, add the production site URL and `https://<domain>/auth/callback` as a redirect.
4. In Stripe, add an endpoint `https://<domain>/api/stripe/webhook` for the three events above. Use that endpoint's signing secret, and use live keys only when you are ready to charge.
5. Deploy. `ENABLED_SPORTS`, `DEFAULT_SPORT`, `LAUNCH_DATE`, `REQUIRE_VERIFIED`, `GAME_SECRET`, and the Stripe and service-role keys are read on the server at request time. Redeploy after changing any `NEXT_PUBLIC_` variable, including the site URL and the Supabase URL and anon key, because those are inlined into the browser bundle.

## Adding a sport

A new sport is three steps. The app, the data validator, and the sport tests all read `sports/registry.ts`, so you do not edit routes, the guess API, the sitemap, or the share formatter.

1. Add `data/<id>-players.json`: an array of athletes. Shape: `id`, `sport`, `name`, `aliases`, `verified`, `seasons` (`year`, `team`, `stats`), `position`, `heightInches`, `birthCountry`, `college`, `draftYear`, `draftPick`, `jerseyNumbers`, `teamHistory`, `extra`. Put sport-specific numbers in `seasons[].stats` and headlines in `extra`. Start with `"verified": false`.
2. Add `sports/<id>/config.ts`. Import that JSON and pass it to `defineSport` with `id`, `name`, `shortName`, `emoji`, `accentColor`, `statFields`, a `clueLadder` of exactly six clues, `heightRange`, and `ranges`. Use `statProfiles` when the sport has different lines (quarterback vs running back, hitter vs pitcher). `defineSport` builds the Zod `validate` function.
3. Import that config in `sports/registry.ts` and append it to `REGISTERED`.

Then add the id to `ENABLED_SPORTS` and run `npm run validate:data`.

`defaultClueLadder()` in `sports/clues.ts` is team, position and height, draft, college or country, jersey numbers, then initials. Replace a rung when the sport has no draft. The Premier League config does this with an origin clue and a nationality clue.

Minimal config:

```ts
import type { Athlete } from "@/sports/types";
import raw from "@/data/example-players.json";
import { defaultClueLadder } from "../clues";
import { defineSport, oneDecimal } from "../define";

const players = raw as unknown as Athlete[];

export const example = defineSport({
  id: "example",
  name: "Example",
  shortName: "EX",
  emoji: "🎯",
  accentColor: "#22D3EE",
  statFields: [{ key: "ppg", label: "PPG", format: oneDecimal }],
  clueLadder: defaultClueLadder(),
  heightRange: { min: 60, max: 90 },
  ranges: { ppg: { min: 0, max: 50 } },
  players,
});
```

Registry entry:

```ts
import { example } from "./example/config";

const REGISTERED = [nba, wnba, nfl, mlb, nhl, epl, example];
```

## Running NBA-only vs multi-sport

`ENABLED_SPORTS=nba` (or leaving it unset):

- No sport switcher on the landing page, `/play`, the archive, stats, or leagues.
- Branding uses the NBA emoji and orange accent.
- Play stays at `/play`. `/play/nba` redirects there.
- Share text names that sport only. There is no Daily Sweep line.
- `/play/nfl`, `/embed/nfl`, and any other disabled sport return the friendly 404.
- The sitemap, result images, and embed builder list only NBA.

`ENABLED_SPORTS=nba,wnba,nfl,mlb,nhl,epl`:

- Landing page shows today's puzzles for each enabled sport.
- `/play` is `DEFAULT_SPORT` (or the first enabled id). Other sports live at `/play/nfl`, `/play/mlb`, and so on.
- The switcher is tabs on small screens and pills from the `md` breakpoint up.
- The accent CSS variable follows the sport on screen. The dark arena background stays.
- Stats and streaks are stored per sport. Solving every enabled sport on the same puzzle number counts as a Daily Sweep.
- Share text can add a sweep line: `BOXED Sweep 🏀🏈⚾ 3/3 today`.
- Embeds: `/embed` is the default sport, `/embed/<id>` is that sport, and a disabled id 404s. `/embed-builder` only offers enabled sports.

Order in `ENABLED_SPORTS` is the order of the switcher. Duplicates are ignored.

## Replacing seed data from a CSV

`scripts/import-csv.ts` maps a CSV exported from a public stats site into the JSON the app loads. A column map tells it which header is which field. `data/mappings/nba.json` is the basketball example.

```bash
npx tsx scripts/import-csv.ts --sport nba --csv ./incoming.csv --mapping data/mappings/nba.json --out data/nba-players.json
```

`--out` defaults to `data/<sport>-players.json`. Rows that share an `id` become seasons on one athlete. Inside a cell, aliases, jersey numbers, and facts are pipe-separated. A `verified` cell of `true` or `1` marks the athlete verified.

Then:

```bash
npm run validate:data
```

The report fails on schema errors, duplicate ids or names, a draft pick with no draft year, heights outside the sport range, and negative stats (except keys listed in `signedStatKeys`, such as hockey plus-minus). It rewrites `data/VERIFY-ME.md`, a checklist of every athlete and season. After you spot-check a player, set `verified` to `true`. The selector prefers verified athletes. With `REQUIRE_VERIFIED=true` it uses only them, and an empty verified pool shows an error instead of unpublished numbers.

The files in `scripts/seed/*.psv` are the authoring format for the shipped seed. `node scripts/seed/build.mjs` compiles them into `data/*-players.json`. You do not need that pipeline to add or replace a sport. The app reads the JSON.

Ship a number only when you are confident it is right. Drop the season, or the athlete, when you are not. Every shipped athlete starts at `verified: false` for that reason.
