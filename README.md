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

## Cloudflare Pages deploy

```bash
# Manual deploy
npm run deploy

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
