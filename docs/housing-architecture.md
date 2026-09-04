# Housing as a StreetRise capability — implementation note

Written before the code, as the work log for this change.

**One sentence:** housing becomes a category of the existing `resources` table with a
1:1 detail extension, not a second directory.

This replaces the approach in **PR #107**, which built a parallel
`housing_organizations` → `housing_programs` → `housing_locations` universe with its
own publishing gates, its own verification log, its own reports table and its own
routes. That PR is kept open as a reference implementation. None of its migrations
(056–058 in that branch) were applied to production, so nothing here has to preserve
them as established schema. The numbers 056/057 are reused on this branch for
different files — if both branches were ever applied, that would collide, which is
another reason #107 should be closed rather than merged.

---

## 1. Architecture discovered on `main`

Read directly from the code at `746eca3`, not from CLAUDE.md's description.

**`resources` is already the right shape for this.** It is not a map-only table:

- `lat`/`lng` are **nullable** (migration 004) and `access_type` already covers
  `onsite | phone_intake | web_intake | confidential_address | not_map_ready`.
  A voucher program with no walk-in door is already representable.
- `is_map_ready` decides map participation independently of whether the row exists.
- `population_focus` is an unconstrained `TEXT[]` and **already contains `reentry`**.
- `resource_type` is `TEXT` with a `CHECK` list — extending it is a constraint swap,
  not an enum migration, and it already carries `transitional_housing`,
  `emergency_shelter`, `veteran_housing`, `youth_shelter`,
  `domestic_violence_shelter`.
- Trust is already generalized: `confidence_score`, `stale_after_days`,
  `last_verified_at`, `last_provider_update_at`, `verification_notes`.

**The filter pipeline is a predicate table, not a query builder.**
`fetchMapResources()` applies only the public visibility predicate and fetches once
(capped at `PUBLIC_RESOURCE_LIMIT = 2000`); every facet is a `match`/`test` function
in `NEED_DEFS` / `TOGGLE_DEFS` in `mapFilters.ts`. Adding a filter means adding a row
to those tables. That is why housing filters can *compose* with distance, gender
policy, population focus and open-now instead of needing a parallel query path.

**`category` is a Postgres enum** (`resource_category`) with no `housing` value.
Adding one requires `ALTER TYPE ... ADD VALUE`, and the new value cannot be *used*
in the transaction that adds it — hence a standalone migration, following the
precedent of 007 and 011.

**There is no reports/corrections table at all.** Nothing to generalize *from*, so
the generalized version gets built once, correctly, for every category.

---

## 2. What is reused unchanged

| Concern | Reused |
|---|---|
| Organizations | `providers` — no housing provider identity system |
| Discoverability | `resources`, `fetchMapResources`, `filterResources` |
| Filters | `NEED_DEFS` / `TOGGLE_DEFS` / `MapFilters` |
| Geography | `lat`/`lng` nullable, `access_type`, `is_map_ready` |
| Eligibility axes | `population_focus` (incl. existing `reentry`), `gender_policy` |
| Trust & freshness | `confidence_score`, `stale_after_days`, `last_verified_at` |
| Ownership | `provider_claims`, existing RLS |
| Editing | existing provider portal + admin resource pages |
| Localization | `i18n.ts` EN/ES dictionary |
| Cards & detail | `ResourceCard`, `ResourceSheet`, `ResourceDetailPage` |

---

## 3. What is extended

1. **`resource_category` gains `housing`.** (Migration 056, alone in its transaction.)
2. **`resources_resource_type_check` gains housing types** — `affordable_housing`,
   `public_housing`, `subsidized_housing`, `permanent_supportive_housing`,
   `recovery_residence`, `shared_housing`, `housing_navigation`, `voucher_program`.
   `transitional_housing` and the shelter types already existed and are **not**
   duplicated.
3. **`resource_housing_details`** — 1:1 extension keyed on `resource_id` (PK = FK).
   Housing-specific fields live here so the base table is not overloaded, and a
   non-housing resource carries no housing columns at all.
4. **`resource_reports`** — generalized corrections for *any* resource.
5. **`resource_evidence`** — generalized provenance for *any* resource.

### Why an extension table rather than columns on `resources`

`resources` is read in full by `fetchMapResources()` for every map visit. Sixteen
housing columns would be fetched for all ~217 rows to serve the handful that are
housing. The extension is embedded via PostgREST (`housing:resource_housing_details(*)`)
so the "fetch once, filter in the browser" rule still holds, and rows with no housing
details simply embed `null`.

### Voucher assistance vs. voucher acceptance

Deliberately two different things, independently queryable:

- **Assistance** — the Housing Choice Voucher program itself, run by a housing
  authority. That is a *resource*: `category = housing`,
  `resource_type = 'voucher_program'`. It typically has no walk-in address, which is
  why nullable coordinates matter.
- **Acceptance** — a housing resource that takes vouchers. That is a *property* of
  that resource: `resource_housing_details.accepts_vouchers`, tri-state.

Public copy says "Section 8 / Housing Choice Voucher" because that is what people
search for; the canonical field names say voucher.

---

## 4. What is discarded from PR #107

| Discarded | Why |
|---|---|
| `housing_organizations` | Duplicates `providers` |
| `housing_programs` | Duplicates `resources` |
| `housing_locations` | `resources.address` + nullable lat/lng already covers it |
| `housing_verifications` | Duplicates the existing trust system; generalized as `resource_evidence` |
| `housing_sources` | Same — generalized |
| `housing_reports` | Generalized as `resource_reports` |
| `housing_states` + 51 seeded rows | Geography comes from resource addresses; a states table existed only to hang SEO pages off |
| 51 sitemap state pages | Thin programmatic SEO with no inventory behind it |
| `/housing/:state`, `/housing/org/:slug` | Discovery goes through `/map` and `/resources/:id` |
| `/admin/housing` org universe | Housing is managed on the existing resource admin |
| AI-drafted state-law summaries | Unsourced legal claims; Codex found a materially wrong FHA statement in one |
| The five unverified Florida orgs | Kept as research leads in this doc, not as rows |

**Kept from #107** (the genuinely good ideas): null ≠ no; freshness disclosed rather
than hidden; never publish guessed contact or location data; source provenance;
scam education; a load-failure state that is distinct from an empty state.

---

## 5. Migrations introduced

| File | Contents | Risk |
|---|---|---|
| `056_housing_category.sql` | `ALTER TYPE resource_category ADD VALUE 'housing'` | Additive. Must run alone — the value is unusable until this commits. |
| `057_housing_details_reports_evidence.sql` | resource_type CHECK swap; `resource_housing_details`; `resource_reports`; `resource_evidence`; RLS on all three | Additive. Creates only; the one `ALTER` is a CHECK constraint widening, which cannot reject an existing row. |

No destructive change. No column dropped, no policy on an existing table replaced,
no backfill — so no `updated_at` stamping of the kind migrations 037/038 have to
guard against. Nothing is applied to production by this PR.

---

## 6. Public UX changes

- Housing resources appear in **search, map, list and filters** like everything else.
- **`/housing`** is a curated view: shortcut cards that deep-link into `/map` with
  canonical facets pre-applied (`?housing=<slug>`), exactly as `quickFilter` already
  works. It runs no query of its own against a housing table, because there is no
  housing table to query.
- Shortcuts — Affordable, Section 8 / Voucher, Voucher-friendly, Second Chance,
  Transitional, Supportive, Veterans, Families — are **facet combinations**, not
  database categories.
- **`/housing/scams`** — practical safety guidance, EN/ES, no legal guarantees.
- Eligibility renders tri-state everywhere: "Yes — considered" / "No" /
  "Not stated — call to ask", visually distinct, never collapsing unknown into no.
- Waitlist status shows *when it was last checked*, so an old "open" cannot imply
  current availability.

## 7. Provider and admin changes

No new portal. The existing provider listing editor and admin resource editor grow a
**Housing details** section that appears only when `category = housing`. Providers
maintain voucher acceptance, eligibility, rent range, waitlist status, intake method
and application URL on the listing they already own.

## 8. How this scales nationally

Nothing here is Florida-specific. Geography is whatever is in `resources.address` and
`lat`/`lng`; there is no states table, no per-state page and no per-state seeding
step. Expanding to a new metro is the same act it already is for every other
category: add providers and resources. `/housing` works with one listing or ten
thousand, and geographic landing pages get added **when inventory justifies them**,
not before — which is why this PR adds exactly two housing URLs to the sitemap.

---

## Research leads (NOT data)

From PR #107's research, unverified and deliberately not seeded: Operation New Hope
(Jacksonville), Abe Brown Ministries (Tampa), Pinellas Ex-Offender Re-Entry Coalition,
Project 180 (Sarasota), Dismas Charities (FL locations). Every address and phone
number available for these came from third-party aggregators, never the organizations
themselves. They enter StreetRise through the normal provider/resource workflow, after
a call, or not at all.
