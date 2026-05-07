# StreetRise — CLAUDE.md

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

## Codebase Overview

### Mission & Domain Split

- **app.streetrise.org** — this React SPA (the resource-finder app)
- **streetrise.org** — separate marketing/org site (not in this repo)

StreetRise connects people in need with verified local service providers (shelters, food pantries, clinics, legal aid, etc.) in Tampa Bay, FL. Providers manage listings; the public searches the map; no sign-up required to find resources.

---

### Tech Stack

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

### Repository Structure

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
    database.types.ts       # Hand-written Supabase DB type definitions

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

supabase/migrations/
  001_initial_schema.sql    # All tables, enums, indexes, triggers
  002_rls_policies.sql      # Row Level Security (RLS) for all tables
  003_seed_data.sql         # Seed/demo data
  004_public_pending_resources_and_access_types.sql
                            # lat/lng nullable; access_type enum; is_map_ready flag
  005_nullable_work_exchange_coords.sql
  006_security_verified_provider_gate.sql

public/
  sitemap.xml               # Only public app routes (NO /portal, /admin, /login)
  robots.txt                # Disallows /portal/ and /admin/
  _redirects               # Cloudflare Pages SPA fallback

scripts/deploy-pages.sh     # Cloudflare Pages deploy helper
```

---

### Route Map

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

### Data Model (Key Tables)

#### `providers`
Organizations that list resources. Created when a user completes signup; start as `verification_status = 'pending'`; admin must manually approve to `verified`.
- `role`: `'provider' | 'admin' | 'super_admin'`
- `verification_status`: `'pending' | 'verified' | 'rejected' | 'suspended'`
- `ein`: optional Tax ID for nonprofits

#### `resources`
Individual service listings owned by a provider.
- `category`: `shelter | food | work_exchange | mental_health | medical | legal | hygiene | clothing | childcare | transportation | other`
- `access_type`: `onsite | phone_intake | web_intake | confidential_address | not_map_ready`
- `is_map_ready`: `false` when lat/lng are null or address is incomplete
- `availability_status`: `available | limited | full | unknown | closed`
- `beds_available` / `beds_total`: populated for `shelter` resources; drives realtime UI
- Public query filter: `is_active=true AND verification_status IN ('verified','pending') AND is_map_ready=true AND lat IS NOT NULL AND lng IS NOT NULL`

#### `bookings`
Service requests submitted by users (or anonymously). Status: `pending → confirmed | waitlisted | cancelled | completed | no_show`.

#### `work_exchanges`
Volunteer/paid/skills-trade/internship opportunities posted by providers.

#### `faq`
CMS-managed FAQ items served to `/faq`.

#### `donation_campaigns`
Stripe-backed campaigns; `provider_id = null` means platform-level campaign.

---

### RLS Policy Summary

Defined in `002_rls_policies.sql`. Key SQL helpers:
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

### State Management

Three Zustand stores in `src/lib/store.ts`:

**`useMapStore`** (persisted as `streetrise-map-v2`)
- `mapCenter` / `mapZoom` — drive `MapSync` component which calls `map.setView()`
- `filters: MapFilters` — category, availability, walk-ins, radius, language, gender
- `userLocation` — set from browser geolocation; also sets `mapCenter`
- `selectedId` — which resource marker is active

**`useAuthStore`** (persisted as `streetrise-auth`)
- `userId`, `userEmail`, `role`, `providerId`, `verificationStatus`
- `role`: `'guest' | 'provider' | 'admin' | 'super_admin'`

**`useToastStore`** (not persisted)
- Use via `useToast()` convenience hook: `toast.success(title, message)`, `toast.error(...)`, etc.

---

### Supabase Client & Data Access

```ts
import { db, supabase } from '@/lib/supabase'

// Typed table access
db.resources()     // supabase.from('resources')
db.providers()     // supabase.from('providers')
db.bookings()      // supabase.from('bookings')
db.work_exchanges()
db.faq()
db.donations()     // supabase.from('donation_campaigns')

// Realtime
subscribeToBedUpdates(resourceIds, callback)  // Postgres UPDATE on resources
subscribeToBookings(userId, callback)         // Postgres * on bookings for user
```

Always wrap queries in TanStack Query (`useQuery` / `useMutation`) rather than raw `useEffect`. Use `db.resources().select(...)` not `supabase.from(...)` directly.

**Default map center:** Tampa Bay, FL — `{ lat: 27.9506, lng: -82.4572 }`  
Store key bumped to `streetrise-map-v2` to bust any cached LA coordinates.

---

### CSS / Tailwind Conventions

Custom component classes are defined in `src/styles/globals.css` — use them instead of long inline utility strings:

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

Brand color: `primary-600` = `#1a56db` (blue). Availability status colors are Tailwind custom tokens: `available` (#22c55e), `limited` (#f59e0b), `full` (#ef4444), `unknown` (#94a3b8).

Font: Inter (CSS sans stack).

---

### Key Conventions

- **Path alias**: `@/` resolves to `src/`. Always use `@/` for internal imports.
- **No test suite** — verify correctness via `npm run typecheck` and `npm run lint` (zero warnings enforced).
- **Lazy loading**: All pages except `HomePage` and `MapPage` are `React.lazy()` split by route.
- **Category slug normalization**: `MapPage` maps URL slugs (e.g. `legal_help`) to canonical DB values via `CATEGORY_SLUG_MAP`.
- **Booking language**: shelter → "Request a Spot" / "Beds Available"; other categories → "Request Help" / "Open Now". Never use "book" language for non-reservable services.
- **Verification badges**: `verified` → "Staff Verified" (primary blue); `pending` → "Community Listed" (amber). Do not use language like "certified" or "guaranteed."
- **Anonymous bookings**: The `bookings` table allows null `user_id`. Do not require login to submit a request.
- **Env vars**: All `VITE_*` prefix. Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. See `.env.example`.

---

### Development Workflow

```bash
# Install
npm install

# Local dev (requires .env.local with Supabase credentials)
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev

# Type check
npm run typecheck

# Lint (zero warnings)
npm run lint

# Build
npm run build

# Preview production build
npm run preview

# Deploy to Cloudflare Pages
npm run deploy  # runs scripts/deploy-pages.sh
# or: wrangler pages deploy dist --project-name=streetrise
```

---

### Database Migrations

Migrations live in `supabase/migrations/` and are applied in order (001–006). To apply:
```bash
supabase db push
# or paste into the Supabase SQL editor
```

Never edit a migration that has already been applied to production. Add a new numbered file for schema changes.

---

### Deployment

- **Platform**: Cloudflare Pages
- **Build output**: `dist/`
- **SPA fallback**: `public/_redirects` rewrites all paths to `/index.html`
- **Env vars**: Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages dashboard (Settings → Environment Variables) for both Preview and Production environments. Never commit secrets.
- **PWA**: Service worker auto-registers. Supabase API responses cached 5 min (NetworkFirst). Map tiles cached 7 days (CacheFirst).

---

### What NOT to Do

- Do not add `console.log` or debug artifacts to committed code.
- Do not skip the `tsc` step in the build — the build script runs `tsc && vite build`.
- Do not use `supabase.from(...)` directly; use the `db.*()` helpers from `@/lib/supabase`.
- Do not put portal or admin routes in `sitemap.xml`.
- Do not promise instant confirmation in booking copy — requests go to providers for review.
- Do not use "certified," "guaranteed," or "always up-to-date" in copy — availability depends on providers updating their listings.
- Do not require login to submit a booking request (anonymous is by design).
- Do not add features or abstractions not required by the immediate task.
