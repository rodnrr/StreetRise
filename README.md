# StreetRise

Real-time resource discovery for people in need — shelter, food, medical care, work exchange, and community support across Tampa Bay and Central Florida.

Live app: **app.streetrise.org** (this repo). The marketing/org site at **streetrise.org** is separate and not in this repo.

## Stack

| Layer      | Tech                                   |
|------------|----------------------------------------|
| Frontend   | React 18 + TypeScript + Vite (PWA)     |
| Styling    | Tailwind CSS v3                        |
| State      | Zustand + TanStack Query               |
| Maps       | Leaflet + OpenStreetMap tiles          |
| Database   | Supabase (Postgres + Realtime + Auth)  |
| Hosting    | Cloudflare Pages → app.streetrise.org  |
| Payments   | Stripe (donations)                     |
| CI         | GitHub Actions (typecheck + build)     |

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

Other commands: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run preview`, `npm run deploy`, `npm run import:seed`.

## Supabase setup

Migrations live in `supabase/migrations/`, numbered **001–030 with gaps — 012, 013, and 021 intentionally do not exist** (renumbering resolved earlier collisions; see the headers of 023 and 027).

**Migrations are applied to the live project by hand in the Supabase SQL editor**, in numeric order — not by the deploy pipeline. The filenames have no timestamp prefixes, so the repo list and the live migration history drift; treat live as its own source of truth and check actual columns before assuming a migration has run. Hand-apply runbooks for the newest migrations are in `docs/apply-migration-029.md` and `docs/apply-migration-030.md`.

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

Later seed batches were applied as SQL migrations rather than CSVs: 017 (batch 4 — Hernando/Pasco/Manatee), 020 + 028 (work exchanges), 022 (Central Florida map listings).

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

### Required GitHub Secrets

| Secret                        | Where to get it                          |
|-------------------------------|------------------------------------------|
| `VITE_SUPABASE_URL`           | supabase.com → Project Settings → API    |
| `VITE_SUPABASE_ANON_KEY`      | supabase.com → Project Settings → API    |
| `VITE_STRIPE_PUBLISHABLE_KEY` | stripe.com → Developers → API Keys       |

## Project structure

```
src/
├── components/
│   ├── map/          # ResourceMarker, ResourceCard, FilterDrawer
│   ├── provider/     # ProviderLayout, BedCountUpdater
│   ├── admin/        # AdminLayout (badges, mobile nav)
│   └── shared/       # RootLayout, Footer, ToastContainer
├── pages/
│   ├── marketing/    # About, Contact, Partners, Privacy, Terms, Accessibility
│   ├── blog/         # Blog index + post pages
│   ├── categories/   # CategoryPage (one component, config-driven)
│   ├── provider/     # Portal pages (dashboard, listings, bookings, chat, work)
│   └── admin/        # Admin pages (moderation, chat, FAQ, blog)
├── lib/
│   ├── supabase.ts   # Client + db.*() helpers + realtime
│   ├── store.ts      # Zustand stores (map, auth, toasts)
│   ├── mapFilters.ts # Map filter logic + category labels
│   ├── categories.ts # Public category-page → map-filter config
│   ├── conversations.ts, blog.ts, adminCounts.ts
│   ├── seo/          # SeoHead + structured data
│   └── database.types.ts
├── types/
│   └── index.ts      # All shared TypeScript types
└── styles/
    └── globals.css   # Tailwind + component layer

data/                 # Controlled vocab + seed CSVs
docs/                 # Data dictionary, import guide, migration runbooks, open items
scripts/              # deploy-pages.sh, import-seed-candidates.ts
supabase/migrations/  # 001–030 (no 012/013/021) — applied to live BY HAND
.github/workflows/    # deploy.yml — typecheck + build CI on main
```

## Status

Shipped and live:

- [x] Repo scaffold, configs, types, Supabase client, stores
- [x] Map page — real-time resource discovery with quick filters and taxonomy
- [x] Supabase schema + RLS (migrations 001–011)
- [x] Provider portal — listings, bed counts, bookings, work exchange, messages
- [x] Bookings flow — anonymous-allowed request form + provider/admin triage
- [x] Admin panel — provider/resource verification, bookings, chat, FAQ, blog CRUD
- [x] Donations — Stripe checkout via Supabase Edge Function
- [x] FAQ (DB-backed)
- [x] SEO — sitemap, robots.txt, SeoHead/structured data, public category pages
- [x] Marketing pages (about, contact, partners, privacy, terms, accessibility) + footer
- [x] Admin↔provider messaging (migrations 014/015/018)
- [x] Provider claim flow for seeded orgs (migrations 023–027)
- [x] Seed data: Tampa Bay + Central Florida providers, resources, work exchanges

## To do

Tracked in detail in `docs/OPEN_ITEMS.md`; the short list:

- [ ] **Apply migration 030 to live** (conversation read tracking) — until then chat unread indicators can never clear. Runbook: `docs/apply-migration-030.md`.
- [ ] **Render blog markdown** — `BlogPostPage` currently shows raw `body_markdown`.
- [ ] **Filter internal tags from public pages** — `subcategory:`/`service_area:`/`import:`/`access_src:` tags render as public badges on `ResourceDetailPage`.
- [ ] **Fix the one known lint error** — `supabase.from('bookings') as any` at `src/lib/supabase.ts:29`.
- [ ] **Tighten `conversations` UPDATE RLS** — currently column-agnostic (low severity).
- [ ] **Reconcile `booking_status`** — live enum has values (`declined`, `needs_info`, `contacted`, `no_response`, `closed`) that no repo migration adds.
- [ ] **Branch cleanup** — run the runbook in `BRANCH_FRESHNESS_AUDIT.md` to retire stale AI session branches.
