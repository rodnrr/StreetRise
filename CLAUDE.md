# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working With the Maintainer

The maintainer often works from an **iPhone** with no terminal access. At the start of each new session, ask which device they are on (iPhone / Windows / Mac / Linux) before giving any device-specific instructions. Never assume a desktop shell: when they are on iPhone, prefer dashboard/web-UI steps, and deliver files by attaching them to the chat instead of pointing at local paths or git commands.

## Current Status

The pre-debut launch review described in earlier versions of this file is **done** — its findings and applied fixes are recorded in `LAUNCH_REVIEW.md` (footer, contact info, sitemap corrections, honest copy, "Become a Provider" nav entry all shipped). Open work is tracked in:

- `docs/OPEN_ITEMS.md` — session log of open items (migration 030 status, blog gaps, internal-tag leak on `ResourceDetailPage`, lint debt)
- `BRANCH_FRESHNESS_AUDIT.md` — runbook for cleaning up stale AI session branches
- `LAUNCH_REVIEW.md` — the completed launch assessment, kept for reference

Known open items (verified 2026-07-31):

- **Migration 030 was not yet applied to live** as of 2026-07-29 (`docs/apply-migration-030.md`). Until it is, chat unread indicators can never clear — `markConversationRead()` writes to columns that don't exist and silently no-ops.
- **`npm run lint`, `npm run typecheck`, and `npm run build` are all clean** (re-verified 2026-08-06). The previously documented lint error on `supabase.from('bookings') as any` is gone — `src/lib/supabase.ts` now carries an `eslint-disable-next-line` for it, so the cast itself is still lint debt to unwind when `database.types.ts` is regenerated.
- **`BlogPostPage` does not render markdown** — `body_markdown` is shown in a `whitespace-pre-wrap` div. `cover_image_url` now renders (hero on `BlogPostPage`, thumbnail on `BlogIndexPage`, og:image) when set; images are hosted in the R2 bucket `assets-streetrise` — upload + DB-update runbook in `docs/r2-blog-images.md`.
- **Internal tags leak on `ResourceDetailPage`** — tags with `subcategory:`, `service_area:`, `import:`, `access_src:` prefixes render as public badges. Recommended fix (a `publicTags()` filter) is written up in `docs/OPEN_ITEMS.md`.
- **Provider signup depends on two column defaults.** `providers_insert_self` (tightened by migration 023) requires `claim_status='claimed'` and `source_type='self_registered'`, but `ProviderOnboarding.tsx` sets neither — the column defaults supply both before `WITH CHECK` runs. Drop or change those defaults and provider signup starts failing RLS.
- ~~Claiming an org hides it from `/work`~~ — **fixed by migration 033**, which adds `providers_pending_claim_read` so a mid-claim org stays publicly visible.
- **Default map center still points at Tampa Bay** — `useMapStore` opens at `{ lat: 28.2, lng: -81.9 }` zoom 9. Since migration 032 added South Florida (2026-08-06), a Miami or Hollywood visitor who does not grant geolocation or search lands on a map with no nearby pins. Worth revisiting now that coverage spans ~400 km of the state; the persisted store key would need bumping (`streetrise-map-v3` → `v4`) for existing visitors to pick up a new default.

---

## Mission & Domain Split

- **app.streetrise.org** — this React SPA (the resource-finder app)
- **streetrise.org** — separate marketing/org site (not in this repo)

StreetRise connects people in need with local service providers (shelters, food pantries, clinics, legal aid, etc.). Original coverage was Tampa Bay, FL; seed migrations 017/020/022 expanded to Central Florida (Orlando, Hernando, Pasco, Manatee/Bradenton); migration 032 added South Florida (Miami-Dade + South Broward/Hollywood). Public copy says "Tampa Bay, Orlando, and Miami" — `HomePage`'s `CITIES` array is the source of truth for which metros read as live, and a metro is only flipped to `live: true` once it has publicly visible seeded listings. Providers manage listings; the public searches the map; no sign-up required to find resources.

---

## Commands

```bash
npm run dev          # Vite dev server (requires .env.local)
npm run build        # tsc + vite build (typecheck is mandatory)
npm run typecheck    # Type-only check without building
npm run lint         # ESLint, zero warnings — currently passing
npm run preview      # Preview production build locally
npm run deploy       # scripts/deploy-pages.sh → wrangler pages deploy dist
npm run import:seed  # Run scripts/import-seed-candidates.ts via tsx
```

**Setup:**
```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (minimum required)
```

Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
Optional: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_GOOGLE_MAPS_API_KEY` (falls back to Nominatim), `VITE_APP_URL`, `VITE_APP_ENV`
Admin scripts only: `SUPABASE_SERVICE_ROLE_KEY` (never `VITE_`-prefixed)
Deploy only: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (32-char hex; validated by `scripts/deploy-pages.sh`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 + vite-plugin-pwa |
| Styling | Tailwind CSS 3 + custom component classes in `globals.css` |
| Routing | react-router-dom v6 |
| State | Zustand (map, auth, toasts) |
| Data fetching | TanStack Query v5 (React Query) |
| Forms | react-hook-form + Zod |
| SEO | react-helmet-async (`SeoHead` + structured data in `src/lib/seo/`) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Maps | Leaflet + react-leaflet + OpenStreetMap tiles |
| Deploy | Cloudflare Pages (`wrangler.jsonc`) |
| Payments | Stripe (via Supabase Edge Function `create-checkout-session`) |
| Transactional email | Resend (via Supabase Edge Function `notify-claim`) |

---

## Repository Structure

```
src/
  App.tsx                   # Route tree (public / portal / admin)
  main.tsx                  # React root, QueryClientProvider, HelmetProvider, BrowserRouter
  styles/globals.css        # Tailwind + reusable component classes
  types/index.ts            # All shared TypeScript types
  vite-env.d.ts             # Vite env type declarations

  lib/
    supabase.ts             # Supabase client, db.*() helpers, realtime helpers
    store.ts                # Zustand stores (map, auth, toast)
    database.types.ts       # Supabase DB types — partially HAND-EDITED, see Migrations
    mapFilters.ts           # Filter logic, category labels, emoji map, QuickFilterKey helpers
    categories.ts           # Public category-page config (/food-pantries etc. → map filters)
    conversations.ts        # Unread logic + markConversationRead for admin/provider chat
    blog.ts                 # Blog post queries
    adminCounts.ts          # Shared pending-count queries for admin nav badges
    seo/                    # SeoHead.tsx, structuredData.ts

  pages/
    HomePage.tsx            # Landing / category grid (only eagerly loaded page)
    MapPage.tsx             # Full-screen Leaflet map with search/filter
    ResourceDetailPage.tsx  # Single resource detail
    BookingPage.tsx         # Booking/request form (anonymous allowed)
    WorkExchangePage.tsx    # Work exchange listing page
    DonatePage.tsx          # Stripe donation checkout
    FaqPage.tsx             # FAQ (loaded from DB)
    LoginPage.tsx           # Custom email/password form using supabase.auth directly
    NotFoundPage.tsx        # 404 fallback
    ProviderLandingPage.tsx # Public provider onboarding pitch (/provider/onboarding)

    marketing/              # AboutPage, ContactPage, PartnersPage, PrivacyPage,
                            # TermsPage, AccessibilityPage
    blog/                   # BlogIndexPage, BlogPostPage (markdown NOT yet rendered)
    categories/             # CategoryPage — one component, parameterized by lib/categories.ts

    provider/               # Auth-gated provider portal (/portal/*)
      ProviderOnboarding.tsx  # 3-step form; creates the providers row
      ProviderDashboard.tsx
      ProviderListings.tsx / ProviderListingEdit.tsx
      ProviderBookings.tsx
      ProviderChat.tsx        # /portal/messages
      ProviderWorkExchange.tsx / WorkExchangeEdit.tsx

    admin/                  # Auth-gated admin portal (/admin/*)
      AdminDashboard.tsx
      AdminProviders.tsx / AdminProviderEdit.tsx
      AdminResources.tsx / AdminResourceEdit.tsx / AdminResourceCreate.tsx
      AdminBookings.tsx
      AdminChat.tsx           # /admin/messages
      AdminFaq.tsx
      AdminBlog.tsx           # Blog CRUD

  components/
    shared/                 # RootLayout (nav, footer, Get Help Now CTA, mobile tab bar),
                            # Footer, ToastContainer
    provider/               # ProviderLayout, BedCountUpdater
    admin/                  # AdminLayout (mobile nav, pending-count badges)
    map/                    # ResourceMarker, ResourceCard, FilterDrawer

data/
  reference/controlled_vocab.csv
  seed/streetrise_batch1_live_export.csv
  seed/streetrise_seed_candidates_batch_2_normalized.csv

docs/
  OPEN_ITEMS.md             # Open items from 2026-07-29 session
  apply-migration-029.md    # Hand-apply runbook (029 = blog_posts)
  apply-migration-030.md    # Hand-apply runbook (030 = conversation read tracking)
  data-dictionary.md
  import-seed-candidates.md

scripts/
  deploy-pages.sh           # Cloudflare Pages deploy (validates env vars)
  import-seed-candidates.ts # Seed import (needs SUPABASE_SERVICE_ROLE_KEY)

supabase/migrations/        # 001–034 with gaps: NO 012, 013, or 021 exist.
                            # See Migrations section — applied to live BY HAND.

public/
  sitemap.xml               # Public routes only (NO /portal, /admin, /login)
  robots.txt                # Disallows /portal/ and /admin/
  _redirects                # Cloudflare Pages SPA fallback
```

---

## Route Map

All public routes render inside `RootLayout` (header + footer hidden on `/map`).

| Path | Component | Notes |
|---|---|---|
| `/` | `HomePage` | Eagerly loaded (LCP) |
| `/map` | `MapPage` | Lazy; full-screen Leaflet |
| `/resources/:id` | `ResourceDetailPage` | Lazy |
| `/book/:resourceId` | `BookingPage` | Lazy; anonymous allowed |
| `/work` | `WorkExchangePage` | Lazy |
| `/donate` | `DonatePage` | Lazy; Stripe checkout |
| `/faq` | `FaqPage` | Lazy; data from DB |
| `/login` | `LoginPage` | Lazy; `?signup=1` opens signup tab; `?next=` redirect |
| `/provider/onboarding` | `ProviderLandingPage` | Public pitch page |
| `/claim` | `ClaimIndexPage` | Lazy; public directory of `unclaimed` orgs |
| `/claim/:id` | `ClaimDetailPage` | Lazy; claim submission (auth required to submit) |
| `/about`, `/contact`, `/partner-with-us`, `/privacy`, `/terms`, `/accessibility` | marketing pages | Lazy |
| `/blog`, `/blog/:slug` | blog pages | Lazy; backed by `blog_posts` |
| `/food-pantries`, `/shelters`, `/medical`, `/employment`, `/hygiene`, `/showers`, `/legal`, `/veterans`, `/youth`, `/families` | `CategoryPage` | Presentation-only aliases over existing `/map` filters via `lib/categories.ts` — never introduce new category values here |
| `/404` | `NotFoundPage` | Wildcard `*` redirects here |
| `/portal/*` | Provider portal | Auth-gated; dashboard, onboarding, listings, bookings, messages, work |
| `/admin/*` | Admin portal | Auth-gated; dashboard, providers, resources (+new), bookings, messages, faq, blog |

**`public/sitemap.xml` includes:** `/`, `/map`, `/provider/onboarding`, `/claim`, `/work`, `/donate`, `/faq`, the 10 category pages, `/about`, `/contact`, `/partner-with-us`, `/blog`, `/privacy`, `/terms`, `/accessibility`. It must never include `/login`, `/portal/*`, `/admin/*`, or individual `/claim/:id` pages.
**robots.txt disallows:** `/portal/`, `/admin/`

---

## Data Model (Key Tables)

### `providers`
Organizations that list resources. **The `providers` row is not created at signup.** `LoginPage.tsx` calls `supabase.auth.signUp()` then queries `providers` by `user_id`. New accounts without a row are routed to `/portal/onboarding`; the row is created only when the 3-step onboarding form is submitted (`ProviderOnboarding.tsx`). New rows default to `verification_status = 'pending'`; admin must approve to `verified`.

- `role`: `'provider' | 'admin' | 'super_admin'`
- `verification_status`: `'pending' | 'verified' | 'rejected' | 'suspended'`
- `ein`: optional Tax ID for nonprofits
- Trust fields (migration 010): `identity_confirmed`, `re_verification_due_at`, `suspension_reason`, `verification_notes`, `suspended_at`
- Claim fields (migrations 023–027): `claim_status`, `source_type` — **applied to live 2026-08-06** (runbook: `docs/apply-migrations-023-027.md`). Seeded org records can exist before a provider claims them; RLS locks `claim_status` against self-approval. Live state: 119 `unclaimed`/`seeded`/`verified`, 4 `claimed`/`self_registered`, 3 `unclaimed`/`seeded`/`pending`. The claim UI ships on `/claim` — see `provider_claims` below.

### `provider_claims`
Claim submissions (migration 033, applied to live 2026-08-06). One row per claim attempt: `provider_id`, `user_id`, `claim_email`, `claim_note`, `status` (`pending | approved | denied`), plus decision fields.

Exists as its own table because `providers_claim_submit` locks every column on `providers` except `user_id` and `claim_status`, so there is nowhere on that row to record who is claiming and why — and `providers_pending_claim_read` makes a mid-claim row publicly readable, so claimant PII must not live on it. Same reasoning as `conversation_admin_notes`.

- `claim_email` is pinned by RLS to `auth.jwt() ->> 'email'` — a claimant cannot submit under someone else's address. **`contact_email` (migration 034) is different**: required free text for where the claimant wants to be reached. Notification mail goes to `contact_email`; domain matching must only ever use `claim_email`, or the anti-spoofing guarantee is lost.
- RLS: claimant inserts/reads/deletes **their own** rows; admins read/update/delete all; **the public can read none**.
- Partial unique index `uniq_provider_claims_open` allows one open claim per (provider, user); re-claiming after a denial is allowed.

### `resources`
Individual service listings owned by a provider.

- `category`: `shelter | food | work_exchange | mental_health | medical | legal | hygiene | clothing | childcare | transportation | outdoor_space | day_space | substance_recovery | legal_aid | employment | outreach | hotline | healthcare | other`
- `resource_type` — **live differs from migration 011.** The live `resources_resource_type_check` constraint (verified 2026-08-06) accepts: `emergency_shelter | transitional_housing | food_pantry | hot_meal | shower_facility | restroom_access | day_use_park | warming_cooling_center | domestic_violence_shelter | veteran_housing | youth_shelter | work_exchange | crisis_hotline | job_training | legal_services | medical_clinic | mental_health_clinic | substance_recovery_program | clothing_closet | hygiene_supplies | laundry_facility | childcare_services | transportation_assistance | outreach_program | other`. Write against this list, not 011's — values like `primary_care`, `free_clinic`, `soup_kitchen`, and `legal_aid` will fail the check on live.
- `gender_policy`: `gender_inclusive | men_only | women_only | family_only | couples_only | youth_only | unknown`
- `population_focus`: text array (veterans, lgbtq, domestic_violence, families, seniors, young_adults, pregnant_women, substance_recovery, mental_health, reentry, hiv_aids)
- `access_type`: `onsite | phone_intake | web_intake | confidential_address | not_map_ready`
- `is_map_ready`: `false` when lat/lng are null or address is incomplete
- `availability_status`: `available | limited | full | unknown | closed`
- `beds_available` / `beds_total`: populated for `shelter` resources; drives realtime UI
- `tags`: mixes public tags with internal `key:value` tags (`subcategory:`, `service_area:`, `import:`, `access_src:`) — currently all rendered publicly on `ResourceDetailPage` (open item)
- Facility booleans (migration 011): `has_showers`, `has_restrooms`, `serves_meals`, `has_laundry`, `pet_friendly`, `wheelchair_accessible`, `public_transit_accessible`, `phone_required_before_arrival`, `overnight_allowed`
- Trust fields (migration 010): `confidence_score` (0–100), `stale_after_days`, `last_provider_update_at`, `last_verified_at`
- Import fields (migrations 009/016): `external_id` (stable, human-readable, e.g. `ACTS-001`), `import_batch`, `import_source`
- **Public query filter:** `is_active=true AND verification_status IN ('verified','pending') AND is_map_ready=true AND lat IS NOT NULL AND lng IS NOT NULL`

### `bookings`
Service requests submitted by users (or anonymously; `user_id` nullable since migration 007). **Status enum has drifted between repo and live:** migration 001 created `pending | confirmed | waitlisted | cancelled | completed | no_show`; the live enum was extended by hand and the TS `BookingStatus` type matches live: adds `declined | needs_info | contacted | no_response | closed`. No repo migration exists for the extension. Also carries triage fields: `admin_notes`, `provider_notes`, `decision_note`, `last_contacted_at`, `decided_at`, `contact_preference`, `best_contact_time`, `contact_consent`.

### `conversations` / `conversation_messages` / `conversation_admin_notes`
Admin↔provider messaging (migrations 014, 015, 018). `conversation_admin_notes` exists because `conversations.description` was provider-readable — admin-only triage notes live there with strict RLS. Migration 030 adds `provider_last_read_at` / `admin_last_read_at` for unread tracking (see Current Status for its live-apply state). Unread logic lives in `src/lib/conversations.ts`.

### `work_exchanges`
Volunteer/paid/skills-trade/internship opportunities posted by providers. `lat`/`lng` nullable since migration 005. The `/work` page reads **this table** — migration 008's `work_exchange` category rows live in `resources` and never appear on `/work`. Seeded in 020/028.

### `blog_posts`
Backs `/blog` and `/admin/blog` (migration 029). Public-read/admin-write RLS mirroring `faq`. `body_markdown` is not yet rendered as markdown on the public page.

### `faq`
CMS-managed FAQ items served to `/faq`.

### `donation_campaigns`
Stripe-backed campaigns; `provider_id = null` means platform-level campaign.

---

## RLS Policy Summary

Defined in `002_rls_policies.sql`, extended in `006` (verified-provider gate), `015` (conversation fixes), `018` (admin notes), and `024`–`026` (claim-flow hardening).

Key SQL helpers:
- `is_admin()` — returns `true` if current user has `role IN ('admin','super_admin')` AND `verification_status = 'verified'`
- `my_provider_id()` — returns the `providers.id` for the current user

| Table | Public read | Provider read | Admin |
|---|---|---|---|
| `providers` | verified only | own record | all |
| `resources` | active + (verified OR pending) | own | all |
| `bookings` | none | own resources' bookings | all |
| `work_exchanges` | active | own | all |
| `faq` | active | — | all |
| `blog_posts` | published | — | all |
| `donation_campaigns` | active | own | all |
| `conversations` | none | own | all |
| `conversation_admin_notes` | none | none | all |

Anonymous users can **INSERT** bookings (`bookings_public_insert` — `WITH CHECK (TRUE)`).

Known RLS gap (low severity, `docs/OPEN_ITEMS.md`): the `conversations` UPDATE policy is column-agnostic — a provider can update any column on their own conversation, not just their read timestamp.

---

## State Management

Three Zustand stores in `src/lib/store.ts`:

**`useMapStore`** (persisted as `streetrise-map-v3`)
- `mapCenter` / `mapZoom` — drive the map view sync in `MapPage`
- `filters: MapFilters` — quickFilter, category, resourceType, genderPolicy, availability, accessibility, trust, radius, and more (see `mapFilters.ts`)
- `userLocation` — set from browser geolocation; also sets `mapCenter`
- `selectedId` — which resource marker is active
- Default map center: `{ lat: 28.2, lng: -81.9 }` at zoom 9 — a wide Tampa Bay / Central Florida view

**`useAuthStore`** (persisted as `streetrise-auth`)
- `userId`, `userEmail`, `role`, `providerId`, `verificationStatus`
- `role`: `'guest' | 'provider' | 'admin' | 'super_admin'`

**`useToastStore`** (not persisted)
- Use via `useToast()` convenience hook: `toast.success(title, message)`, `toast.error(...)`, etc.
- Auto-dismisses after 4000 ms

---

## Supabase Client & Data Access

```ts
import { db, supabase } from '@/lib/supabase'

// Typed table access
db.resources()       // supabase.from('resources')
db.providers()       // supabase.from('providers')
db.bookings()        // supabase.from('bookings') as any — known lint debt, see Current Status
db.work_exchanges()
db.faq()
db.blog_posts()
db.moderation_logs()
db.donations()       // supabase.from('donation_campaigns')
db.conversations()
db.messages()        // supabase.from('conversation_messages')

// Realtime
subscribeToBedUpdates(resourceIds, callback)  // Postgres UPDATE on resources
subscribeToBookings(userId, callback)         // Postgres * on bookings for user
```

Always wrap queries in TanStack Query (`useQuery` / `useMutation`). Use `db.*()` helpers — never `supabase.from(...)` directly.

---

## CSS / Tailwind Conventions

Custom component classes are defined in `src/styles/globals.css`:

```
.card              bg-white rounded-2xl shadow-card p-4
.card-hover        card + hover shadow + cursor-pointer
.btn-primary       blue filled button
.btn-secondary     gray filled button
.btn-danger        red filled button
.btn-sm / .btn-lg  size modifiers
.btn-icon          square icon button
.input             form input with focus ring
.input-error       red-bordered variant
.label             form label
.error-text        validation error text
.badge             small pill label
.badge-available / .badge-limited / .badge-full / .badge-unknown
.badge-verified / .badge-pending
.skeleton          animated loading placeholder
.bottom-sheet      fixed mobile bottom drawer (+ .bottom-sheet-handle)
.map-container     Leaflet wrapper
.map-marker-available / -limited / -full   colored map pins
```

Brand color: `primary-600` = `#1a56db` (blue).
Availability status colors: `available` (#22c55e), `limited` (#f59e0b), `full` (#ef4444), `unknown` (#94a3b8).
Font: Inter (via `@fontsource/inter`). Dark-mode variants exist on most component classes.

---

## Key Conventions

- **Path alias**: `@/` resolves to `src/`. Always use `@/` for internal imports.
- **No test suite** — verify via `npm run typecheck` and `npm run lint`.
- **Lazy loading**: All pages except `HomePage` are `React.lazy()` split by route.
- **Category pages are presentation-only**: `lib/categories.ts` maps public slugs to existing map filters. Never introduce a new category value or alter `/map` filtering from there.
- **Category slug normalization**: `MapPage` maps URL slugs to canonical DB values via `mapFilters.ts`.
- **Booking language**: shelter → "Request a Spot" / "Beds Available"; other categories → "Request Help" / "Open Now". Never use "book" for non-reservable services.
- **Verification badges**: `verified` → "Staff Verified" (primary blue); `pending` → "Community Listed" (amber). Do not use "certified," "guaranteed," or "always up-to-date."
- **Anonymous bookings**: `bookings.user_id` is nullable. Do not require login to submit a request.
- **Never edit applied migrations** — always add a new numbered file for schema changes.
- **SEO**: public pages use `SeoHead` (`src/lib/seo/`) for titles/descriptions/structured data.

---

## Database Migrations — READ THIS BEFORE TOUCHING THE SCHEMA

Migrations live in `supabase/migrations/`, numbered 001–034 **with gaps: 012, 013, and 021 do not exist** (023 and 027 were renumbered from 010/021 to resolve collisions — see their headers).

**How they are actually applied:** by hand, in the Supabase SQL editor, against live project `mldatfcwnmvrmxumzxyb`. NOT by the deploy pipeline and not reliably by `supabase db push` — filenames have no timestamp prefixes, so repo and live migration history **drift**. Treat live as a separate source of truth; verify actual live state with read-only SQL before assuming a migration's effect exists. Runbooks for the most recent applies are in `docs/apply-migration-032.md`, `docs/apply-migrations-023-027.md`, and `docs/claim-flow.md` (033/034).

**Do not regenerate `src/lib/database.types.ts` from the CLI** unless you have confirmed live has every migration the code depends on — the `blog_posts` block and the two conversation read columns were hand-written to match intended state, and a regen against a lagging DB would delete them.

Later migrations (past the 001–011 core): 014/015/018/030 conversations system, 016 stable external IDs + dedup, 017/020/022/028 seed batches (Central Florida, work exchanges), 019 availability backfill, 023–027 provider claim flow + RLS hardening, 029 blog, 031 blog image storage, 032 South Florida seed, 033/034 claim submissions + notification fields.

---

## Deployment

- **Platform**: Cloudflare Pages (`wrangler.jsonc`, project name `streetrise`), production at app.streetrise.org
- **Build output**: `dist/`; SPA fallback via `public/_redirects`
- **CI**: `.github/workflows/deploy.yml` (named "CI") runs typecheck + build on push/PR to `main`. The workflow itself contains no deploy step; pushes to `main` reach production via the Pages integration — treat **merging to `main` as a production deploy** and never merge with red CI.
- **Manual deploy**: `npm run deploy` (needs `CLOUDFLARE_API_TOKEN` + 32-char `CLOUDFLARE_ACCOUNT_ID`)
- **Env vars**: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set in Cloudflare Pages settings and GitHub secrets. Never commit secrets.
- **PWA**: Service worker auto-registers. Supabase API responses cached 5 min (NetworkFirst). OSM tiles cached 7 days (CacheFirst).

---

## What NOT to Do

- Do not add `console.log` or debug artifacts to committed code.
- Do not skip the `tsc` step — `npm run build` runs `tsc && vite build`.
- Do not use `supabase.from(...)` directly; use the `db.*()` helpers from `@/lib/supabase`.
- Do not put `/login`, portal, or admin routes in `sitemap.xml`.
- Do not promise instant confirmation in booking copy — requests go to providers for review.
- Do not use "certified," "guaranteed," or "always up-to-date" in copy.
- Do not require login to submit a booking request (anonymous is by design).
- Do not regenerate `database.types.ts` against a live DB that lags the repo's migrations.
- Do not edit applied migrations or reuse the gap numbers (012/013/021) without checking live state first.
- Do not write to the live DB (INSERT/UPDATE/DDL) without explicit go-ahead; reads are fine.
- Do not add features or abstractions not required by the immediate task.
