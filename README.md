# StreetRise

Real-time resource discovery for people in need — shelter, food, medical care, work exchange, and community support across Tampa Bay, Orlando, and Miami, FL.

Live app: **app.streetrise.org** (this repo). **streetrise.org** now redirects to `app.streetrise.org` — it is not a separate site or codebase anymore (that split existed until the Wix marketing site was dropped; its content was migrated into `src/pages/marketing/` here). The maintainer's goal is to eventually serve the app from `streetrise.org` directly instead of the `app.` subdomain, but that Cloudflare custom-domain migration hasn't been scoped or started — see `CLAUDE.md` → Mission & Domain Split.

For anything beyond this quick-start — data model, RLS, migrations drift, known bugs, deploy internals — see **`CLAUDE.md`**, which is kept current in far more detail than this file.

## Stack

| Layer      | Tech                                              |
|------------|----------------------------------------------------|
| Frontend   | React 18 + TypeScript + Vite (PWA)                 |
| Styling    | Tailwind CSS v3                                    |
| State      | Zustand (map, auth, toasts, EN/ES language) + TanStack Query |
| i18n       | Hand-written EN/ES dictionary (`src/lib/i18n.ts`) for UI chrome — resource/blog/FAQ content stays English-only |
| Maps       | Leaflet + OpenStreetMap tiles                      |
| Database   | Supabase (Postgres + Realtime + Auth)              |
| Hosting    | Cloudflare Pages → app.streetrise.org              |
| Payments   | Stripe (donations)                                 |
| CI         | GitHub Actions — `deploy.yml` (typecheck + build), `deploy-blog-worker.yml` (separate Worker deploy) |

## Quick start

```bash
# 1. Clone
git clone https://github.com/rodnrr/StreetRise.git
cd StreetRise

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from supabase.com

# 4. Dev server
npm run dev
```

Other commands: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run preview`, `npm run deploy`, `npm run import:seed`, `npm run agent:work`, `npm run worker:blog:dev` / `worker:blog:deploy`. `npm run lint`, `npm run typecheck`, and `npm run build` are all clean as of this writing (2026-09-01) — re-verify before assuming, since this drifts.

## Supabase setup

Migrations live in `supabase/migrations/`, numbered **001–039 with gaps — 012, 013, and 021 intentionally do not exist** (renumbering resolved earlier collisions; see the headers of 023 and 027). 038 and 039 are 2026-08-24 repo-completeness re-adds of backfills that already ran against live months earlier — nothing to apply there. **038 is not safe to re-run against live** — its last statement stamps `updated_at = now()` on every `resources` row (see the file's header comment and `CLAUDE.md`'s Database Migrations section); 039 is genuinely idempotent.

**Migrations are applied to the live project by hand in the Supabase SQL editor**, in numeric order — not by the deploy pipeline. The filenames have no timestamp prefixes, so the repo list and the live migration history drift; treat live as its own source of truth and check actual columns before assuming a migration has run. **`supabase_migrations.schema_migrations` (what `supabase db migrations list` reads) is itself unreliable** — as of 2026-09-01 it's missing entries for several applied migrations, has two different migrations both recorded under the number `012`, and records some rows with no number at all. Don't use it to answer "has migration N run" — verify the actual columns/objects that migration creates. Hand-apply runbooks for the newer migrations are in `docs/apply-migration-029.md` through `docs/apply-migration-037.md`, plus `docs/apply-migrations-023-027.md` and `docs/claim-flow.md` (033/034).

> ⚠️ Do **not** regenerate `src/lib/database.types.ts` (`npx supabase gen types ...`) unless live has every migration the code depends on. Parts of that file (the `blog_posts` block and the conversation read columns) are hand-written to match intended state — a regen against a lagging DB deletes them.

## Data governance

StreetRise keeps the controlled resource vocabulary in version control so category names, subcategories, provider types, amenities, verification values, and county values do not drift across spreadsheets and imports.

| File | Purpose |
|---|---|
| `data/reference/controlled_vocab.csv` | Official controlled vocabulary exported from the working spreadsheet. |
| `data/seed/streetrise_batch1_live_export.csv` | Export of the Batch 1 live data. |
| `data/seed/streetrise_seed_candidates_batch_2_normalized.csv` | Normalized Batch 2 seed candidates with generated `external_id`, normalized category fields, app-compatible category fields, map-readiness flags, and import status. |
| `docs/data-dictionary.md` | Human-readable explanation of how to use the controlled values. |
| `docs/import-seed-candidates.md` | How to run the seed import (`npm run import:seed`, needs `SUPABASE_SERVICE_ROLE_KEY`). |

Later seed batches were applied as SQL migrations rather than CSVs: 017 (batch 4 — Hernando/Pasco/Manatee), 020 + 028 (work exchanges), 022 (Central Florida map listings), 032 (South Florida — Miami-Dade + South Broward/Hollywood), 036 (student clothing + the `students` population-focus tag).

> Current app compatibility note: the frontend/database still uses `outdoor_space` for the parks/outdoors filter. A future move to `day_use_space` needs a dedicated schema migration before any filter-slug change.

## Cloudflare Pages deploy

```bash
# Manual deploy (requires CLOUDFLARE_API_TOKEN + 32-char CLOUDFLARE_ACCOUNT_ID)
export CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
export CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
npm run build
npm run deploy

# Optional: override project name
# export CLOUDFLARE_PAGES_PROJECT_NAME=streetrise
```

The GitHub Actions workflow (`.github/workflows/deploy.yml`, named "CI") runs typecheck + build on every push/PR to `main`. **Treat merging to `main` as a production deploy** — never merge with red CI.

**The blog publisher Worker (`workers/blog-publisher/`) deploys separately**, via `.github/workflows/deploy-blog-worker.yml` — it runs on pushes touching `workers/blog-publisher/**`, the workflow file, or `package.json`/`package-lock.json`, or on manual `workflow_dispatch`. It first deployed successfully 2026-08-26 after Cloudflare's native "Workers Builds" Git integration proved unreliable (its Root Directory setting kept reverting to the repo root). See `CLAUDE.md` → Deployment and `docs/deploy-blog-worker.md` for the full story and current confirmation status.

### Required GitHub Secrets

| Secret                        | Where to get it                          |
|-------------------------------|------------------------------------------|
| `VITE_SUPABASE_URL`           | supabase.com → Project Settings → API    |
| `VITE_SUPABASE_ANON_KEY`      | supabase.com → Project Settings → API    |
| `VITE_STRIPE_PUBLISHABLE_KEY` | stripe.com → Developers → API Keys       |
| `CLOUDFLARE_API_TOKEN`        | For `deploy-blog-worker.yml` (Workers Scripts: Edit scope) |
| `CLOUDFLARE_ACCOUNT_ID`       | For `deploy-blog-worker.yml`             |

## Project structure

```
src/
├── components/
│   ├── map/          # ResourceMarker, ResourceCard, FilterDrawer
│   ├── provider/     # ProviderLayout, BedCountUpdater
│   ├── admin/        # AdminLayout (badges, mobile nav)
│   └── shared/       # RootLayout, Footer, ToastContainer, LangToggle (EN/ES)
├── pages/
│   ├── marketing/    # About, Contact, Partners, Privacy, Terms, Accessibility, CommunityVoices
│   ├── blog/         # Blog index + post pages
│   ├── categories/   # CategoryPage (one component, config-driven)
│   ├── provider/     # Portal pages (dashboard, listings, bookings, chat, work)
│   └── admin/        # Admin pages (moderation, chat, FAQ, blog)
├── lib/
│   ├── supabase.ts   # Client + db.*() helpers + realtime
│   ├── store.ts      # Zustand stores (map, auth, toasts, language)
│   ├── mapFilters.ts # Map filter logic + category labels
│   ├── categories.ts # Public category-page → map-filter config
│   ├── i18n.ts        # EN/ES dictionary + useI18n()
│   ├── resourceFaq.ts # Deterministic instant-answer FAQ engine ("Ask a Question")
│   ├── conversations.ts, blog.ts, adminCounts.ts
│   ├── seo/          # SeoHead + structured data
│   └── database.types.ts
├── types/
│   └── index.ts      # All shared TypeScript types
└── styles/
    └── globals.css   # Tailwind + component layer

data/                 # Controlled vocab + seed CSVs
docs/                 # Data dictionary, import guide, migration runbooks, open items, auth setup
scripts/              # deploy-pages.sh, import-seed-candidates.ts, work-exchange-agent.ts
workers/blog-publisher/  # Cloudflare Worker: AI blog draft + cover image generator, deployed separately
supabase/migrations/  # 001–039 (no 012/013/021) — applied to live BY HAND
.github/workflows/    # deploy.yml (CI: typecheck + build), deploy-blog-worker.yml
```

## Status

Shipped and live:

- [x] Repo scaffold, configs, types, Supabase client, stores
- [x] Map page — real-time resource discovery with unified "needs" chip filters and client-side faceting (revamped 2026-08-17)
- [x] Supabase schema + RLS (migrations 001–011, extended through 039)
- [x] Provider portal — listings, bed counts, bookings, work exchange, messages
- [x] Bookings flow — anonymous-allowed request form + provider/admin triage, plus a deterministic instant-answer FAQ panel on "Ask a Question" (`resourceFaq.ts`)
- [x] Admin panel — provider/resource verification, bookings, chat, FAQ, blog CRUD, work-exchange review queue
- [x] Donations — Stripe checkout via Supabase Edge Function (revamped 2026-08-24 with live-impact copy)
- [x] FAQ (DB-backed) + the resource-level instant-answer engine above
- [x] SEO — sitemap, robots.txt (explicit AI-crawler allow rules added), SeoHead/structured data, public category pages
- [x] Marketing pages (about — now with founder story, contact, partners, privacy, terms, accessibility, community voices) + footer
- [x] EN/ES language toggle for public UI chrome (`i18n.ts`, `LangToggle`)
- [x] Admin↔provider messaging (migrations 014/015/018/030)
- [x] Provider claim flow for seeded orgs (migrations 023–027, 033/034)
- [x] Seed data: Tampa Bay, Central Florida, and South Florida (Miami-Dade + South Broward) providers, resources, and work exchanges; student clothing resources (migration 036)
- [x] Blog publisher Worker — generates unpublished AI drafts + cover images, deployed via its own GitHub Actions workflow (first successful deploy 2026-08-26)

## To do

Tracked in detail in `docs/OPEN_ITEMS.md` and `CLAUDE.md`'s Known Open Items; the short list as of 2026-09-01:

- [ ] **Fix "Decline" on bookings — it's broken on live.** `BookingStatus` includes `'declined'`, and both `AdminBookings.tsx`/`ProviderBookings.tsx` have a Decline action that writes it, but the live `booking_status` enum doesn't have that value — every click fails with a Postgres enum error. Needs a migration to add it, or the two Decline actions repointed at an existing status.
- [ ] **Confirm `VITE_BLOG_WORKER_URL` is set in Cloudflare Pages** and the Pages deployment retried — the Worker itself deploys successfully now, but the AI Draft panel on `/admin/blog` stays hidden until that env var is set and picked up.
- [ ] **Finish chat unread tracking** — migration 030 is applied to live. Opening a thread marks it read, but sending into the open thread re-marks it unread for the sender — neither chat page marks read on send success (re-confirmed in code 2026-09-01).
- [ ] **Render blog markdown** — `BlogPostPage` currently shows raw `body_markdown`.
- [ ] **Filter internal tags from public pages** — `subcategory:`/`service_area:`/`import:`/`access_src:` tags render as public badges on `ResourceDetailPage`.
- [ ] **Tighten `conversations` UPDATE RLS** — currently column-agnostic (low severity, re-confirmed against live policies 2026-09-01).
- [ ] **Decide on migration 037's backfill** (confidence-trigger parity) — its DDL is a no-op on live, but the backfill re-scores 66 stale rows; read `docs/apply-migration-037.md` first.
- [ ] **Supabase hardening**: `resource_import_staging` has RLS enabled with no policies (verify it's meant to be API-inert), several functions have mutable `search_path`, some RLS policies re-evaluate `auth.<fn>()` per-row instead of the faster `(select auth.<fn>())` pattern, and leaked-password protection is off in Auth — see `CLAUDE.md`'s Known Open Items for the full list (security + performance).
- [ ] **Domain migration** — move the app from `app.streetrise.org` to `streetrise.org` directly (Cloudflare custom-domain change + a sweep of hardcoded `app.streetrise.org` references). Not scoped yet.
- [ ] **Branch cleanup** — not currently needed (only 5 branches exist as of 2026-09-01); re-run the `BRANCH_FRESHNESS_AUDIT.md` runbook once a stale-branch backlog builds up again.
