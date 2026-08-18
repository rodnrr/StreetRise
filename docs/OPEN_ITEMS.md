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

1. ~~**Apply 030**~~ — **done.** Applied out-of-band and verified against live
   on 2026-08-18; both columns exist and `admin_last_read_at` is being written
   from `/admin/messages`. See `docs/apply-migration-030.md` for the
   post-apply verification table.
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
