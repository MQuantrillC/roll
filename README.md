# 🎲 Roll

Stop arguing about what to watch. Roll is a group decision app: everyone adds
their favorites, picks a decision style, and the group gets a satisfying answer
in seconds.

## Stack

- **Next.js 16** (App Router, TypeScript) — deployable on Vercel
- **Supabase** — auth (email/password + magic link), Postgres, Row Level Security
- **Tailwind CSS v4** with a KokonutUI-style component kit
- **Motion** for UI animations, **GSAP** for the decision wheel
- **TMDB** for movie/series search & metadata (server-side only)
- **Vitest** for the decision-engine and parser test suite

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. In the Supabase **SQL editor**, run the whole of
   [`supabase/schema.sql`](supabase/schema.sql). This creates all tables,
   triggers, RPCs (`create_group`, `join_group`) and RLS policies.
3. Get a **TMDB API key** at
   [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
   (either the v3 key or the v4 read-access token works).
4. Copy `.env.local.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   TMDB_API_KEY=...
   ```

5. Install & run:

   ```
   npm install
   npm run dev
   ```

6. (Optional) In Supabase **Auth → URL configuration**, set your site URL so
   magic-link emails redirect correctly. For instant email/password sign-in in
   development you can disable "Confirm email" under Auth → Providers → Email.

### Deploying to Vercel

Add the same three environment variables in the Vercel project settings and
deploy. `TMDB_API_KEY` stays server-side — all TMDB traffic goes through
`/api/tmdb/*` routes.

## Tests

```
npm test
```

Covers the bulk-list parser and all four decision algorithms (pure random,
balanced random, head-to-head incl. ties/byes, mutual match) plus exclusions
and the auto-decide strategy.

## Architecture notes

- **Generic items model** (`items` table with `type`, `external_source`,
  `metadata`) — adding games/travel/music later is a new `type`, not a new
  schema.
- **Decision algorithms** live in `lib/decision/*` as pure, independently
  testable functions. All randomness is crypto-grade (`lib/decision/random.ts`)
  and computed *before* any animation runs — the wheel represents the result,
  it never determines it.
- **Fairness**: Balanced Random and Mutual Match cap per-person influence;
  Pure Random offers "equal per person" weighting; Head-to-Head samples
  candidates round-robin across participants' lists.
- **Duplicate detection** uses normalized titles (case/punctuation/diacritic
  -insensitive) plus per-owner unique indexes; different TMDB entities are
  never merged by name similarity.
- **Couch mode**: decisions run on one shared device (pass the phone for picks
  and votes). The `votes` table + RLS are already in place for future
  multi-device realtime voting.
- **Bulk import** (`lib/parser/bulkListParser.ts`) is deterministic — no AI
  involved — and tolerates bullets, numbering, quotes and messy whitespace,
  then optionally TMDB-matches each title with an ambiguity-resolution UI.
