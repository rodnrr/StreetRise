# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working With the Maintainer

The maintainer often works from an **iPhone** with no terminal access. At the start of each new session, ask which device they are on (iPhone / Windows / Mac / Linux) before giving any device-specific instructions. Never assume a desktop shell: when they are on iPhone, prefer dashboard/web-UI steps, and deliver files by attaching them to the chat instead of pointing at local paths or git commands.

## Current Status

The pre-debut launch review described in earlier versions of this file is **done** — its findings and applied fixes are recorded in `LAUNCH_REVIEW.md` (footer, contact info, sitemap corrections, honest copy, "Become a Provider" nav entry all shipped). Open work is tracked in:

- `docs/OPEN_ITEMS.md` — session log of open items (blog gaps, internal-tag leak on `ResourceDetailPage`, lint debt; the migration 030 item is now closed)
- `BRANCH_FRESHNESS_AUDIT.md` — runbook for cleaning up stale AI session branches
- `LAUNCH_REVIEW.md` — the completed launch assessment, kept for reference

Known open items (verified 2026-07-31; migration 036 added 2026-08-18):

- **The blog publisher Worker exists on Cloudflare but is running placeholder code, not the real one** (`workers/blog-publisher/`). Verified live 2026-08-25: a Worker named `streetrise-blog-publisher` was created on 2026-08-21 (shortly after PRs #81/#82 merged), but `workers_get_worker_code` shows its deployed script is still Cloudflare's stock `"Hello world"` template — the actual source under `workers/blog-publisher/src/` was never pushed to it. This is a different failure mode than "not deployed": the Worker resource is visible in the dashboard, so it's easy to assume setup finished when it didn't. Likely cause: the Worker was created via the dashboard's quick-start ("Hello World" template, name matched by hand) rather than the "Import a repository" flow in `docs/deploy-blog-worker.md` step 3, so Workers Builds was never wired to the repo. Until the real code is deployed (`npm run worker:blog:deploy` or redoing step 3 via Import a repository) and `VITE_BLOG_WORKER_URL` is set in Cloudflare Pages, the AI Draft panel on `/admin/blog` stays hidden and the feature is inert. Setup steps: `docs/deploy-blog-worker.md` for the dashboard-only path (no terminal), `workers/blog-publisher/README.md` for the CLI path and the request/response contract. Nothing about it has been exercised against the real Workers AI models yet, so treat the first real run as the real test. Note for future sessions: a Claude Code remote session cannot deploy this itself — the sandbox's egress policy blocks direct calls to `api.cloudflare.com` (confirmed 403 from the agent proxy), and the Cloudflare MCP connector available here is read-only for Workers (list/get/get-code, no deploy or secret-write). The maintainer has to run the deploy themselves, from the dashboard or their own terminal.

- **Migration 036 (student clothing seed) APPLIED to live 2026-08-18.** Runbook + verification: `docs/apply-migration-036.md`. Added the platform's first `clothing` listings (20 resources, 15 providers) and the `students` population-focus tag; public map total 146 → 166. Partnership leads deliberately kept off the public map are in `docs/student-resources-outreach.md`.
- **Migration 037 (confidence trigger parity) is NOT applied, and needs a decision.** Its DDL is a no-op on live — live already has both triggers; the repo did not, so a rebuilt database scored `pending` rows ~80 instead of 35. But its **backfill is a real production data change**: it re-scores 66 stale `verified` rows to 20 (measured 2026-08-18). Nothing leaves the map (`MIN_CONFIDENCE_SCORE` is 20, tested `>=`) and `updated_at` is untouched, so no listing gains false freshness. Unhurried — the parity gap only bites a rebuilt database. Read `docs/apply-migration-037.md` before running it.
- ~~Migration 030 was not yet applied to live~~ — **applied and verified 2026-08-18** (`docs/apply-migration-030.md`). Both `provider_last_read_at` and `admin_last_read_at` exist on live with the intended shape, and `admin_last_read_at` carries real values, so writes to it are landing rather than no-opping as they did before the columns existed. (Those values do not by themselves prove the app path: `conversations_update` is column-agnostic and the SQL editor can write the column too, so the authenticated smoke test in the runbook is still outstanding.) **Unread does not fully clear yet**: opening a thread marks it read, but *sending* into the open thread re-marks it unread for the sender — `bump_conversation_on_message` advances `last_message_at` and neither send handler re-marks read (see `docs/OPEN_ITEMS.md`). Note the apply is **not** recorded in `supabase_migrations.schema_migrations` — that table is drifted and also missing 032–035; verify live columns, not that table.
- **`npm run lint`, `npm run typecheck`, and `npm run build` are all clean** (re-verified 2026-08-06). The previously documented lint error on `supabase.from('bookings') as any` is gone — `src/lib/supabase.ts` now carries an `eslint-disable-next-line` for it, so the cast itself is still lint debt to unwind when `database.types.ts` is regenerated.
- **`BlogPostPage` does not render markdown** — `body_markdown` is shown in a `whitespace-pre-wrap` div. `cover_image_url` now renders (hero on `BlogPostPage`, thumbnail on `BlogIndexPage`, og:image) when set; images are hosted in the R2 bucket `assets-streetrise` — upload + DB-update runbook in `docs/r2-blog-images.md`.
- **Internal tags leak on `ResourceDetailPage`** — tags with `subcategory:`, `service_area:`, `import:`, `access_src:` prefixes render as public badges. Recommended fix (a `publicTags()` filter) is written up in `docs/OPEN_ITEMS.md`.
- **Provider signup depends on two column defaults.** `providers_insert_self` (tightened by migration 023) requires `claim_status='claimed'` and `source_type='self_registered'`, but `ProviderOnboarding.tsx` sets neither — the column defaults supply both before `WITH CHECK` runs. Drop or change those defaults and provider signup starts failing RLS.
- **Therefore: a seed migration MUST set `claim_status='unclaimed'` and `source_type='seeded'` explicitly.** Those column defaults exist for the signup path above, so an INSERT that omits them marks a seeded org as though a person had registered and claimed it — false provenance, and a dead end, because a `claimed` org can never be claimed at `/claim`. Migration 027 exists because this went wrong once; it happened again while applying 036 and was caught by diffing live against the migration file. Every seeded provider on live should be `unclaimed`/`seeded` with `user_id IS NULL`.
- ~~Claiming an org hides it from `/work`~~ — **fixed by migration 033**, which adds `providers_pending_claim_read` so a mid-claim org stays publicly visible.
- ~~Default map center still points at Tampa Bay~~ — **mitigated by the map revamp (2026-08-17)**. `useMapStore` still opens at `{ lat: 28.2, lng: -81.9 }` zoom 9, but `MapPage` now auto-fits the map to the current result set on load and whenever the need chip or search changes, so a Miami visitor who grants nothing still lands on a view containing pins. The stored centre follows the fit, so distances are measured from where the map actually is. Changing the literal default is no longer urgent.

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
npm run agent:work   # Work exchange agent (scripts/work-exchange-agent.ts) — dry run unless --apply
npm run worker:blog:typecheck  # Type-check the blog publisher Worker (also runs in CI)
npm run worker:blog:dev        # wrangler dev for the Worker
npm run worker:blog:deploy     # wrangler deploy for the Worker
```

**Setup:**
```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (minimum required)
```

Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
Optional: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_GOOGLE_MAPS_API_KEY` (falls back to Nominatim), `VITE_APP_URL`, `VITE_APP_ENV`, `VITE_BLOG_WORKER_URL` (blog publisher Worker origin — unset hides the AI Draft panel on `/admin/blog`)
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
    mapFilters.ts           # Map data layer: one fetch of the public set, then client-side
                            # filtering + facet counting. NEED_DEFS/TOGGLE_DEFS are the
                            # single source of truth for what the map can filter on.
    geo.ts                  # Haversine distance + mile formatting (map sorting/filtering)
    categories.ts           # Public category-page config (/food-pantries etc. → map filters)
    conversations.ts        # Unread logic + markConversationRead for admin/provider chat
    blog.ts                 # Blog post queries
    adminCounts.ts          # Shared pending-count queries for admin nav badges
    auth.ts                 # OAuth-provider probe, magic link, shared post-login routing
    lazyWithReload.ts       # React.lazy that survives a deploy under an open tab
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
      AdminWorkExchange.tsx   # Review queue for the work exchange agent

  components/
    shared/                 # RootLayout (nav, footer, Get Help Now CTA, mobile tab bar),
                            # Footer, ToastContainer
    provider/               # ProviderLayout, BedCountUpdater
    admin/                  # AdminLayout (mobile nav, pending-count badges)
    map/                    # ResourceMarker (cached div icons), ResourceCard (list row),
                            # ResourceSheet (detail overlay + Call / Request / Ask / Website /
                            # Directions actions), FilterDrawer (counted refinements)

data/
  reference/controlled_vocab.csv
  seed/streetrise_batch1_live_export.csv
  seed/streetrise_seed_candidates_batch_2_normalized.csv

docs/
  OPEN_ITEMS.md             # Open items from 2026-07-29 session
  apply-migration-029.md    # Hand-apply runbook (029 = blog_posts)
  apply-migration-030.md    # Hand-apply runbook (030 = conversation read tracking)
  apply-migration-035.md    # Hand-apply runbook (035 = work exchange agent)
  apply-migration-036.md    # Hand-apply runbook (036 = student clothing seed)
  apply-migration-037.md    # Hand-apply runbook (037 = confidence trigger parity; DDL is a
                            # no-op on live, but its backfill re-scores 66 rows — read first)
  deploy-blog-worker.md     # Dashboard-only runbook for shipping the blog publisher Worker
                            # (merging the PR does not deploy it)
  student-resources-outreach.md  # Partnership leads deliberately NOT on the public map
  work-exchange-agent.md    # What the agent does, how to run it, review workflow
  data-dictionary.md
  import-seed-candidates.md

scripts/
  deploy-pages.sh           # Cloudflare Pages deploy (validates env vars)
  import-seed-candidates.ts # Seed import (needs SUPABASE_SERVICE_ROLE_KEY)
  work-exchange-agent.ts    # Re-verifies /work listings + drafts new ones into a review queue.
                            # Needs SUPABASE_SERVICE_ROLE_KEY + ANTHROPIC_API_KEY. Never publishes.

workers/
  blog-publisher/           # Cloudflare Worker: generates an UNPUBLISHED blog draft +
                            # cover image with Workers AI. Deployed separately from the
                            # app; runs on the caller's admin token, holds no service-role
                            # key. Covers go to the Supabase `blog-images` bucket, not R2.
                            # Reached from the AI Draft panel on /admin/blog.

supabase/migrations/        # 001–037 with gaps: NO 012, 013, or 021 exist.
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
| `/book/:resourceId` | `BookingPage` | Lazy; anonymous allowed. `?intent=question` switches it to "Ask a Question": party size and dates are hidden and `notes` becomes required. Same `bookings` row either way. |
| `/work` | `WorkExchangePage` | Lazy |
| `/donate` | `DonatePage` | Lazy; Stripe checkout |
| `/faq` | `FaqPage` | Lazy; data from DB |
| `/login` | `LoginPage` | Lazy; `?signup=1` opens signup tab; `?next=` redirect; magic-link sign-in; social buttons render only for providers Supabase reports as enabled |
| `/forgot-password` | `ForgotPasswordPage` | Lazy; never reveals whether an account exists |
| `/reset-password` | `ResetPasswordPage` | Lazy; handles both implicit-fragment and PKCE `?code=` links |
| `/auth/callback` | `AuthCallbackPage` | Lazy; OAuth return, resolves post-login destination |
| `/provider/onboarding` | `ProviderLandingPage` | Public pitch page |
| `/claim` | `ClaimIndexPage` | Lazy; public directory of `unclaimed` orgs |
| `/claim/:id` | `ClaimDetailPage` | Lazy; claim submission (auth required to submit) |
| `/about`, `/contact`, `/partner-with-us`, `/privacy`, `/terms`, `/accessibility` | marketing pages | Lazy |
| `/blog`, `/blog/:slug` | blog pages | Lazy; backed by `blog_posts` |
| `/food-pantries`, `/shelters`, `/medical`, `/employment`, `/hygiene`, `/showers`, `/legal`, `/veterans`, `/youth`, `/families`, `/students` | `CategoryPage` | Presentation-only aliases over existing `/map` filters via `lib/categories.ts` — never introduce new category values here |
| `/404` | `NotFoundPage` | Wildcard `*` redirects here |
| `/portal/*` | Provider portal | Auth-gated; dashboard, onboarding, listings, bookings, messages, work |
| `/admin/*` | Admin portal | Auth-gated; dashboard, providers, resources (+new), bookings, work-exchange, messages, faq, blog |

**`public/sitemap.xml` includes:** `/`, `/map`, `/provider/onboarding`, `/claim`, `/work`, `/donate`, `/faq`, the 11 category pages, `/about`, `/contact`, `/partner-with-us`, `/blog`, `/privacy`, `/terms`, `/accessibility`. It must never include `/login`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/portal/*`, `/admin/*`, or individual `/claim/:id` pages.
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
- `population_focus`: text array (veterans, lgbtq, domestic_violence, families, **students**, seniors, young_adults, pregnant_women, substance_recovery, mental_health, reentry, hiv_aids). Unconstrained `TEXT[]` on live — adding a tag needs no DDL. **`students` (migration 036) is the axis for school-age support**: `category` says what a service *is*, `population_focus` says who it *serves*, so a school clothing closet is `clothing` + `{students}` and a school-based pantry would be `food` + `{students}`. Never add a `students`/`education` category value — it would force an either/or with the real category.
- `access_type`: `onsite | phone_intake | web_intake | confidential_address | not_map_ready`
- `is_map_ready`: `false` when lat/lng are null or address is incomplete
- `availability_status`: `available | limited | full | unknown | closed`
- `beds_available` / `beds_total`: populated for `shelter` resources; drives realtime UI
- `hours_of_operation`: `{ monday: { open, close, closed }, …, notes, summary, source_url, verified_at }`. The per-day shape is what `AdminResourceEdit` writes and `ResourceDetailPage` renders, and it is what powers the "Open right now" filter; `summary` is the human sentence shown on the map card. **111 of 146 public listings carry per-day hours as of 2026-08-17** (researched from public sources); 38 of those were reshaped from the seeded summary and are tagged `basis: 'listing_summary'` for auditing. Where a service has two sittings a day (lunch *and* dinner) the day window deliberately under-claims and `summary`/`notes` carry the full picture — a false "open" sends someone on a wasted trip.
- `tags`: mixes public tags with internal `key:value` tags (`subcategory:`, `service_area:`, `import:`, `access_src:`) — currently all rendered publicly on `ResourceDetailPage` (open item)
- Facility booleans (migration 011): `has_showers`, `has_restrooms`, `serves_meals`, `has_laundry`, `pet_friendly`, `wheelchair_accessible`, `public_transit_accessible`, `phone_required_before_arrival`, `overnight_allowed`
- Trust fields (migration 010): `confidence_score` (0–100), `stale_after_days`, `last_provider_update_at`, `last_verified_at`
- Import fields (migrations 009/016): `external_id` (stable, human-readable, e.g. `ACTS-001`), `import_batch`, `import_source`
- **Public query filter:** `is_active=true AND verification_status IN ('verified','pending') AND is_map_ready=true AND lat IS NOT NULL AND lng IS NOT NULL`

### `bookings`
Service requests submitted by users (or anonymously; `user_id` nullable since migration 007). **Status enum has drifted between repo and live:** migration 001 created `pending | confirmed | waitlisted | cancelled | completed | no_show`; the live enum was extended by hand and the TS `BookingStatus` type matches live: adds `declined | needs_info | contacted | no_response | closed`. No repo migration exists for the extension. Also carries triage fields: `admin_notes`, `provider_notes`, `decision_note`, `last_contacted_at`, `decided_at`, `contact_preference`, `best_contact_time`, `contact_consent`.

### `conversations` / `conversation_messages` / `conversation_admin_notes`
Admin↔provider messaging (migrations 014, 015, 018). `conversation_admin_notes` exists because `conversations.description` was provider-readable — admin-only triage notes live there with strict RLS. Migration 030 adds `provider_last_read_at` / `admin_last_read_at` for unread tracking — applied to live, verified 2026-08-18. Unread logic lives in `src/lib/conversations.ts`.

### `work_exchanges`
Volunteer/paid/skills-trade/internship opportunities posted by providers. `lat`/`lng` nullable since migration 005. The `/work` page reads **this table** — migration 008's `work_exchange` category rows live in `resources` and never appear on `/work`. Seeded in 020/028/032.

Migration 035 adds provenance: `external_id`, `source_url` (the public "get involved / careers" page the listing came from), `source_type` (`provider_posted | seeded | agent_assisted`), `last_verified_at`, `last_verify_status` (`confirmed | changed | gone | unclear | unreachable`). All 29 seeded rows are backfilled with theirs (17 from 020/028, 12 from 032 — 032 seeds work exchanges too, which this file previously did not say). Where the seed named no page, the backfill falls back to the provider's `website`, which is where /work's "Apply on Website" button already points. `source_url` is what the agent re-reads; a listing with none is skipped.

### `work_exchange_candidates`
Review queue for `scripts/work-exchange-agent.ts` (migration 035). One row per proposed change: `kind` (`new | update | delist`), `status` (`pending | approved | rejected | applied`), the `proposed` payload as JSONB, plus `source_url`, a verbatim `evidence` quote from the page, `confidence`, and the run/model that produced it.

**The agent never publishes.** It writes `last_verified_at` / `last_verify_status` on `work_exchanges` and nothing else; every content change lands here and an admin approves it at `/admin/work-exchange`. RLS is admin-only — not public (unreviewed machine output about a real charity) and not provider-readable (a provider should not see a draft about their org before a human has). Two partial unique indexes keep re-runs from duplicating an already-open proposal. Runbook: `docs/work-exchange-agent.md`.

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

**`useMapStore`** (persisted as `streetrise-map-v4`)
- `mapCenter` / `mapZoom` — the map's initial view, then updated from every settled move (dragged **and** programmatic, so the distance origin tracks the real view)
- `filters: MapFilters` — `need` (the active chip), plus resourceType, genderPolicy, populationFocus, access/facility/trust toggles, radius (see `mapFilters.ts`). `quickFilter` and `category` are retained only so old deep links keep working.
- `userLocation` — set from browser geolocation; also sets `mapCenter`
- `selectedId` — which resource is open in the detail sheet (shared by the map pins and the list)
- `clearRefinements()` drops every refinement but keeps the active need chip; `clearFilters()` drops everything
- Default map center: `{ lat: 28.2, lng: -81.9 }` at zoom 9, but `MapPage` auto-fits to the results on load
- **v4 bumped the key deliberately**: `radius` no longer defaults to 20 km, so a persisted v3 filter set would have kept silently narrowing the new map

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
- **Category pages are presentation-only**: `lib/categories.ts` maps public slugs to existing map filters. Never introduce a new category value or alter `/map` filtering from there. `fetchCategoryResources()` applies the **same public visibility predicate as the map** (`verification_status IN ('verified','pending')`) — if a category page ever shows a smaller set than the map it links into, that is a bug. `CategoryPage` cards carry the Staff Verified / Community Listed badge so pending rows stay honest.
- **The map fetches once and filters in the browser.** `fetchMapResources()` applies only the public visibility predicate; every facet is a predicate in `mapFilters.ts`. This is what lets each option show the number of results it would return. Adding a filter means adding a `NEED_DEFS` entry or a `TOGGLE_DEFS` row — not a new Supabase query.
- **Filter options prune themselves.** `isUsefulOption(count, base)` hides any option matching nothing or matching everything, so filters the data can't support (nothing is tagged pet-friendly; every row says no call is needed) disappear until providers fill the field in. Never hard-code a filter's visibility.
- **Unknown means "maybe", not "no".** `overnight_allowed` is null on most rows and `gender_policy` is often `unknown`; these fail *open* so a real bed is never hidden from someone who needs it. Only an explicit `false`/mismatch excludes a listing.
- **"Open right now" is the one filter that fails _closed_**, because it makes a positive claim rather than gating eligibility: a listing with no published hours cannot be asserted to be open. `MapPage` shows a count of what was set aside for that reason so those listings aren't hidden silently. Don't "fix" this to match the fail-open rule.
- **Hours are evaluated in `America/New_York`, never the visitor's timezone** (`RESOURCE_TIME_ZONE` in `mapFilters.ts`). Every listing is in Florida; a visitor in California at 8 PM is looking at 11 PM in Tampa. `zonedNow()` resolves the weekday and minute there, and handles EST/EDT automatically. `MapPage` re-reads the clock every 60 s so results expire on their own.
- **The map has no list/map toggle.** The map card and the results list are always both on screen, and a pin and a list row open the same `ResourceSheet`. Don't reintroduce a mode switch.
- **Category slug normalization**: `MapPage` maps URL slugs to canonical DB values via `mapFilters.ts`.
- **Booking language**: shelter → "Request a Spot" / "Beds Available"; other categories → "Request Help" / "Open Now". Never use "book" for non-reservable services.
- **Verification badges**: `verified` → "Staff Verified" (primary blue); `pending` → "Community Listed" (amber). Do not use "certified," "guaranteed," or "always up-to-date."
- **Anonymous bookings**: `bookings.user_id` is nullable. Do not require login to submit a request.
- **Never edit applied migrations** — always add a new numbered file for schema changes.
- **SEO**: public pages use `SeoHead` (`src/lib/seo/`) for titles/descriptions/structured data.

---

## Database Migrations — READ THIS BEFORE TOUCHING THE SCHEMA

Migrations live in `supabase/migrations/`, numbered 001–037 **with gaps: 012, 013, and 021 do not exist** (023 and 027 were renumbered from 010/021 to resolve collisions — see their headers).

**How they are actually applied:** by hand, in the Supabase SQL editor, against live project `mldatfcwnmvrmxumzxyb`. NOT by the deploy pipeline and not reliably by `supabase db push` — filenames have no timestamp prefixes, so repo and live migration history **drift**. Treat live as a separate source of truth; verify actual live state with read-only SQL before assuming a migration's effect exists. Runbooks for the most recent applies are in `docs/apply-migration-032.md`, `docs/apply-migrations-023-027.md`, and `docs/claim-flow.md` (033/034).

**Do not regenerate `src/lib/database.types.ts` from the CLI** unless you have confirmed live has every migration the code depends on — the `blog_posts` block and the two conversation read columns were hand-written to match intended state, and a regen against a lagging DB would delete them.

Later migrations (past the 001–011 core): 014/015/018/030 conversations system, 016 stable external IDs + dedup, 017/020/022/028 seed batches (Central Florida, work exchanges), 019 availability backfill, 023–027 provider claim flow + RLS hardening, 029 blog, 031 blog image storage, 032 South Florida seed, 033/034 claim submissions + notification fields, 035 work exchange provenance + agent review queue, 036 student clothing seed + `students` population tag, 037 confidence-trigger parity.

**Live carries schema objects that no migration creates.** Two were found on PR #79: the `trg_resource_confidence` trigger + `fn_update_resource_confidence()` function (captured by migration 037) and the Christian Service Center provider row created by the OB3 import script (captured by 036 section 1b). Verifying a change against live cannot detect this class by construction — live is the environment that hides it. Before writing a migration that depends on a trigger, function, policy or row, confirm a migration actually creates it.

---

## Deployment

- **Platform**: Cloudflare Pages (`wrangler.jsonc`, project name `streetrise`), production at app.streetrise.org
- **Build output**: `dist/`; SPA fallback via `public/_redirects`
- **CI**: `.github/workflows/deploy.yml` (named "CI") runs typecheck + build on push/PR to `main`. The workflow itself contains no deploy step; pushes to `main` reach production via the Pages integration — treat **merging to `main` as a production deploy** and never merge with red CI.
- **Manual deploy**: `npm run deploy` (needs `CLOUDFLARE_API_TOKEN` + 32-char `CLOUDFLARE_ACCOUNT_ID`)
- **The blog publisher Worker deploys separately** — merging to `main` does not ship it. `npm run worker:blog:deploy`, or connect it as a Workers Build. CI only type-checks it.
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
