# StreetRise

Real-time resource discovery for people in need — shelter, food, work exchange, and community support.

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
| CI/CD      | GitHub Actions → Cloudflare Pages      |

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

## Supabase setup

```bash
# Apply migrations (run in order in Supabase SQL editor, or use supabase CLI)
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_rls_policies.sql
# supabase/migrations/003_seed_data.sql  (FAQ + demo data)

# Generate fresh types after schema changes:
npx supabase gen types typescript --project-id YOUR_REF > src/lib/database.types.ts
```

## Data governance

StreetRise keeps the controlled resource vocabulary in version control so category names, subcategories, provider types, amenities, verification values, and county values do not drift across spreadsheets and imports.

| File | Purpose |
|---|---|
| `data/reference/controlled_vocab.csv` | Official controlled vocabulary exported from the working spreadsheet. |
| `data/seed/streetrise_seed_candidates_batch_2_normalized.csv` | Normalized Batch 2 seed candidates with generated `external_id`, normalized category fields, app-compatible category fields, map-readiness flags, and import status. |
| `docs/data-dictionary.md` | Human-readable explanation of how to use the controlled values. |

### Batch 2 seed candidate summary

The Batch 2 candidate file contains 95 rows:

| Import status | Count | Meaning |
|---|---:|---|
| `ready_for_import` | 77 | Has coordinates or a usable public/service location and can be reviewed for import. |
| `needs_review` | 18 | Confidential, intake-only, missing coordinates, likely duplicate, or otherwise unsafe to map without human review. |

The normalized file includes both:

- `category` — preferred future controlled category, such as `day_use_space` or `employment`
- `current_app_category` — compatibility value for the current frontend/Supabase enum, such as `outdoor_space`, `work_exchange`, or `other`

Preferred top-level `category` values for new resource imports:

```text
shelter
food
hygiene
medical
mental_health
substance_abuse
legal
employment
education
transportation
financial_assistance
housing_assistance
crisis_services
community_center
day_use_space
```

Use `day_use_space` for parks, libraries, cooling/warming centers, drop-in centers, safe rest areas, and other non-overnight public/communal spaces. Use `facility_features` for amenities such as `restrooms`, `showers`, `wifi`, `charging`, `outdoor_space`, and `parking`.

> Current app compatibility note: the existing frontend/database still uses `outdoor_space` for the parks/outdoors filter. Migrate live records and TypeScript/database types to `day_use_space` in a dedicated schema migration before changing the map filter slug.

## Cloudflare Pages deploy

```bash
# Manual deploy (requires a valid 32-char CLOUDFLARE_ACCOUNT_ID)
export CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
npm run build
npm run deploy

# Optional: override project name
# export CLOUDFLARE_PAGES_PROJECT_NAME=streetrise

# Or push to main — GitHub Actions handles it automatically
```

### Required GitHub Secrets

| Secret                      | Where to get it                          |
|-----------------------------|------------------------------------------|
| `VITE_SUPABASE_URL`         | supabase.com → Project Settings → API   |
| `VITE_SUPABASE_ANON_KEY`    | supabase.com → Project Settings → API   |
| `VITE_STRIPE_PUBLISHABLE_KEY` | stripe.com → Developers → API Keys    |
| `CLOUDFLARE_API_TOKEN`      | dash.cloudflare.com → My Profile → Tokens |
| `CLOUDFLARE_ACCOUNT_ID`     | dash.cloudflare.com → right sidebar     |

## Project structure

```
src/
├── components/
│   ├── map/          # ResourceMarker, ResourceCard, FilterDrawer
│   ├── provider/     # ProviderLayout + portal components
│   ├── admin/        # AdminLayout + moderation components
│   └── shared/       # RootLayout, ToastContainer, etc.
├── pages/
│   ├── provider/     # Portal pages
│   └── admin/        # Admin pages
├── lib/
│   ├── supabase.ts   # Client + realtime helpers
│   ├── store.ts      # Zustand stores (map, auth, toasts)
│   └── database.types.ts
├── types/
│   └── index.ts      # All shared TypeScript types
└── styles/
    └── globals.css   # Tailwind + component layer

data/
├── reference/
│   └── controlled_vocab.csv
└── seed/
    └── streetrise_seed_candidates_batch_2_normalized.csv

docs/
└── data-dictionary.md

supabase/migrations/
├── 001_initial_schema.sql   # 7 tables, enums, indexes
├── 002_rls_policies.sql     # Row-level security for all tables
└── 003_seed_data.sql        # FAQ seed (10 entries)

.github/workflows/
└── deploy.yml               # Build + deploy on push to main
```

## Feature modules (build order)

- [x] Repo scaffold, configs, types, Supabase client, store
- [x] Map page — real-time resource discovery
- [x] Supabase migrations — schema + RLS
- [ ] Provider portal — listings, bed count updates, bookings
- [ ] Bookings flow — request form, status tracking
- [ ] Admin panel — verification, moderation, analytics
- [ ] Donations — Stripe integration
- [ ] FAQ widget
- [ ] SEO / sitemap
