# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Active Task

Assess the code and public experience against the true StreetRise mission:
**connect people in need with real local resources updated in real time.**

1. Identify where the current product drifts from that goal.
2. Focus on shortcomings that would hurt a first live debut:
   - provider onboarding not clearly reachable
   - "resource" vs "provider" terminology confusion
   - broken or misleading public links
   - sitemap including routes that should not be indexed
   - partner CTA leading to 404
   - missing support/contact info
   - misleading trust/verification language
   - work exchange CTA not being real
   - booking copy overpromising
   - public UX feeling fragmented between marketing and app
   - anything that weakens the real-time accuracy/trust story
3. Do not overengineer. Do not redesign architecture.
4. Recommend only safe, launch-focused fixes.
5. Make sure sitemap.xml only includes intended public app routes.
6. Prefer honest copy over hype. Preserve what is already working.

**Output format:**
- Brief assessment of how close StreetRise is to first live debut
- List of shortcomings that must be fixed before commit
- Safest patch plan
- Exact code edits or a patch
- Flag anything that should live on streetrise.org vs app.streetrise.org

---

## Mission & Domain Split

- **app.streetrise.org** — this React SPA (the resource-finder app)
- **streetrise.org** — separate marketing/org site (not in this repo)

StreetRise connects people in need with verified local service providers (shelters, food pantries, clinics, legal aid, etc.) in Tampa Bay, FL. Providers manage listings; the public searches the map; no sign-up required to find resources.

---

## Commands

```bash
npm run dev          # Vite dev server (requires .env.local)
npm run build        # tsc + vite build (typecheck is mandatory)
npm run typecheck    # Type-only check without building
npm run lint         # ESLint — zero warnings enforced
npm run preview      # Preview production build locally
npm run deploy       # Deploy dist/ to Cloudflare Pages via wrangler
npm run import:seed  # Run scripts/importSeedCandidates.ts via tsx
```

**Setup:**
```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (minimum required)
```

Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
Optional: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_GOOGLE_MAPS_API_KEY` (falls back to Nominatim), `VITE_APP_URL`, `VITE_APP_ENV`  
Admin scripts only: `SUPABASE_SERVICE_ROLE_KEY`

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
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Maps | Leaflet + react-leaflet + OpenStreetMap tiles |
| Deploy | Cloudflare Pages (`wrangler.jsonc`) |
| Payments | Stripe (via Supabase Edge Function `create-checkout-session`) |

---

## Repository Structure

```
src/
  App.tsx                   # Route tree (public / portal / admin)
  main.tsx                  # React root, QueryClientProvider, BrowserRouter
  styles/globals.css        # Tailwind + reusable component classes
  types/index.ts            # All shared TypeScript types
  vite-env.d.ts             # Vite env type declarations

  lib/
    supabase.ts             # Supabase client, db helpers, realtime helpers
    store.ts                # Zustand stores (map, auth, toast)
    database.types.ts       # Auto-generated Supabase DB type definitions
    mapFilters.ts           # Filter logic, category labels, emoji map, QuickFilterKey helpers

  pages/
    HomePage.tsx            # Landing / category grid
    MapPage.tsx             # Full-screen Leaflet map with search/filter
    ResourceDetailPage.tsx  # Single resource detail
    BookingPage.tsx         # Booking/request form (anonymous allowed)
    WorkExchangePage.tsx    # Work exchange listing page
    DonatePage.tsx          # Stripe donation checkout
    FaqPage.tsx             # FAQ (loaded from DB)
    LoginPage.tsx           # Supabase Auth UI
    NotFoundPage.tsx        # 404 fallback
    ProviderLandingPage.tsx # Public provider onboarding pitch (/provider/onboarding)

    provider/               # Auth-gated provider portal (/portal/*)
      ProviderOnboarding.tsx
      ProviderDashboard.tsx
      ProviderListings.tsx / ProviderListingEdit.tsx
      ProviderBookings.tsx
      ProviderWorkExchange.tsx / WorkExchangeEdit.tsx

    admin/                  # Auth-gated admin portal (/admin/*)
      AdminDashboard.tsx
      AdminProviders.tsx / AdminProviderEdit.tsx
      AdminResources.tsx / AdminResourceEdit.tsx
      AdminBookings.tsx
      AdminFaq.tsx

  components/
    shared/RootLayout.tsx   # Public layout wrapper (nav, footer)
    provider/ProviderLayout.tsx
    admin/AdminLayout.tsx
    map/                    # ResourceMarker, ResourceCard, FilterDrawer

data/                       # Controlled vocabulary CSV + seed candidate CSV
scripts/                    # Data import scripts (run via tsx / import:seed)

supabase/migrations/
  001_initial_schema.sql    # All tables, enums, indexes, triggers
  002_rls_policies.sql      # Row Level Security (RLS) for all tables
  003_seed_data.sql         # Seed FAQ entries (10 items)
  004_public_pending_resources_and_access_types.sql
                            # access_type enum; lat/lng nullable; is_map_ready flag
  005_nullable_work_exchange_coords.sql
  006_security_verified_provider_gate.sql
  007_outdoor_space_and_nullable_user_id.sql
                            # outdoor_space category; nullable bookings.user_id
  008_seed_tampa_bay_providers_resources.sql
                            # Demo data for Tampa Bay region
  009_import_tracking_fields.sql
                            # external_id, import_batch, import_source on resources
  010_verification_trust_system.sql
                            # confidence_score, stale_after_days, last_verified_at on resources;
                            # identity_confirmed, re_verification_due_at, suspension_reason on providers
  011_map_taxonomy.sql      # Extended categories, resource_type, gender_policy, population_focus,
                            # facility booleans (has_showers, has_restrooms, serves_meals,
                            # has_laundry, pet_friendly, wheelchair_accessible,
                            # public_transit_accessible), phone_required_before_arrival,
                            # overnight_allowed; includes backfill logic

public/
  sitemap.xml               # Only public app routes (NO /portal, /admin, /login)
  robots.txt                # Disallows /portal/ and /admin/
  _redirects                # Cloudflare Pages SPA fallback
```

---

## Route Map

| Path | Component | Notes |
|---|---|---|
| `/` | `HomePage` | Eagerly loaded (LCP) |
| `/map` | `MapPage` | Eagerly loaded; full-screen Leaflet |
| `/resources/:id` | `ResourceDetailPage` | Lazy |
| `/book/:resourceId` | `BookingPage` | Lazy; anonymous allowed |
| `/work` | `WorkExchangePage` | Lazy |
| `/donate` | `DonatePage` | Lazy; Stripe checkout |
| `/faq` | `FaqPage` | Lazy; data from DB |
| `/login` | `LoginPage` | Lazy; `?signup=1` opens signup tab |
| `/provider/onboarding` | `ProviderLandingPage` | Public pitch page; links to `/login?signup=1` |
| `/404` | `NotFoundPage` | Wildcard `*` redirects here |
| `/portal/*` | Provider portal | Auth-gated; `ProviderLayout` |
| `/admin/*` | Admin portal | Auth-gated; `AdminLayout` |

**Sitemap includes only:** `/`, `/map`, `/provider/onboarding`, `/donate`, `/faq`  
**robots.txt disallows:** `/portal/`, `/admin/`

---

## Data Model (Key Tables)

### `providers`
Organizations that list resources. **The `providers` row is not created at signup.** `LoginPage.tsx` calls `supabase.auth.signUp()` then queries `providers` by `user_id`. New accounts without a row are routed to `/portal/onboarding`; the row is created only when the 3-step onboarding form is submitted (`ProviderOnboarding.tsx`). New rows default to `verification_status = 'pending'`; admin must approve to `verified`.

- `role`: `'provider' | 'admin' | 'super_admin'`
- `verification_status`: `'pending' | 'verified' | 'rejected' | 'suspended'`
- `ein`: optional Tax ID for nonprofits
- Trust fields (migration 010): `identity_confirmed`, `re_verification_due_at`, `suspension_reason`, `verification_notes`, `suspended_at`

### `resources`
Individual service listings owned by a provider.

- `category`: `shelter | food | work_exchange | mental_health | medical | legal | hygiene | clothing | childcare | transportation | outdoor_space | day_space | substance_recovery | legal_aid | employment | outreach | hotline | healthcare | other`
- `resource_type` (migration 011): `emergency_shelter | transitional_housing | permanent_supportive | rapid_rehousing | food_pantry | hot_meal | mobile_meal | soup_kitchen | primary_care | urgent_care | mobile_clinic | free_clinic | dental | vision | mental_health_counseling | substance_recovery | harm_reduction | legal_aid | employment_training | day_center | public_restroom | public_shower | other`
- `gender_policy`: `gender_inclusive | men_only | women_only | family_only | couples_only | youth_only | unknown`
- `population_focus`: text array (veterans, lgbtq, domestic_violence, families, seniors, young_adults, pregnant_women, substance_recovery, mental_health, reentry, hiv_aids)
- `access_type`: `onsite | phone_intake | web_intake | confidential_address | not_map_ready`
- `is_map_ready`: `false` when lat/lng are null or address is incomplete
- `availability_status`: `available | limited | full | unknown | closed`
- `beds_available` / `beds_total`: populated for `shelter` resources; drives realtime UI
- Facility booleans (migration 011): `has_showers`, `has_restrooms`, `serves_meals`, `has_laundry`, `pet_friendly`, `wheelchair_accessible`, `public_transit_accessible`, `phone_required_before_arrival`, `overnight_allowed`
- Trust fields (migration 010): `confidence_score` (0–100), `stale_after_days`, `last_provider_update_at`, `last_verified_at`
- Import fields (migration 009): `external_id`, `import_batch`, `import_source`
- **Public query filter:** `is_active=true AND verification_status IN ('verified','pending') AND is_map_ready=true AND lat IS NOT NULL AND lng IS NOT NULL`

### `bookings`
Service requests submitted by users (or anonymously). Status: `pending → confirmed | waitlisted | cancelled | completed | no_show`. `user_id` is nullable (anonymous allowed since migration 007).

### `work_exchanges`
Volunteer/paid/skills-trade/internship opportunities posted by providers. `lat`/`lng` nullable since migration 005.

### `faq`
CMS-managed FAQ items served to `/faq`.

### `donation_campaigns`
Stripe-backed campaigns; `provider_id = null` means platform-level campaign.

---

## RLS Policy Summary

Defined in `002_rls_policies.sql` and extended in `006_security_verified_provider_gate.sql`.

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
| `donation_campaigns` | active | own | all |

Anonymous users can **INSERT** bookings (`bookings_public_insert` — `WITH CHECK (TRUE)`).

---

## State Management

Three Zustand stores in `src/lib/store.ts`:

**`useMapStore`** (persisted as `streetrise-map-v3`)
- `mapCenter` / `mapZoom` — drive `MapSync` component which calls `map.setView()`
- `filters: MapFilters` — quickFilter, category, resourceType, genderPolicy, availability, accessibility, trust, radius, language, and more (see `mapFilters.ts`)
- `userLocation` — set from browser geolocation; also sets `mapCenter`
- `selectedId` — which resource marker is active
- Default map center: Tampa Bay, FL — `{ lat: 27.9506, lng: -82.4572 }` at zoom 12

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
db.bookings()        // supabase.from('bookings')
db.work_exchanges()
db.faq()
db.moderation_logs()
db.donations()       // supabase.from('donation_campaigns')

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
.badge-available / .badge-limited / .badge-full / .badge-unknown / .badge-verified
.skeleton          animated loading placeholder
.bottom-sheet      fixed mobile bottom drawer
```

Brand color: `primary-600` = `#1a56db` (blue).  
Availability status colors: `available` (#22c55e), `limited` (#f59e0b), `full` (#ef4444), `unknown` (#94a3b8).  
Font: Inter (CSS sans stack).

---

## Key Conventions

- **Path alias**: `@/` resolves to `src/`. Always use `@/` for internal imports.
- **No test suite** — verify via `npm run typecheck` and `npm run lint` (zero warnings).
- **Lazy loading**: All pages except `HomePage` and `MapPage` are `React.lazy()` split by route.
- **Category slug normalization**: `MapPage` maps URL slugs (e.g. `legal_help`) to canonical DB values via `CATEGORY_SLUG_MAP` in `mapFilters.ts`.
- **Booking language**: shelter → "Request a Spot" / "Beds Available"; other categories → "Request Help" / "Open Now". Never use "book" for non-reservable services.
- **Verification badges**: `verified` → "Staff Verified" (primary blue); `pending` → "Community Listed" (amber). Do not use "certified," "guaranteed," or "always up-to-date."
- **Anonymous bookings**: `bookings.user_id` is nullable. Do not require login to submit a request.
- **Never edit applied migrations** — always add a new numbered file for schema changes.

---

## Database Migrations

Migrations live in `supabase/migrations/` and are applied in order (001–011).

```bash
supabase db push
# or paste into the Supabase SQL editor
```

---

## Deployment

- **Platform**: Cloudflare Pages (`wrangler.jsonc`)
- **Build output**: `dist/`
- **SPA fallback**: `public/_redirects` rewrites all paths to `/index.html`
- **Env vars**: Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages → Settings → Environment Variables for both Preview and Production. Never commit secrets.
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) — triggers on push/PR to `main`; runs `tsc`, `vite build` with env secrets.
- **PWA**: Service worker auto-registers. Supabase API responses cached 5 min (NetworkFirst). Map tiles cached 7 days (CacheFirst).

---

## What NOT to Do

- Do not add `console.log` or debug artifacts to committed code.
- Do not skip the `tsc` step — `npm run build` runs `tsc && vite build`.
- Do not use `supabase.from(...)` directly; use the `db.*()` helpers from `@/lib/supabase`.
- Do not put portal or admin routes in `sitemap.xml`.
- Do not promise instant confirmation in booking copy — requests go to providers for review.
- Do not use "certified," "guaranteed," or "always up-to-date" in copy.
- Do not require login to submit a booking request (anonymous is by design).
- Do not add features or abstractions not required by the immediate task.
