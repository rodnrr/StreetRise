# Second-Chance Housing Directory (`/housing`)

A national directory of housing that will consider people with criminal
records. Phase 1 shipped 2026-09-04. Migrations **056–058**, pages under
`src/pages/housing/`, data layer `src/lib/housing.ts`.

This is a distinct product surface from the Florida resource map. It shares the
repo, the Supabase project, the design system and the deploy — and nothing else.

---

## Why it is not built on `resources` / `providers`

The shapes rhyme, which makes the reuse tempting and wrong. Three reasons the
tables are standalone (also recorded in migration 056's header):

1. **Scope.** `resources` is Florida-only, point-located, and gated on
   `is_map_ready` plus non-null `lat`/`lng`. This directory is national and its
   primary surface is a state page. A statewide reentry nonprofit with no
   walk-in address is a first-class row here and an invisible one there.
2. **The record fields have no home there.** `accepts_felony`,
   `accepts_violent_offense` and `accepts_sex_offense` are the point of this
   directory and are meaningless on a food pantry.
3. **Blast radius.** `resources` serves live traffic today. Adding a dozen
   columns and a 50-state row population to it, to support a new product, is a
   migration against production data real people are using.

**Known cost:** an organization that is both a StreetRise provider and a housing
organization exists twice, in `providers` and in `housing_organizations`, with
no link between them. That is accepted, not overlooked. If it becomes a
maintenance problem the reconciliation is a nullable
`housing_organizations.provider_id` FK plus a merge tool in admin — not a
retrofit of one table onto the other.

---

## The two rules that must not drift

### 1. `null` is "unknown", never "no"

Every record and house-rule boolean on `housing_programs` is nullable:

```
accepts_felony  accepts_violent_offense  accepts_sex_offense
accepts_vouchers  requires_sobriety  has_curfew
```

`NULL` means nobody has told us. It renders as **"Not stated — call to ask"**,
in amber, with its own icon — visibly different from a "no".

Rendering an unknown as a negative turns a missing data point into a closed
door, and somebody gets turned away at an intake desk over a field we simply
never asked about. The conversion happens in exactly one function,
`answerFor()` in `src/lib/housing.ts`. Do not inline the ternary anywhere else,
and never add `DEFAULT FALSE` to any of those columns.

The admin form's tri-state selects default to "Not stated" and list it first,
so a hurried entry leaves a field unknown rather than confidently wrong.

`housing_states.has_housing_ban_the_box` is nullable for the same reason, which
is a deliberate departure from the build spec's plain `bool`.

### 2. Staleness is disclosed, never hidden

`STALE_AFTER_DAYS = 180`. Past that, a listing keeps its place in the list and
gains a visible warning. It is **not** filtered out.

Hiding an old listing looks like tidiness and behaves like deleting somebody's
last option — the page then reads "there is nothing in your city", which is a
worse and less true statement than "this is six months old, call first".

A never-verified program says so explicitly rather than falling back to
`created_at`. "We added this and never checked it" and "we checked it in March"
are different claims and only one earns trust.

---

## Publishing gate

Two booleans, both must be true for anything to reach the public:

- `housing_organizations.is_published`
- `housing_programs.is_published`

Enforced in RLS (migration 056 §12), not in the client — `housing_programs_public_read`
checks the parent organization too. So un-publishing an organization takes every
program under it off the site in one action, and a published program under an
unpublished org cannot leak that org's name through the state-page join.

Both default to `false`. Nothing publishes automatically, by hand entry or by a
future ingest run.

---

## Verification

`housing_verifications` is an append-only log. `housing_programs.last_verified_at`
is a denormalized copy of the latest **confirmed** check, maintained by the
`housing_verifications_sync` trigger.

**Only `outcome = 'confirmed'` advances the clock.** A call that reached nobody
(`unreachable`), or found the program moved or closed (`changed`, `closed`), is
evidence we know *less* than before — treating it as a fresh verification would
strip the staleness warning at the exact moment the listing most needed one.

The log itself is admin-only: `notes` can carry an intake worker's name or an
off-record remark. The public gets only the freshness date.

In admin, "Confirmed by phone" on `/admin/housing/:id` writes one of these rows.

---

## Reports

`housing_reports` takes public corrections. Anon can `INSERT`. Anon cannot
`SELECT` — there is deliberately **no** public read policy, because a report can
name a scam landlord and carry the reporter's email, and a readable table would
be a way to look up who reported whom.

`housing_reports_guard` also overwrites `created_at` with `now()` on every
insert. A column DEFAULT only applies when the column is omitted, and an
anonymous caller can name it explicitly over the REST API — without the
overwrite, twenty reports dated far in the future sit inside the guard's
one-hour window until that date arrives and block real corrections on that
listing permanently. A guard whose window the caller controls is not a guard.

Consequence for the client: **never call `.select()` on the insert.** Supabase
returns an empty body when the caller cannot read the row back, which surfaces
as an error to the user on an otherwise successful write. `submitReport()` in
`src/lib/housing.ts` is written correctly; copy it rather than rolling a new one.

### Rate limiting — an honest gap

The spec asks for rate-limited public inserts. Postgres cannot do per-client
limiting here: every anonymous submission arrives as the same `anon` role with
no IP and no session, so there is nothing to key a bucket on.

What migration 056 enforces via the `housing_reports_guard` trigger:
- identical `(program_id, report_type, message)` within 24 h is rejected
- more than 20 reports on one program within 1 h is rejected

That covers the realistic failure mode (a script or a stuck retry loop hammering
one listing) without a global cap that would let one abuser silence everyone
else's reports.

**Residual, and it is real:** twenty deliberate reports on one program still
suppress further corrections *on that program* for an hour, across all report
types — so a `scam` report can be blocked by a flood of `wrong_info`. The
`created_at` overwrite bounds that to an hour instead of forever, which is the
difference between a nuisance and a permanent gag, but it does not remove it.
Only per-client limiting does, and that has to live at the edge.

**Real per-IP limiting still needs a Cloudflare rate-limiting rule** in front of
`/rest/v1/housing_reports`. Not configured. Do this before linking a public
submission form.

---

## Source attribution and `raw_payload`

`housing_sources.raw_payload` is closed with a **column-level GRANT**, not by
RLS and not by the convention that the app queries the attribution view.

RLS filters rows, not columns, and `/rest/v1/housing_sources?select=raw_payload`
reaches the base table directly — "the app uses the view" is a convention, and
conventions do not survive contact with a URL. `anon` and `authenticated` are
granted SELECT on six named columns only; `raw_payload` is not among them, so
both `select=raw_payload` and `select=*` return a permission error.

Consequence: `raw_payload` is readable only by the service role. Admins are the
`authenticated` role over the API, so they cannot read it either. Nothing
surfaces it today. If admin ever needs it, add a separate admin-only view rather
than widening the grant.

---

## Sitemap

- The **51 state pages** are static entries in `public/sitemap.xml`, listed
  whether or not they have listings. Each answers a real query ("housing with a
  felony in Ohio") with the state's lookback summary and the national
  fallbacks. Adding them only once they fill up would make them invisible during
  exactly the period somebody was searching.
- **Organization pages** are generated between the `HOUSING_ORG_URLS` markers by
  `npm run housing:sitemap`. Run it after publishing or un-publishing an org.
  The script uses the **anon** key on purpose, so it sees exactly what the public
  sees; it refuses to run with the service-role key, which would list
  unpublished orgs.

---

## Known limitations (Phase 1)

- **No server rendering.** Built inside the existing Vite SPA at the maintainer's
  direction, so `/housing/fl` renders blank to a client without JavaScript. The
  build spec asked for no-JS browse and this does not meet it. Search engines
  that execute JS will index these pages; a text-mode browser or a crawler that
  does not will see nothing. Fixing it means either prerendering these routes at
  build time or moving `/housing` to a separate Next.js app.
- **Not in Phase 1, by scope:** `/housing/[state]/[city]`, `/housing/rights`,
  `/housing/submit`, `/housing/directories`, the ingest pipeline, the map view,
  user accounts. `housing_reports` and `submitReport()` exist ahead of the
  `/housing/submit` page because the table and its RLS were Phase 1 item 1.
- **No state is fully populated.** See `docs/apply-migration-058.md`.
- **Legal copy is unreviewed.** Florida's `record_lookback_summary` was drafted
  from statute and session-law citations by an AI session, not by an attorney.
  StreetRise already has an open item about unreviewed legal copy on `/privacy`
  and `/terms`; this belongs in the same review.
- **`/housing/rights` will need a HUD fact-check.** HUD OGC issued guidance in
  April 2016 that blanket criminal-record bans can violate the FHA via disparate
  impact. A later OGC memorandum dated 2025-09-25 exists and could not be read
  from the authoring session (hud.gov was unreachable). Confirm what is operative
  before writing any sentence about HUD's current position.
