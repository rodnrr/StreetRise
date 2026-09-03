# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working With the Maintainer

The maintainer often works from an **iPhone** with no terminal access. At the start of each new session, ask which device they are on (iPhone / Windows / Mac / Linux) before giving any device-specific instructions. Never assume a desktop shell: when they are on iPhone, prefer dashboard/web-UI steps, and deliver files by attaching them to the chat instead of pointing at local paths or git commands.

## Current Status

The pre-debut launch review described in earlier versions of this file is **done** — its findings and applied fixes are recorded in `LAUNCH_REVIEW.md` (footer, contact info, sitemap corrections, honest copy, "Become a Provider" nav entry all shipped). Open work is tracked in:

- `docs/OPEN_ITEMS.md` — session log of open items, most recently added to 2026-09-01
- `BRANCH_FRESHNESS_AUDIT.md` — runbook for cleaning up stale AI session branches. **Not currently needed**: verified 2026-09-01, the repo has only 5 branches total — `main`, 2 open Dependabot PR branches, one unmerged human commit (`rodnrr-patch-1`, a trivial `.github/FUNDING.yml` add), and whatever this session's own working branch is. No stale `claude/*`/`codex/*` backlog exists right now; keep the runbook for when one accumulates again.
- `LAUNCH_REVIEW.md` — the completed launch assessment, kept for reference

**A full cross-reference audit against live main, GitHub, and Supabase ran 2026-09-01** (this session). Two features shipped since the last full doc pass and were previously undocumented here: the **EN/ES language toggle** (see Internationalization) and the **deterministic instant-answer FAQ** on the booking flow's "Ask a Question" mode (see Deterministic Resource FAQ) — both merged over 2026-08-24 through 2026-08-31 (PRs #86 and #91), the latter refined through ~25 "Codex review round" follow-up commits. Also found and fixed in this pass: `AboutPage.tsx`'s "Partner with StreetRise" button linked to `/partners`, a route that doesn't exist (the real route is `/partner-with-us`) — every visitor clicking it hit `/404`. Public map resource count re-verified 2026-09-01: **165** (was 166 as of migration 036 on 2026-08-18; small net change from normal churn, not a regression signal by itself).

Known open items (most recently verified 2026-09-01 unless a line says otherwise):

- **The public "may be outdated" freshness badge was removed from the map card, the detail sheet, and `/resources/:id` — 2026-09-03.** The maintainer found it was putting an unsustainable amount of manual-renewal work on them as the listing count grows, and running the work-exchange-agent-style verification bot to keep it accurate costs real money per apply run, so it stayed dry-run-only and was never actually used. Freshness (`getTrustInfo`/`TRUST_LEVEL_CLASSES`) is now internal-only: the provider portal (`ProviderListings.tsx`) and admin (`AdminResourceEdit.tsx`, plus a new bulk panel on `/admin/resources` — freshness filter chips, select-all/some, and a "Quick refresh" action that bulk-sets `last_provider_update_at` for every selected listing in one write) still show it. The public map's opt-in "Hide possibly outdated" toggle (`hideStale` in `mapFilters.ts`) was deliberately kept — it's a quiet filter with no visible badge, a different thing from what was removed. Paired with **migration 040** (**applied and verified live 2026-09-03** — all 217 resources now at `stale_after_days = 90`, default raised to 90, `max(updated_at)` unchanged by the backfill; see `docs/apply-migration-040.md`), which raises `resources.stale_after_days` from 30 to 90 for the same reason: a looser bar that doesn't need renewing monthly.
- **Declining a booking is broken on live — found 2026-09-01.** `src/types/index.ts`'s `BookingStatus` includes `'declined'`, and both `AdminBookings.tsx` and `ProviderBookings.tsx` have a "Decline" action that sets `status: 'declined'`. Confirmed via `enum_range(null::booking_status)` on live: `declined` is **not** a valid value in the live enum (it has `needs_info | contacted | no_response | closed` but not `declined`). Every click of "Decline" in either dashboard sends an `UPDATE` that Postgres rejects with an enum error — this is a live, user-facing bug, not just a docs mismatch. Fix is either a migration adding `declined` to the enum (matches the code's intent) or changing the two "Decline" actions to use an existing status (e.g. `closed`) — a product call, not made here.

- **The blog publisher Worker deployed successfully 2026-08-26**, via `.github/workflows/deploy-blog-worker.yml` — full saga (five days stuck on Cloudflare's stock placeholder due to a Workers Builds Root Directory misconfiguration, fixed by routing through GitHub Actions instead) is in `docs/deploy-blog-worker.md`. **Not yet independently re-verified against live Cloudflare** in a session with Cloudflare access — the Actions logs confirm `wrangler deploy` exited 0, not what `workers_get_worker_code` shows today. **Still needs confirming**: whether `VITE_BLOG_WORKER_URL` is set in Cloudflare Pages and the Pages deployment retried — until both are done, the AI Draft panel on `/admin/blog` stays hidden even with the Worker itself live. A Claude Code remote session cannot deploy this itself or read Cloudflare build logs directly (egress to `api.cloudflare.com` is blocked; the Cloudflare MCP connector here, when connected, is read-only for Workers) — GitHub Actions runs aren't behind that restriction, which is why the workflow is the active path.

- **`get_advisors` (performance) surfaced items not previously logged here** — verified 2026-09-01, all low-severity, no fixes made: (1) 8 RLS policies (`providers_own_read`, `providers_insert_self`, `providers_claim_submit`, `providers_update_self`, `bookings_user_read`, `bookings_user_update`, `moderation_logs_admin_insert`, plus 3 on `provider_claims`) re-evaluate `auth.<fn>()` per-row instead of `(select auth.<fn>())` — standard Supabase perf-hardening pattern; (2) ~80 `multiple_permissive_policies` warnings, one per role/action combo, on `blog_posts`, `bookings`, `donation_campaigns`, `faq`, `provider_claims`, `providers`, `resources`, `work_exchanges` — inherent to the public/provider/admin policy-per-concern RLS design here, Postgres just has to OR them together, not necessarily worth consolidating; (3) two `duplicate_index` warnings — `resources` has both `idx_resources_confidence` and `idx_resources_confidence_score` (same root cause as the two-confidence-triggers item below: parallel implementations that were never reconciled), and `resource_import_staging` has a literal duplicate; (4) ~24 unused indexes (most of them on the empty `resource_import_staging` table, so unsurprising) and 2 unindexed foreign keys (`bookings.decided_by`, `work_exchange_candidates.reviewed_by`).

- **Migration 036 (student clothing seed) APPLIED to live 2026-08-18.** Runbook + verification: `docs/apply-migration-036.md`. Added the platform's first `clothing` listings (20 resources, 15 providers) and the `students` population-focus tag; public map total 146 → 166. Partnership leads deliberately kept off the public map are in `docs/student-resources-outreach.md`.
- **Migration 037 (confidence trigger parity) is NOT applied, and needs a decision.** Its DDL is a no-op on live — live already has both triggers; the repo did not, so a rebuilt database scored `pending` rows ~80 instead of 35. But its **backfill is a real production data change**: it re-scores 66 stale `verified` rows to 20 (measured 2026-08-18). Nothing leaves the map (`MIN_CONFIDENCE_SCORE` is 20, tested `>=`) and `updated_at` is untouched, so no listing gains false freshness. Unhurried — the parity gap only bites a rebuilt database. Read `docs/apply-migration-037.md` before running it.
- ~~Migration 030 was not yet applied to live~~ — **applied and verified 2026-08-18** (`docs/apply-migration-030.md`). Both `provider_last_read_at` and `admin_last_read_at` exist on live with the intended shape, and `admin_last_read_at` carries real values, so writes to it are landing rather than no-opping as they did before the columns existed. (Those values do not by themselves prove the app path: `conversations_update` is column-agnostic and the SQL editor can write the column too, so the authenticated smoke test in the runbook is still outstanding.) **Unread does not fully clear yet — re-confirmed in code 2026-09-01**: opening a thread marks it read, but *sending* into the open thread re-marks it unread for the sender. Read `AdminChat.tsx`'s and `ProviderChat.tsx`'s `sendMessage` mutations directly: neither `onSuccess` handler calls `markConversationRead`, so `bump_conversation_on_message` advances `last_message_at` and nothing marks the sender's own thread read again (see `docs/OPEN_ITEMS.md`). Note the apply is **not** recorded in `supabase_migrations.schema_migrations` — that table is drifted well beyond 032–035, see Database Migrations; verify live columns, not that table.
- **`npm run lint`, `npm run typecheck`, and `npm run build` are all clean** (re-verified 2026-08-06). The previously documented lint error on `supabase.from('bookings') as any` is gone — `src/lib/supabase.ts` now carries an `eslint-disable-next-line` for it, so the cast itself is still lint debt to unwind when `database.types.ts` is regenerated.
- **`BlogPostPage` does not render markdown** — `body_markdown` is shown in a `whitespace-pre-wrap` div. `cover_image_url` now renders (hero on `BlogPostPage`, thumbnail on `BlogIndexPage`, og:image) when set; images are hosted in the R2 bucket `assets-streetrise` — upload + DB-update runbook in `docs/r2-blog-images.md`.
- ~~Internal tags leak on `ResourceDetailPage`~~ — **fixed 2026-09-03.** `publicTags()` now lives in `src/lib/mapFilters.ts` and `ResourceDetailPage` renders `publicTags(resource.tags)`, dropping the block when nothing survives. `INTERNAL_TAG_PREFIXES` is `subcategory`, `service_area`, `import`, `access_src`, `ride` — the last added with the transportation layer, whose whole matching vocabulary is `ride:`-prefixed. Filtering on an explicit prefix list, not on "contains a colon", so a future legitimate tag with a colon is not swallowed. `ResourceDetailPage` renders no `SeoHead` and no structured data, so these tags were never reaching page metadata either.
- **Provider signup depends on two column defaults.** `providers_insert_self` (tightened by migration 023) requires `claim_status='claimed'` and `source_type='self_registered'`, but `ProviderOnboarding.tsx` sets neither — the column defaults supply both before `WITH CHECK` runs. Drop or change those defaults and provider signup starts failing RLS.
- **Therefore: a seed migration MUST set `claim_status='unclaimed'` and `source_type='seeded'` explicitly.** Those column defaults exist for the signup path above, so an INSERT that omits them marks a seeded org as though a person had registered and claimed it — false provenance, and a dead end, because a `claimed` org can never be claimed at `/claim`. Migration 027 exists because this went wrong once; it happened again while applying 036 and was caught by diffing live against the migration file. Every seeded provider on live should be `unclaimed`/`seeded` with `user_id IS NULL`.
- ~~Claiming an org hides it from `/work`~~ — **fixed by migration 033**, which adds `providers_pending_claim_read` so a mid-claim org stays publicly visible.
- ~~Default map center still points at Tampa Bay~~ — **mitigated by the map revamp (2026-08-17)**. `useMapStore` still opens at `{ lat: 28.2, lng: -81.9 }` zoom 9, but `MapPage` now auto-fits the map to the current result set on load and whenever the need chip or search changes, so a Miami visitor who grants nothing still lands on a view containing pins. The stored centre follows the fit, so distances are measured from where the map actually is. Changing the literal default is no longer urgent.
- **Domain consolidation is real but unfinished** (verified 2026-09-01, see Mission & Domain Split). `streetrise.org` now redirects to `app.streetrise.org` instead of being a separate Wix site — the two-site split described in older docs (`LAUNCH_REVIEW.md`) is obsolete. The maintainer wants the app to eventually live at `streetrise.org` directly; that's a Cloudflare Pages custom-domain change plus a sweep of hardcoded `app.streetrise.org` references (`public/sitemap.xml`, `public/robots.txt`, `wrangler.jsonc` comment, `src/lib/seo/`) that nobody has scoped yet.
- ~~`/community-voices` missing from `public/sitemap.xml` — deliberate or a gap?~~ — **resolved 2026-09-01: deliberate.** Read `CommunityVoicesPage.tsx` directly: `SeoHead` is passed `noindex` (confirmed in `SeoHead.tsx` this renders `<meta name="robots" content="noindex, nofollow">`), and the file's own comment says why — "No fabricated testimonials — honest empty state until real stories exist" / "noindex (and kept out of sitemap.xml) until there is real content." The page currently renders an empty state, not real testimonials. Add it to the sitemap once real stories are collected; not before.
- **Privacy Policy and Terms of Use lost their "not reviewed by an attorney" disclaimers when they were rewritten — found 2026-09-01.** Diffed `PrivacyPage.tsx` and `TermsPage.tsx` against their pre-2026-08-26 versions: both previously carried an explicit amber warning box ("Draft template... has not been reviewed by an attorney — please have counsel review before treating it as \[official/binding\]"). That box is gone in the current versions (direct commits by the maintainer, not through a PR — see the "Redesign About page" commit in the same window). In its place are full, formal-reading legal documents: the Privacy Policy now covers cookies/device storage, data retention periods, a children's-privacy/COPPA-style clause, and disclosure categories including an ownership-transfer clause; the Terms of Use now include a "Disclaimer of warranties" section and a "Limitation of responsibility" section (liability limits, no consequential/punitive damages) plus an acceptable-use policy and moderation/suspension rights. Neither page indicates actual attorney review took place. Given StreetRise's requests can carry health, disability, domestic-violence, and family-status information, publishing specific, legally-consequential-reading data-handling and liability language without confirmed counsel review is a real exposure, not just a docs-accuracy issue. Not fixed here — this needs the maintainer's call on whether the current text has actually been reviewed, and if not, whether to restore a disclaimer or get it reviewed before it stays live as-is.
- **Migrations 038/039 added to the repo 2026-08-24 (PR #85) — nothing to apply.** Both are backfills that already ran against live in May/June 2026 via a since-deleted session branch; the files are reproduced verbatim from live's migration history for repo completeness. **038 is not safe to blindly re-run against live** — flagged by Codex review on PR #92, 2026-09-01, and confirmed by reading the file: it ends with an unguarded `UPDATE resources SET stale_after_days = stale_after_days` (no WHERE clause), which fires `resources_updated_at` on every row and stamps `updated_at = now()` table-wide, corrupting the "Updated Xd ago" freshness display — the same hazard migration 037 hits with the identical statement, but 037 wraps it in `DISABLE/ENABLE TRIGGER` and 038 does not. 038's own header comment now documents this; it's safe to run once against an unseeded database, not safe to re-run against live. 039 has no such issue (every UPDATE is `WHERE gender_policy = 'unknown'`-guarded, genuinely idempotent). See Database Migrations for detail and the `supabase_migrations.schema_migrations` drift this surfaced.
- **Migration 041 (transportation assistance seed) is written but NOT applied, and carries unverified facts.** Read `docs/apply-migration-041.md` before running it. It seeds the platform's first `transportation` listings — 2 providers (PSTA, HART) and 6 programmes — closing the same gap migration 036 closed for `clothing`: `SELECT count(*) FROM resources WHERE category = 'transportation'` returns **0** on live (verified 2026-09-03), so the `transportation` need chip has always matched nothing and `isUsefulOption()` has hidden it. Two things to know. (1) **The authoring session could not reach `psta.net` or `gohart.org`** (network egress blocked), so phone numbers, addresses, and the "eight designated transit locations" figure for PSTA Direct Connect are uncorroborated; every row seeds `pending` and every description says to confirm with the agency, but do not flip one to `verified` without a real check. (2) **These rows deliberately never reach the map** — `lat`/`lng` NULL, `is_map_ready = FALSE`, `access_type = 'phone_intake'` — because a countywide paratransit or fare programme has a service area, not a doorway, and because nothing was geocoded. So applying 041 does *not* light up the `transportation` chip on `/map`; the listings surface through `/transportation`, the "Get There" panel, the homepage grid and the footer. Coverage is **Pinellas + Hillsborough only**; Orlando (LYNX / ACCESS LYNX) and Miami-Dade (Golden Passport, STS, Go Connect) are equivalent and unseeded.

- **`get_advisors` (security) surfaced items not previously logged here** — verified 2026-09-01, none blocking, worth a deliberate look: (1) `public.resource_import_staging` has RLS enabled with zero policies, which blocks all `/rest/v1/` access to it entirely (see that table's entry in Data Model); (2) eight functions (`is_verified_provider`, `is_admin`, `my_provider_id`, `bump_conversation_on_message`, `update_updated_at`, `fn_update_resource_confidence`, `compute_confidence_score`, `conversation_messages_broadcast_trigger`) have a mutable `search_path`, standard Postgres hardening advice is to pin it; (3) several `SECURITY DEFINER` functions are callable by `anon`/`authenticated` over the API — the RLS-helper ones (`is_admin`, `my_provider_id`, `is_verified_provider`) are meant to be, but `booking_update_preserves_request_fields`, `resource_update_preserves_admin_fields`, and `rls_auto_enable` should each be checked against what they're actually meant to allow before assuming that's fine; (4) leaked-password protection (HaveIBeenPwned check) is disabled in Supabase Auth — a one-click enable in the dashboard, not a schema change.

---

## Mission & Domain Split

**This is now one site, not two.** Earlier versions of this file described `streetrise.org` as a separate Wix-hosted marketing site outside this repo, with the app living only at `app.streetrise.org`. That split is gone: the Wix site was dropped, its marketing content (mission/About, Partners, donate context) was migrated into this repo's `src/pages/marketing/` pages, and `streetrise.org` now redirects to `app.streetrise.org` — confirmed by the maintainer 2026-09-01, not independently verified from this session (sandboxed sessions can't reach either domain to check headers directly; verify with `curl -sSI https://streetrise.org/` from a machine with real network access if you need to double check).

- **app.streetrise.org** — where this repo actually deploys today (Cloudflare Pages custom domain; see Deployment). This is the single site: map, booking, provider portal, admin, and all marketing/about/partner content.
- **streetrise.org** — the bare domain; redirects to `app.streetrise.org`. Not a separate codebase or CMS anymore.
- **Desired future state (not yet done):** the maintainer wants the app to live directly on `streetrise.org` instead of the `app.` subdomain, with the redirect reversed or removed. This needs a Cloudflare Pages custom-domain change (and probably an `VITE_APP_URL`/canonical-URL sweep across `src/lib/seo/`, `public/sitemap.xml`, and `public/robots.txt`, all of which currently hardcode `app.streetrise.org`) — nobody has scoped or started this yet. Treat any reference to "streetrise.org vs app.streetrise.org" as separate sites in older docs (`LAUNCH_REVIEW.md`) as historical, not current.

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
| State | Zustand (map, auth, toasts, EN/ES language) |
| i18n | Hand-written EN/ES dictionary (`src/lib/i18n.ts`), not a library — see Internationalization |
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
    i18n.ts                 # EN/ES dictionary + useI18n() hook — see State Management
    resourceFaq.ts          # Deterministic instant-answer FAQ engine — see below
    transport.ts            # Travel modes + Google/Apple Maps directions deep links.
                            # No routing backend — the trip is handed to a map app.
    rideOptions.ts          # Ride Assistance Finder matching engine — see Transportation
    seo/                    # SeoHead.tsx, structuredData.ts

  pages/
    HomePage.tsx            # Landing / category grid (only eagerly loaded page)
    MapPage.tsx             # Full-screen Leaflet map with search/filter
    ResourceDetailPage.tsx  # Single resource detail
    BookingPage.tsx         # Booking/request form (anonymous allowed)
    WorkExchangePage.tsx    # Work exchange listing page
    TransportationPage.tsx  # Transportation directory + Ride Assistance Finder
    DonatePage.tsx          # Stripe donation checkout
    FaqPage.tsx             # FAQ (loaded from DB)
    LoginPage.tsx           # Custom email/password form using supabase.auth directly
    NotFoundPage.tsx        # 404 fallback
    ProviderLandingPage.tsx # Public provider onboarding pitch (/provider/onboarding)

    marketing/              # AboutPage, ContactPage, PartnersPage, PrivacyPage,
                            # TermsPage, AccessibilityPage, CommunityVoicesPage
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
                            # Footer, ToastContainer, LangToggle (EN/ES switch),
                            # GetThere (travel-mode tiles + ride-assistance entry point)
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
  OPEN_ITEMS.md             # Session log of open items — most recently verified 2026-09-01
  apply-migration-029.md    # Hand-apply runbook (029 = blog_posts)
  apply-migration-030.md    # Hand-apply runbook (030 = conversation read tracking)
  apply-migration-031.md    # Hand-apply runbook (031 = blog-images storage bucket) — APPLIED,
                            # verified live 2026-09-01 (bucket exists, public=true)
  apply-migration-035.md    # Hand-apply runbook (035 = work exchange agent)
  apply-migration-036.md    # Hand-apply runbook (036 = student clothing seed)
  apply-migration-037.md    # Hand-apply runbook (037 = confidence trigger parity; DDL is a
                            # no-op on live, but its backfill re-scores 66 rows — read first)
  apply-migration-040.md    # Hand-apply runbook (040 = stale_after_days default 30 → 90)
  apply-migration-041.md    # Hand-apply runbook (041 = transportation assistance seed) —
                            # NOT APPLIED, and has unverified facts in it. Read it first.
  auth-setup.md             # Password reset, magic link, and social sign-in: what ships in
                            # code vs. what needs dashboard configuration (all web-UI steps)
  deploy-blog-worker.md     # How the blog publisher Worker deploys — GitHub Actions workflow
                            # is now the primary path (see Deployment); dashboard steps are the fallback
  student-resources-outreach.md  # Partnership leads deliberately NOT on the public map
  work-exchange-agent.md    # What the agent does, how to run it, review workflow
  data-dictionary.md
  import-seed-candidates.md
  claim-flow.md              # Provider claim flow (migrations 033/034): submissions, notifications
  r2-blog-images.md          # R2-hosted launch/legacy blog images (separate from the
                            # migration-031 Supabase Storage bucket new uploads use)
  apply-migrations-023-027.md  # Provider claim flow + RLS hardening hand-apply runbook

scripts/
  deploy-pages.sh           # Cloudflare Pages deploy (validates env vars)
  import-seed-candidates.ts # Seed import (needs SUPABASE_SERVICE_ROLE_KEY)
  work-exchange-agent.ts    # Re-verifies /work listings + drafts new ones into a review queue.
                            # Needs SUPABASE_SERVICE_ROLE_KEY + ANTHROPIC_API_KEY. Never publishes.

workers/
  blog-publisher/           # Cloudflare Worker: generates an UNPUBLISHED blog draft +
                            # cover image with Workers AI. Deployed separately from the
                            # main app build, via its own GitHub Actions workflow — see
                            # Deployment. Runs on the caller's admin token, holds no
                            # service-role key. Covers go to the Supabase `blog-images`
                            # bucket, not R2. Reached from the AI Draft panel on /admin/blog.

supabase/migrations/        # 001–041 with gaps: NO 012, 013, or 021 exist.
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
| `/transportation` | `TransportationPage` | Lazy; transportation directory + Ride Assistance Finder. `?to=<resourceId>` prefills the destination, `?mode=wheelchair` preselects accessible transport. **Not** a `CategoryPage` — see Transportation Assistance Layer |
| `/donate` | `DonatePage` | Lazy; Stripe checkout |
| `/faq` | `FaqPage` | Lazy; data from DB |
| `/login` | `LoginPage` | Lazy; `?signup=1` opens signup tab; `?next=` redirect; magic-link sign-in; social buttons render only for providers Supabase reports as enabled |
| `/forgot-password` | `ForgotPasswordPage` | Lazy; never reveals whether an account exists |
| `/reset-password` | `ResetPasswordPage` | Lazy; handles both implicit-fragment and PKCE `?code=` links |
| `/auth/callback` | `AuthCallbackPage` | Lazy; OAuth return, resolves post-login destination |
| `/provider/onboarding` | `ProviderLandingPage` | Public pitch page |
| `/claim` | `ClaimIndexPage` | Lazy; public directory of `unclaimed` orgs |
| `/claim/:id` | `ClaimDetailPage` | Lazy; claim submission (auth required to submit) |
| `/about`, `/contact`, `/partner-with-us`, `/privacy`, `/terms`, `/accessibility`, `/community-voices` | marketing pages | Lazy. `/community-voices` is deliberately `noindex` and excluded from `public/sitemap.xml` until it has real content — confirmed 2026-09-01, see Known Open Items. `/privacy` and `/terms` are full rewrites as of 2026-08-26 with an unresolved attorney-review question — see Known Open Items |
| `/blog`, `/blog/:slug` | blog pages | Lazy; backed by `blog_posts` |
| `/food-pantries`, `/shelters`, `/medical`, `/employment`, `/hygiene`, `/showers`, `/legal`, `/veterans`, `/youth`, `/families`, `/students` | `CategoryPage` | Presentation-only aliases over existing `/map` filters via `lib/categories.ts` — never introduce new category values here |
| `/404` | `NotFoundPage` | Wildcard `*` redirects here |
| `/portal/*` | Provider portal | Auth-gated; dashboard, onboarding, listings, bookings, messages, work |
| `/admin/*` | Admin portal | Auth-gated; dashboard, providers, resources (+new), bookings, work-exchange, messages, faq, blog |

**`public/sitemap.xml` includes:** `/`, `/map`, `/provider/onboarding`, `/claim`, `/work`, `/transportation`, `/donate`, `/faq`, the 11 category pages, `/about`, `/contact`, `/partner-with-us`, `/blog`, `/privacy`, `/terms`, `/accessibility`. It must never include `/login`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/portal/*`, `/admin/*`, or individual `/claim/:id` pages.
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
- `tags`: mixes public tags with internal `key:value` tags (`subcategory:`, `service_area:`, `import:`, `access_src:`, `ride:`). Filtered at render by `publicTags()` in `mapFilters.ts` — see `INTERNAL_TAG_PREFIXES`. **The `ride:` family is load-bearing, not decorative**: it is the entire matching vocabulary of the Ride Assistance Finder (`ride:kind:`, `ride:mode:`, `ride:elig:`, `ride:area:`, `ride:notice:`), which is why adding a transportation programme takes a row and no code. See Transportation Assistance Layer.
- Facility booleans (migration 011): `has_showers`, `has_restrooms`, `serves_meals`, `has_laundry`, `pet_friendly`, `wheelchair_accessible`, `public_transit_accessible`, `phone_required_before_arrival`, `overnight_allowed`
- Trust fields (migration 010): `confidence_score` (0–100), `stale_after_days`, `last_provider_update_at`, `last_verified_at`. `stale_after_days` default raised 30 → 90 by migration 040 (**applied and verified live 2026-09-03** — `docs/apply-migration-040.md`). As of 2026-09-03 the freshness this drives is **internal-only** (provider portal + admin) — the public "may be outdated" badge was removed from the map card, detail sheet, and `/resources/:id`; see Known Open Items.
- Import fields (migrations 009/016): `external_id` (stable, human-readable, e.g. `ACTS-001`), `import_batch`, `import_source`
- **Public query filter:** `is_active=true AND verification_status IN ('verified','pending') AND is_map_ready=true AND lat IS NOT NULL AND lng IS NOT NULL`

### `bookings`
Service requests submitted by users (or anonymously; `user_id` nullable since migration 007). **Status enum has drifted between repo and live:** migration 001 created `pending | confirmed | waitlisted | cancelled | completed | no_show`; the live enum was extended by hand. No repo migration exists for the extension. **The TS `BookingStatus` type does NOT match live** — re-verified 2026-09-01 by querying `enum_range(null::booking_status)` on live: it has `needs_info | contacted | no_response | closed` but **not** `declined`. `src/types/index.ts` includes `'declined'` anyway, and both `AdminBookings.tsx` and `ProviderBookings.tsx` have a "Decline" action that sets `status: 'declined'` — that `UPDATE` will fail on live with a Postgres enum error every time either page's Decline button is used. See Known Open Items. Also carries triage fields: `admin_notes`, `provider_notes`, `decision_note`, `last_contacted_at`, `decided_at`, `contact_preference`, `best_contact_time`, `contact_consent`.

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

### `resource_import_staging`
Exists on live (verified 2026-09-01), no rows currently, no migration file in the repo creates it — same "live carries schema objects no migration creates" class as the confidence trigger (see migration 037's history) and the OB3 provider row (migration 036). RLS is enabled with **zero policies**, which blocks all access via `/rest/v1/` for every role including `anon` and `authenticated` — effectively inert over the public API. Presumably a landing table for `scripts/import-seed-candidates.ts` or a similar import path, written to directly with the service-role key (which bypasses RLS). Not referenced anywhere in current app code — confirm its purpose before writing a migration that assumes it doesn't exist, or before dropping it.

---

## RLS Policy Summary

Defined in `002_rls_policies.sql`, extended in `006` (verified-provider gate), `015` (conversation fixes), `018` (admin notes), and `024`–`026` (claim-flow hardening).

Key SQL helpers:
- `is_admin()` — returns `true` if current user has `role IN ('admin','super_admin')` AND `verification_status = 'verified'`
- `my_provider_id()` — returns the `providers.id` for the current user
- `is_verified_provider()` (migration 006) — gates provider-only writes on `verification_status = 'verified'` for the current user's own provider row

All three are `SECURITY DEFINER` and callable via `/rest/v1/rpc/...` by `anon`/`authenticated` (flagged by `get_advisors` — verified 2026-09-01). That's the intended shape for RLS helper functions meant to be called from policies, but confirm before assuming any *other* `SECURITY DEFINER` function callable this way is equally intentional — see Known Open Items.

| Table | Public read | Provider read | Admin |
|---|---|---|---|
| `providers` | verified, `pending_claim`, or `unclaimed`¹ | own record | all |
| `resources` | active + (verified OR pending) | own | all |
| `bookings` | none² | own resources' bookings | all |
| `work_exchanges` | active | own | all |
| `faq` | active | — | all |
| `blog_posts` | published | — | all |
| `donation_campaigns` | active | own (full CRUD, not just read) | all |
| `conversations` | none | own | all |
| `conversation_admin_notes` | none | none | all |

¹ **Corrected 2026-09-01** — this table previously said "verified only." Re-checked against live `pg_policies`: `providers_pending_claim_read` and `providers_unclaimed_read` (both from the claim-flow migrations) also make mid-claim and not-yet-claimed seeded orgs publicly readable — this is what keeps a claiming org visible on `/work` and `/claim`, per migration 033's entry above.
² A logged-in user can read their **own** bookings (`bookings_user_read`, `user_id = auth.uid()`) — not "public" in the sense the other rows mean, but this table's three-column shape (Public/Provider/Admin) has no slot for "authenticated end user, own rows," so it's a real access path this table doesn't show.

Anonymous users can **INSERT** bookings (`bookings_public_insert` — `WITH CHECK (TRUE)`).

Known RLS gap (low severity, `docs/OPEN_ITEMS.md`) — **re-confirmed against live `pg_policies` 2026-09-01, still present**: the `conversations_update` policy's `USING`/`WITH CHECK` are both just `provider_id = my_provider_id() OR is_admin()`, identical to the read/insert policies — a provider can update any column on their own conversation, not just their read timestamp.

---

## State Management

Four Zustand stores in `src/lib/store.ts`:

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

**`useLangStore`** (persisted as `streetrise-lang`) — added for the EN/ES toggle (merged 2026-08-24), see Internationalization below
- `lang: 'en' | 'es'`, `setLang(lang)`. Defaults to `'en'`.

---

## Internationalization (EN/ES)

`src/lib/i18n.ts` is a lightweight, hand-written EN/ES dictionary — not a library like `react-i18next`. `useI18n()` (built on `useLangStore`) returns `{ t, lang, setLang }`; `t('nav.findResources')` looks up the active-language string, falling back to English and then to the raw key so a partially translated string never renders blank.

- **Scope is deliberately narrow**: static UI chrome only — nav, footer, homepage hero, map controls, booking form, and the FAQ-engine's rule labels/sentences (see below). Database-driven content — resource names/descriptions, blog posts, FAQ table rows, category labels — is English-only and does not translate.
- `LangToggle` (`src/components/shared/LangToggle.tsx`) is the EN/ES switch, rendered in the public UI chrome (not on `/map`'s full-screen layout by default — check current placement before assuming).
- Landed as PR #86, then hardened through ~13 follow-up "Codex review round" commits fixing Spanish-specific matching edge cases (accents, weekday names, false-positive keyword collisions) — most of that hardening happened inside the FAQ engine's Spanish question-matching, not the static dictionary.
- When adding a new user-facing string in scope, add both the `en` and `es` entries in `i18n.ts` — don't hardcode English text in a component that's meant to be translated.

---

## Deterministic Resource FAQ (`src/lib/resourceFaq.ts`)

Powers the instant-answer panel on the booking flow's "Ask a Question" mode (`/book/:resourceId?intent=question`, merged as PR #91). Given a free-text question and a `Resource`, `findFaqAnswers(resource, query, { origin, now, lang })` returns zero or more answers built **only from fields already on the resource** — hours, address, distance, contact info, eligibility, intake conditions, facilities. No network call, no model, no invented facts: a rule with nothing to say returns `null` and is simply omitted.

- **Sits alongside, not in place of, the human-routed question form** — anything not covered here (cost, specific intake steps, anything the data doesn't record) still goes to the provider via the normal booking/question submission.
- Rule labels and generated answer sentences are localized via `i18n`'s `faq.*` keys (matching the active locale). The one exception is `aboutAnswer`, which is literally the provider-authored `description` field and stays untranslated — consistent with resource descriptions being English-only DB content everywhere else in the app. `gender_policy`/`population_focus` labels also stay English-only, matching how those badges render elsewhere (map chips, `ResourceSheet`, category pages).
- 644 lines as of 2026-08-31, after ~25 "Codex review round" commits on PR #91 fixing matching collisions (e.g. "who is this for" vs. gender-policy questions, "abrigo"/"abrir" Spanish collisions, weekday/"today" disambiguation, closed-status edge cases). If you touch matching logic, expect subtle regressions in adjacent rules — read a few of those commit messages first to see the shape of prior bugs.
- Depends on `mapFilters.ts` (hours/timezone helpers — same `America/New_York` evaluation as the map's "Open right now" filter) and `geo.ts` (distance formatting).

---

## Transportation Assistance Layer

Finding a shelter, pantry or clinic is only half the problem if the person
cannot physically get there. Three pieces, added 2026-09-03:

**1. "Get There" on every listing** — `src/components/shared/GetThere.tsx`,
rendered in `ResourceSheet` (compact) and on `/resources/:id` (card). Six tiles:
public transit / walking / bicycle / driving hand the trip to Google Maps (Apple
Maps offered as a secondary link on Apple devices) with the destination
prefilled; ride assistance and accessible transport open `/transportation`.
`src/lib/transport.ts` builds the URLs.

It **replaced** the single "Directions" action that used to sit in
`ResourceSheet`'s footer grid — driving is one of the four tiles, so nothing was
lost. `canRouteTo()` reproduces the existing gate: a `confidential_address` or
`phone_intake` listing gets no map links and no destination carried into the
finder, because its stored address is not where the service reaches the public.

**2. `/transportation`** — `src/pages/TransportationPage.tsx`. A directory of
every transportation programme plus the Ride Assistance Finder, on one route.
`?to=<resourceId>` prefills the destination; `?mode=wheelchair` preselects
accessible transport.

**Deliberately not a `CategoryPage`.** Transportation programmes are
service-area-scoped rather than point-located: several have no coordinates at
all, and `fetchCategoryResources()` requires `is_map_ready` plus non-null
lat/lng. Routing this through `categories.ts` would hide exactly the listings
the page exists to surface. `fetchRideAssistance()` in `rideOptions.ts` is a
separate query that keeps the rest of the public visibility predicate and drops
only the coordinate requirement — same precedent as `fetchCategoryResources()`
being separate from `fetchMapResources()`.

**3. The matching engine** — `src/lib/rideOptions.ts`. Five plain questions
(destination, origin, when, usable modes, eligibility) ranked against the
`ride:` tags on each programme. Same discipline as `resourceFaq.ts`:

- **Nothing is invented.** Every reason and caution is assembled from a stored
  field. A rule with nothing to say stays silent.
- **No route planning.** StreetRise does not compute itineraries, quote fares,
  or estimate trip times — a map app does. "PSTA Route 18 → 52, 47 minutes" in
  StreetRise's own UI would need a real GTFS/routing backend; that is a much
  larger piece of work, not a tweak to `transport.ts`.
- **Unknown means "maybe".** A programme recording no area, mode or eligibility
  rule is never excluded on that basis — it ranks lower and says what it does
  not know. The single exception fails closed: a programme whose published
  service area definitely excludes the destination moves to an "other service
  areas" section rather than being hidden.
- **Qualification is never asserted.** The strongest claim is "you may qualify",
  next to the requirement the programme publishes.

**Privacy is a design constraint here, not a footnote.** The eligibility step
asks about income, disability, Medicaid and veteran status — the most sensitive
things anyone types into StreetRise. Those answers live in React state for the
length of the visit and nowhere else: **no Supabase write, no URL parameter, no
persisted store, no analytics call.** If that ever changes it changes as an
opt-in on an account the person created, never as a default. Do not "improve"
this by persisting answers for convenience.

`COUNTY_BY_CITY` in `rideOptions.ts` maps the cities StreetRise lists in to
their Florida county — that is what distinguishes a Pinellas programme from a
Miami trip. A missing city yields `null`, treated as "maybe", so a gap costs
ranking quality and never hides a programme. Extend it when a seed batch adds a
metro.

**Data**: migration 041 (**not applied** — `docs/apply-migration-041.md`) seeds
PSTA and HART programmes. Coverage is Pinellas + Hillsborough only; Orlando and
Miami-Dade equivalents are unseeded. Until then `/transportation` renders an
honest empty state, and the finder tells an Orlando visitor these programmes
serve a different area rather than showing a false match.

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

Migrations live in `supabase/migrations/`, numbered 001–039 **with gaps: 012, 013, and 021 do not exist** (023 and 027 were renumbered from 010/021 to resolve collisions — see their headers).

**How they are actually applied:** by hand, in the Supabase SQL editor, against live project `mldatfcwnmvrmxumzxyb`. NOT by the deploy pipeline and not reliably by `supabase db push` — filenames have no timestamp prefixes, so repo and live migration history **drift**. Treat live as a separate source of truth; verify actual live state with read-only SQL before assuming a migration's effect exists. Runbooks for the most recent applies are in `docs/apply-migration-032.md`, `docs/apply-migrations-023-027.md`, and `docs/claim-flow.md` (033/034).

**`mcp__Supabase__list_migrations` (i.e. `supabase_migrations.schema_migrations`) is drifted far beyond what earlier notes here said.** Checked 2026-09-01: repo migrations **008, 022, 024, 028, 029, 032, 036, 037 have no entry at all**; several rows are recorded with no number prefix (`conversations_system` = repo's 014, `conversations_fixes` = 015, `backfill_gender_policy_from_public_data` = repo's 039, `provider_claim_status` = 023, `clarify_claim_submit_rls` = 025, `lock_claim_status_self_update` = 026, `fix_seeded_provider_claim_status` = 027, `provider_claims` = 033, `claim_contact_and_notifications` = 034, `work_exchange_agent` = 035); and there are two different entries both numbered `012` (`012_backfill_taxonomy` = repo's 038, and `012_stable_external_ids_and_deduplication` = repo's 016) plus one numbered `013` for what the repo calls 017 (`013_batch4_seed_import`). **Do not use this table to answer "has migration N been applied" for any N** — verify the actual columns/rows/functions that migration creates instead, per the rest of this section.

**Do not regenerate `src/lib/database.types.ts` from the CLI** unless you have confirmed live has every migration the code depends on — the `blog_posts` block and the two conversation read columns were hand-written to match intended state, and a regen against a lagging DB would delete them.

Later migrations (past the 001–011 core): 014/015/018/030 conversations system, 016 stable external IDs + dedup, 017/020/022/028 seed batches (Central Florida, work exchanges), 019 availability backfill, 023–027 provider claim flow + RLS hardening, 029 blog, 031 blog image storage (**applied — verified live 2026-09-01**, `blog-images` bucket exists with `public=true`), 032 South Florida seed, 033/034 claim submissions + notification fields, 035 work exchange provenance + agent review queue, 036 student clothing seed + `students` population tag, 037 confidence-trigger parity, **038/039 (added 2026-08-24, PR #85) are repo-completeness re-adds only** — both are backfills that were run against live back in May/June 2026 (038 on 2026-05-25, 039 on 2026-06-18) via a now-deleted session branch and never made it into the repo; the SQL files are reproduced verbatim from live's migration history. There is nothing to "apply" for 038/039 — they already happened. **039 is genuinely idempotent** (every UPDATE is `WHERE gender_policy = 'unknown'`-guarded). **038 is not** — its last statement is an unguarded table-wide `UPDATE resources SET stale_after_days = stale_after_days`, which stamps `updated_at = now()` on every row via `resources_updated_at` (same hazard migration 037 explicitly guards against with `DISABLE/ENABLE TRIGGER` for the identical statement). Re-running 038 against live or any already-seeded database manufactures false freshness table-wide; see that migration's own header comment before ever re-running it. **041 (added 2026-09-03) seeds the first `transportation` listings — NOT APPLIED, and carries facts nobody could verify from the session that wrote it; read `docs/apply-migration-041.md` before running it.** **040 (added 2026-09-03) raises `resources.stale_after_days` from 30 to 90**, default and backfill — **applied and verified live 2026-09-03**; runbook `docs/apply-migration-040.md`. Same DISABLE/ENABLE TRIGGER idiom as 037 so the backfill didn't touch `updated_at` (confirmed: `max(updated_at)` identical before/after).

**Live carries schema objects that no migration creates.** Two were found on PR #79: the `trg_resource_confidence` trigger + `fn_update_resource_confidence()` function (captured by migration 037) and the Christian Service Center provider row created by the OB3 import script (captured by 036 section 1b). Verifying a change against live cannot detect this class by construction — live is the environment that hides it. Before writing a migration that depends on a trigger, function, policy or row, confirm a migration actually creates it.

---

## Deployment

- **Platform**: Cloudflare Pages (`wrangler.jsonc`, project name `streetrise`), production at app.streetrise.org. `streetrise.org` redirects there (see Mission & Domain Split) — the maintainer's goal is to swap this so the app is served from `streetrise.org` directly, but that migration hasn't been scoped or started.
- **Build output**: `dist/`; SPA fallback via `public/_redirects`
- **CI**: `.github/workflows/deploy.yml` (named "CI") runs typecheck + build on push/PR to `main`. The workflow itself contains no deploy step; pushes to `main` reach production via the Pages integration — treat **merging to `main` as a production deploy** and never merge with red CI.
- **Manual deploy**: `npm run deploy` (needs `CLOUDFLARE_API_TOKEN` + 32-char `CLOUDFLARE_ACCOUNT_ID`)
- **The blog publisher Worker deploys via its own GitHub Actions workflow** — `.github/workflows/deploy-blog-worker.yml` runs `npm run worker:blog:deploy` (plus setting the two Supabase secrets) whenever `main` changes under `workers/blog-publisher/**`, the workflow file itself, or the root `package.json`/`package-lock.json` (so a dependency or `wrangler` bump redeploys with the new tooling too), or on a manual `workflow_dispatch`. It needs two repo secrets set in GitHub (Settings → Secrets and variables → Actions): `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit) and `CLOUDFLARE_ACCOUNT_ID`. This exists because Cloudflare's native "Workers Builds" Git integration (`docs/deploy-blog-worker.md`) proved unreliable — its Root Directory setting kept reverting to the repo root instead of `workers/blog-publisher`, so `npm run build`/`npx wrangler deploy` ran against the main SPA every time. The main app's own `.github/workflows/deploy.yml` ("CI") still only type-checks the Worker; it has no deploy step of its own.
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
