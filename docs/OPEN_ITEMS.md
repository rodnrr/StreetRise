# Open Items

## Session of 2026-09-01 — full cross-reference audit (GitHub, Supabase, main)

Ran at the maintainer's request: cross-check `CLAUDE.md`/`README.md`/this file against actual `main`, all GitHub branches/PRs, and live Supabase (project `mldatfcwnmvrmxumzxyb`), since two weeks of merged work (2026-08-19 through 08-31) had never been reflected in the docs. `CLAUDE.md` and `README.md` were rewritten to match; this entry records what changed and what's still open from that pass.

**Previously undocumented features found live on `main`:**
- EN/ES language toggle for public UI chrome (`src/lib/i18n.ts`, `LangToggle`, `useLangStore`) — PR #86, merged 2026-08-24.
- Deterministic instant-answer FAQ on the booking flow's "Ask a Question" mode (`src/lib/resourceFaq.ts`, 644 lines) — PR #91, merged 2026-08-31 after ~25 "Codex review round" follow-up commits fixing EN/ES matching edge cases.
- Blog publisher Worker **now actually deploys** — first successful deploy 2026-08-26 via `.github/workflows/deploy-blog-worker.yml` (PRs #88/#89/#90), after five days stuck on Cloudflare's stock placeholder script due to a Workers Builds Root Directory misconfiguration. `CLAUDE.md`'s prior "written but NOT deployed" note was stale.
- `AboutPage.tsx` was redesigned with a founder story/photo (direct commit by the maintainer, 2026-08-26, not a PR) — and its "Partner with StreetRise" button linked to `/partners`, a route that doesn't exist (`/partner-with-us` is the real one). **Fixed in this session.**
- Migrations 038 (`backfill_taxonomy`) and 039 (`backfill_gender_policy_from_public_data`) were added to the repo 2026-08-24 (PR #85) — repo-completeness re-adds of backfills already run against live in May/June 2026. Nothing to apply.

**Live Supabase findings not previously logged anywhere:**
- `resource_import_staging` table exists on live, RLS enabled with zero policies (blocks all `/rest/v1/` access), no migration in the repo creates it, no app code references it. Purpose unconfirmed — likely a service-role-only landing table for a seed/import script.
- `get_advisors` (security) flags: 8 functions with mutable `search_path` (`is_verified_provider`, `is_admin`, `my_provider_id`, `bump_conversation_on_message`, `update_updated_at`, `fn_update_resource_confidence`, `compute_confidence_score`, `conversation_messages_broadcast_trigger`); several `SECURITY DEFINER` functions callable by `anon`/`authenticated` (`booking_update_preserves_request_fields`, `resource_update_preserves_admin_fields`, `rls_auto_enable` deserve a specific look — the three RLS-helper functions being callable this way is expected); leaked-password protection disabled in Auth. None confirmed exploitable, none fixed this session — see `CLAUDE.md` Known Open Items.
- `supabase_migrations.schema_migrations` drift is worse than previously documented: migrations 008, 022, 024, 028, 029, 032, 036, 037 have **no entry at all** (not just "032–035" as the file previously said), several rows are recorded with no number prefix, and there are two different migrations both recorded as `012`. Do not use that table to answer "has migration N been applied."
- Migration 031 (blog-images storage bucket) confirmed **applied** — bucket exists, `public=true`. Previously undocumented either way.
- Public map resource count re-verified: **165** (documented count after migration 036 was 166 — small net drift, not investigated further, not a red flag by itself).
- `resources_resource_type_check` and other constraints not re-verified this session; only spot-checked what's below.

**Repo/doc drift found and fixed this session:**
- `CLAUDE.md`'s "Mission & Domain Split" described `streetrise.org` as a separate Wix site outside this repo. Per the maintainer, that's obsolete: Wix was dropped, its content migrated into `src/pages/marketing/`, and `streetrise.org` now redirects to `app.streetrise.org`. Rewritten; `LAUNCH_REVIEW.md` got a dated addendum since its own domain-split table is now historical.
- `/community-voices` (`CommunityVoicesPage`) is routed in `App.tsx` but was missing from `CLAUDE.md`'s Route Map/Repository Structure tables and from `public/sitemap.xml`. Documented; **not** added to the sitemap (whether it should be indexed is a content call, not a docs fix).
- `robots.txt` gained explicit `Allow:` rules for AI search/assistant crawlers (GPTBot, ClaudeBot, etc.) — separate small task, same session.
- Migration count references throughout `CLAUDE.md`/`README.md` said "001–037" — corrected to "001–039" everywhere found.

**Still open after this pass** (not fixed, just documented — see `CLAUDE.md` for full detail on each):
- `VITE_BLOG_WORKER_URL` in Cloudflare Pages — unconfirmed whether it's set / the Pages deployment retried since the Worker started deploying successfully.
- The security and performance advisory findings above (RLS `auth_rls_initplan` re-eval pattern, `multiple_permissive_policies`, duplicate/unused indexes, mutable `search_path`, `SECURITY DEFINER` exposure, leaked-password protection).
- `resource_import_staging`'s actual purpose.
- Whether `/community-voices` belongs in the sitemap.
- The `streetrise.org` → app-serves-directly domain migration the maintainer wants (Cloudflare custom-domain change, not scoped).
- `Privacy`/`Terms`/`Accessibility` pages picked up large diffs in the same window as everything else (328/497/234 lines respectively) that this pass never actually read — only saw them in a `git diff --stat`. Unread, unverified; if anything in them makes a legal/compliance claim, it hasn't been checked.
- `CommunityVoicesPage`'s actual content was never read, only that the route exists and isn't in the sitemap.

**Follow-up pass (2026-09-01, same day) — re-verified rather than assumed, per the maintainer's ask to close specific gaps from the first pass:**
- **New bug found: declining a booking fails on live.** `BookingStatus` in `src/types/index.ts` includes `'declined'`; both `AdminBookings.tsx` and `ProviderBookings.tsx` have a "Decline" action that sets `status: 'declined'`. Queried `enum_range(null::booking_status)` on live directly: `declined` is not a member. Every "Decline" click sends an `UPDATE` Postgres rejects with an enum error. Not fixed here — needs a product call (add `declined` to the live enum via migration, or repoint the two Decline actions at an existing status like `closed`).
- **Chat unread-on-send bug: re-confirmed in code, still present.** Read `AdminChat.tsx` and `ProviderChat.tsx` directly — neither `sendMessage` mutation's `onSuccess` calls `markConversationRead`. Not a leftover assumption; the code was actually read this time.
- **`conversations_update` RLS gap: re-confirmed against live `pg_policies`, still present.** `USING`/`WITH CHECK` are both `provider_id = my_provider_id() OR is_admin()` — identical to read/insert, no column restriction.
- **`booking_status` re-verified, found worse than documented**: the previously-documented drift (live has `needs_info | contacted | no_response | closed` beyond the original six) is correct, but the doc's further claim that "the TS type matches live" was wrong — see the `declined` bug above.
- **RLS Policy Summary table in `CLAUDE.md` corrected**: it said `providers`' public read was "verified only," but `providers_pending_claim_read` and `providers_unclaimed_read` also grant public read (this is what keeps a claiming org visible per migration 033) — the table undersold what's actually public. Also flagged that `bookings`' summary column can't express "a logged-in user reads their own booking," which is a real path (`bookings_user_read`) the three-column table structure hides.
- **`get_advisors` type=performance run for the first time** — wasn't checked in the first pass. ~80 `multiple_permissive_policies` warnings (expected, given the public/provider/admin-policy-per-concern RLS design), 8 RLS policies using the slower per-row `auth.<fn>()` eval pattern instead of `(select auth.<fn>())`, 2 duplicate indexes (one of them — `resources`' `idx_resources_confidence` vs. `idx_resources_confidence_score` — traces to the same unreconciled dual-confidence-scoring issue already tracked below), ~24 unused indexes (mostly on the empty `resource_import_staging`), 2 unindexed foreign keys.
- **Edge Functions spot-checked**: `create-checkout-session` and `notify-claim` both exist on live, both `ACTIVE` — matches what `CLAUDE.md`'s Tech Stack table already claimed, no drift found.
- **CLAUDE.md's blog-publisher-Worker entry trimmed** — the saga narrative was accurate but had grown to one giant paragraph; condensed to the essentials with a pointer to `docs/deploy-blog-worker.md` for the full story.

---

# Open Items — session of 2026-07-29

## Nothing in this session is deployed

All work is **uncommitted, local only**. Production is `main` @ `07c010a`
(PR #50). `/admin/blog` will 404 in production until this is pushed.

Merging to `main` deploys to Cloudflare Pages immediately — consider a branch +
PR so CI runs first.

### Files changed
| File | Status |
|---|---|
| `src/pages/admin/AdminBlog.tsx` | new — blog CRUD |
| `src/lib/adminCounts.ts` | new — shared pending counts |
| `docs/apply-migration-029.md` | new |
| `docs/apply-migration-030.md` | new |
| `docs/OPEN_ITEMS.md` | new (this file) |
| `src/components/admin/AdminLayout.tsx` | rewritten — mobile nav, dark surface, badges |
| `src/main.tsx` | global mutation rule for admin cache |
| `src/lib/database.types.ts` | `blog_posts` + 2 conversation columns |
| `src/lib/supabase.ts` | `db.blog_posts()` |
| `src/lib/conversations.ts` | typed patch, cast removed |
| `src/pages/admin/AdminDashboard.tsx` | Blog quick action |
| `src/App.tsx` | `/admin/blog` route |
| `supabase/migrations/029_add_blog_posts_table.sql` | removed redundant slug index |

Verified: `npm run typecheck` clean, `npm run build` passes. `npm run lint` has
exactly one error — `supabase.from('bookings') as any` at `supabase.ts:29` —
**pre-existing**, confirmed by stashing.

---

## Must do

1. ~~**Apply 030**~~ — **done.** Applied out-of-band; confirmed against live on
   2026-08-18 that both columns exist with the intended shape, and that
   `admin_last_read_at` holds values on all five conversations. Nothing
   recorded identifies what wrote them, so the app path is **not** verified —
   the authenticated smoke test (Step 4 of `docs/apply-migration-030.md`) is
   still outstanding. See that runbook for the full post-apply table.
2. **Commit + push** everything above, including the one-line 029 edit so the
   repo matches what was actually run against live.
3. **Record applied dates** for 029 and 030 in the runbook tables. Do not edit
   the migrations' "NOT YET APPLIED" headers. (030 recorded 2026-08-18; 029
   still needs its date.)
4. **Do not regenerate `database.types.ts`** from the CLI without first
   confirming live has every migration the code depends on. 030 is now applied,
   but the `blog_posts` block and the two conversation columns are still
   hand-written, and live lags the repo elsewhere — a regen against it can
   still delete things.
5. **Smoke-test blog end-to-end** (needs an authenticated browser session, which
   could not be tested from here): admin → `/admin/blog` → create draft →
   confirm `/blog` still shows "No posts yet" → publish → confirm it appears at
   `/blog` and `/blog/<slug>`.

## Decisions waiting on you

- **Messages badge semantics.** It currently counts `status = 'open'`, so it does
  **not** drop when you merely read a thread — only when the thread is closed.
  Now that 030 is applied, `admin_last_read_at` makes a true unread count
  possible. Pick one: "unresolved threads" (today) or "unread threads".
  Note the two differ: 5 open conversations, but only 4 have any message.

## Known gaps, not bugs

- **`BlogPostPage` does not render markdown.** `body_markdown` is dumped into a
  `whitespace-pre-wrap` div, so `##` and `**` show as literal characters. The
  admin editor labels this honestly. Needs a renderer to be real.
- **`CLAUDE.md` is stale on `booking_status`.** Live enum also includes
  `needs_info, contacted, no_response, closed` beyond the documented set.
- **Sending a message marks the thread unread for the sender.** Now that 030 is
  applied this is visible: `bump_conversation_on_message()` advances
  `last_message_at`, but neither `AdminChat` nor `ProviderChat` calls
  `markConversationRead()` on send success, and the mark-read effect is keyed on
  `selectedConversationId` so it does not re-run while the thread stays open.
  `isConversationUnread()` therefore flags the sender's own thread. Live example:
  conversation "Rod af" had `admin_last_read_at` 22:37:30 and the admin's own
  message at 22:37:41. Fix is to mark read after a successful send on both sides.
- **`conversations_update` RLS is column-agnostic.** A provider can update any
  column on their own conversation, including `status` and `admin_id`, not just
  their read timestamp. Pre-existing; low severity; worth tightening eventually.
- **Nav badges add 4 count queries per admin page load** (`head: true`, so no
  rows transferred). Cheap, but it is new traffic.

---

## Next commit — internal tags are leaking onto public pages

`src/pages/ResourceDetailPage.tsx` lines ~307–313 render **every** tag as a
public badge with no filtering:

```tsx
{resource.tags?.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {resource.tags.map((t) => (
      <span key={t} className="badge bg-gray-100 text-gray-600">{t}</span>
    ))}
  </div>
)}
```

Live data has four internal tag families, each on 53 resources — **212 internal
badges currently public**:

| Prefix | Rows | Example |
|---|---|---|
| `subcategory:` | 53 | `subcategory:housing_support` |
| `service_area:` | 53 | `service_area:Osceola County` |
| `import:` | 53 | `import:orlando_batch_3` |
| `access_src:` | 53 | `access_src:physical_site` |

`import:orlando_batch_3` exposes data-pipeline internals to the public, and none
of the four mean anything to someone looking for a shelter.

**Recommended fix.** Every internal tag is `key:value` shaped; every genuinely
public tag on live has no colon (`Park`, `outdoor space`, `volunteer`, `school`,
`pinellas`). So filter at render — presentation-only, no migration, no data loss,
and the tags stay available to admins:

```ts
// src/lib/mapFilters.ts (or alongside the resource display helpers)
const INTERNAL_TAG_PREFIXES = ['subcategory', 'service_area', 'import', 'access_src']

export function publicTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter(t => {
    const prefix = t.split(':')[0]
    return !t.includes(':') || !INTERNAL_TAG_PREFIXES.includes(prefix)
  })
}
```

Then render `publicTags(resource.tags)` and drop the block entirely when empty.
An explicit prefix list is safer than blanket-filtering on `:` — it won't
silently swallow a future legitimate tag that happens to contain a colon.

Also check whether these tags feed the SEO description or structured data on
that page before shipping, so they don't leak via metadata instead.

---

## `/work` freshness is uneven across listings (opened 2026-08-09)

Raised in review on PR #63. The work exchange agent verifies a listing by
re-reading its `source_url`, and only **seeded** listings have one — migration
035 backfilled all 29 of them. A provider who types a listing into the portal
supplies no canonical page, so `--verify` skips it and it can stay unchecked
indefinitely.

Skipping is the right call in isolation: guessing which page describes a
provider-entered listing would be exactly the fabrication the agent is built to
avoid. The problem is what it means in aggregate — `/work` renders verified and
never-verified listings identically, so a visitor reasonably assumes one
freshness standard where there are two.

This is a product decision, not a bug fix. Two ways to close it:

1. **Collect a canonical opportunity URL in the provider workflow.** Add the
   field to `WorkExchangeEdit.tsx` (the column already exists as
   `work_exchanges.source_url`), optional at first, and the agent covers those
   listings the moment it is filled in. Best long-term answer; costs providers
   one more field.
2. **Surface "never verified" as its own state.** Show freshness on the `/work`
   card from `last_verified_at` / `last_verify_status`, with a distinct
   treatment for null. Honest immediately and needs nothing from providers, but
   it advertises the gap rather than closing it.

They compose — (2) is the honest stopgap while (1) fills in. Neither is
started. Note that any freshness badge must not read as a guarantee: per
`CLAUDE.md`, avoid "certified", "guaranteed", or "always up-to-date".

---

## `requires_id` / `requires_referral` cannot express "unknown" (opened 2026-08-18)

Surfaced while seeding migration 036. Both columns are `BOOLEAN NOT NULL
DEFAULT FALSE`, so "we don't know whether ID is required" and "no ID is
required" are the same stored value — and `ResourceSheet` turns that value into
a positive public claim:

```tsx
{!r.requires_id && <span className="badge …">No ID needed</span>}
```

Every listing that has never been asked the question therefore advertises
"No ID needed". Today that is 164 of 197 rows for `requires_id`. It is the
inverse of the house rule elsewhere: unknown fields fail *open* so a real bed is
never hidden, but here an unknown field makes an assertion instead of
withholding one.

Migration 036 works around it row by row — `requires_id = TRUE` where
documentation is genuinely required (Clothes To Kids needs proof of enrolment;
the school-referral programs verify enrolment), `FALSE` on ordinary community
clothing closets where no-ID is the norm. That is a judgement call per row, not
a fix.

The real fix is to make the tri-state representable, then only claim what is
known:

1. Add nullable `requires_id_known` / `requires_referral_known` booleans, **or**
   make the columns themselves nullable (`overnight_allowed` is already
   `BOOLEAN NULL` and the map handles it correctly — that is the precedent).
2. Render the badge only on an explicit `false`, exactly as
   `TOGGLE_DEFS.noCallRequired` already tests `=== false` rather than falsiness.
3. Backfill: rows from a seed migration that never asked should become NULL,
   not FALSE. This needs care — it cannot be inferred after the fact for the
   older batches, so it may have to be scoped to batches whose provenance is
   known.

Not urgent, but it is a correctness bug in public-facing copy, and it gets
slightly worse with every seed batch.

## Category pages now match the map's public set (closed 2026-08-18)

`fetchCategoryResources()` filtered `verification_status = 'verified'` while the
map filtered `IN ('verified','pending')`, so a category page showed a strictly
smaller world than the map it links into — `/shelters` listed 23 where the map
had 34 of the same rows, and migration 036's entire (pending) batch would have
been invisible on `/students` while live on the map. `CLAUDE.md` describes these
pages as presentation-only aliases over the map's filters, so the divergence was
a bug. The predicate now matches, and `CategoryPage` cards render the
Staff Verified / Community Listed badge plus a "Referral needed" chip so the
distinction stays visible instead of vanishing.

Watch for: the six previously-live category pages now show more listings than
before (shelters 23→34, food 26→32; medical and employment are unchanged
because they have no pending rows).

## Two confidence triggers, the second discarding the first (opened 2026-08-18)

`resources.confidence_score` is written by **two** BEFORE INSERT OR UPDATE
triggers, fired in alphabetical order by trigger name:

1. `resources_confidence_score` → `compute_confidence_score()` (migration 010),
   an additive formula over is_active, description length, phone, website,
   hours, verification_status, freshness and map-readiness, capped at 100.
2. `trg_resource_confidence` → `fn_update_resource_confidence()`, which runs
   second (`'t' > 'r'`) and **assigns** rather than accumulating, so it
   overwrites everything step 1 computed.

Step 1 is therefore dead weight on every insert and update of the table, and
the real scoring rule is step 2's five-branch ladder (0 rejected/suspended,
35 pending, then 20/50/70/90 by staleness). Nothing is wrong with the stored
values — but two functions where one is silently discarded is a trap for the
next person who tunes the additive formula and sees no effect.

Migration 037 captured trigger 2 into the repo (it previously existed only on
live — see `docs/apply-migration-037.md`), so the repo now at least describes
what happens. Consolidating the two is the remaining cleanup, and it is a
product decision rather than a parity fix: dropping trigger 1 changes nothing,
but folding its signal into trigger 2 would move scores for `verified` and
stale rows across the whole table, which changes what the map's
`MIN_CONFIDENCE_SCORE` filter and the trust badges say about existing
listings.

Also worth noting the deeper lesson, which cost two review findings on PR #79:
**live carries state that no migration reproduces**, and verifying a change
against live cannot detect that by construction. Both the missing trigger here
and the imported Christian Service Center provider row (migration 036 section
1b) were invisible to post-apply verification for exactly that reason. A
periodic diff of live's schema objects — triggers, functions, policies,
constraints — against what the migrations create would surface the rest.
