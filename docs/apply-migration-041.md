# Applying Migration 041 — Transportation Assistance Seed

**Status: APPLIED to live 2026-09-03**, together with migration 047, by the
maintainer. Verified from this session by reading live: all six
`category = 'transportation'` rows are present, `pending`, and off-map
(`lat`/`lng` NULL, `is_map_ready = FALSE`) as designed, and 047's corrections
landed — PSTA Access and Mobility-on-Demand carry `(727) 540-1888`, the TD and
Direct Connect rows keep `(727) 540-1900`, and every `website` is a programme
deep link rather than an org root.

This runbook is kept as the record of what was applied and, more importantly,
of **what is still unverified in the seeded data** — see
[Verify the facts first](#verify-the-facts-first). Every row is `pending`, so
nothing here claims to be staff-verified; do not flip one to `verified` without
a real check.

## Why it exists

`SELECT count(*) FROM resources WHERE category = 'transportation'` returns **0**
on live (checked 2026-09-03). The `transportation` need chip has existed in
`NEED_DEFS` since the map revamp and has matched nothing the whole time, so
`isUsefulOption()` has been hiding it. This is the same gap migration 036 closed
for `clothing`.

It adds:

- **2 providers** — Pinellas Suncoast Transit Authority (PSTA) and Hillsborough
  Transit Authority (HART). Both `verified` / `unclaimed` / `seeded`, `user_id`
  NULL.
- **6 resources** — PSTA Transportation Disadvantaged bus fare, PSTA Access
  (ADA paratransit), PSTA Mobility on Demand, PSTA Direct Connect, HARTPlus
  Paratransit, HART Travel Training. All `pending` → amber "Community Listed".

## What it does NOT do — these rows never reach the map

All six carry `lat = NULL`, `lng = NULL`, `is_map_ready = FALSE` and
`access_type = 'phone_intake'`, so the public map query
(`… AND is_map_ready AND lat IS NOT NULL AND lng IS NOT NULL`) excludes every
one of them. **Applying this migration does not make the `transportation` need
chip appear on `/map`.** That is deliberate, for two separate reasons:

1. **It matches what these services are.** A countywide paratransit service or
   a bus-fare programme has a *service area*, not a doorway. The addresses
   stored are agency headquarters — real buildings, but not where the service
   reaches the public. Dropping a "transportation help" pin on a bus depot
   sends someone across a county to be told to phone. Same call migration 036
   made for Caring for Miami's mobile closet, applied to a whole category.
2. **Nothing was geocoded.** The session that wrote the migration had no
   network route to the Census geocoder (or any other), and inventing
   coordinates is the manufactured precision the rest of this schema avoids.
   `geocode_quality` is NULL rather than a claim.

These listings surface instead through `/transportation` (the directory and the
Ride Assistance Finder), the "Get There" panel on every listing, the homepage
"Browse by need" grid, and the footer.

If you *do* want them on the map later, that is a separate, deliberate change:
geocode each agency's public service centre, set `is_map_ready = TRUE`, and
decide whether a pin on a headquarters actually helps anyone.

## Verify the facts first

Everything below was compiled from a maintainer brief (Sept 2026) plus public
search results. The authoring session could **not** reach `psta.net` or
`gohart.org` (network egress blocked), so nothing was read from the agencies'
own pages.

Corroborated by public sources:

- TD programme: gross household income at or below **200% of the federal
  poverty level**, Pinellas residency, and not being able to get the trip
  covered another way.
- PSTA Access: ADA paratransit for people who cannot independently use
  fixed-route service for all trips; eligibility judged on function, not
  diagnosis.
- PSTA MOD: open to **active** PSTA Access users **after their first two
  months**; providers include Uber, Lyft, zTrip and a wheelchair service.
- HARTPlus: **$4 each way**; application plus in-person interview (and
  functional evaluation where needed) documented as taking **at least 21 days**.

One correction to the brief was applied in the file: HARTPlus reservations are
documented as **one to three days** in advance, not specifically "the day
before".

### Migration 047 resolved most of this — and is applied

**After this section was written, the maintainer reached the agencies' own
pages on 2026-09-03; `047_correct_transportation_seed_accuracy.sql` records
what they found, and it is applied to live.** It is the answer to most of the
table below. Anywhere the two disagree, **047 is right and the text below is
the superseded first pass** — kept because the corrections are more legible
next to what they corrected.

What 047 settles:

- **Phone numbers were wrong.** PSTA Access and Mobility-on-Demand are
  `(727) 540-1888`, not the `(727) 540-1900` seeded for all of them — that
  number is for TD applications and general information. This was the entry in
  the table below flagged as the one that strands someone.
- **`website` now deep-links each programme** to its current official page
  instead of pointing at the org root.
- **The HARTPlus timing "correction" above was itself wrong.** Reservations are
  required **the day before** service, as the original brief said — so the
  maintainer's brief was right and the public sources this session found were
  not. Worth reading as a caution about the rest of this section.
- **Eligibility determination** is completed **within 21 days after the
  application process is complete** — an upper bound, not the "at least 21
  days" floor seeded here, which was pessimistic in a way that could discourage
  someone from applying.
- **The MOD description no longer names a specific taxi vendor**, because
  PSTA's own pages are not internally consistent about it.

Still unverified after 047, so still check before flipping any row to
`verified`: the **eight designated transit locations** figure for Direct
Connect, and both street addresses.

**Check these before flipping any row to `verified`:**

| Claim | Where | Why it matters |
|---|---|---|
| Direct Connect operates through **eight designated transit locations** as of 2026-09-01 | Direct Connect description | Maintainer's figure. Dated in the copy rather than stated as standing fact, because this count changes. |
| Phone numbers `(727) 540-1900` and `(813) 254-4278` | both providers, all six resources | Unverified. A wrong number on a transportation listing strands someone. |
| Addresses `3201 Scherer Dr, St Petersburg` and `1201 E 7th Ave, Tampa` | all six resources | Unverified. They are not routed to (see above) but they still render. |
| `website` is the org root on every row | all six | The programme pages could not be fetched. Replace with the real deep links during the apply if you can reach them. |

No TD fare price is stated anywhere in the migration, on purpose — the public
figures found were not confirmable and prices move.

## The `ride:` tag vocabulary

Matching in the Ride Assistance Finder runs entirely off `ride:`-prefixed
entries in `resources.tags`, using the same internal `key:value` convention the
import pipeline already uses for `subcategory:` / `access_src:`. **No DDL, no
new column** — `tags` is an unconstrained `TEXT[]` on live.

```
ride:kind:<fare_assistance|paratransit|subsidized_rideshare|travel_training>
ride:mode:<bus|rideshare|paratransit|wheelchair>
ride:elig:<low_income|disability|medicaid|veteran>
ride:area:<county slug, e.g. pinellas>
ride:notice:<same_day|next_day|advance|enrollment>
```

`ride` is registered in `INTERNAL_TAG_PREFIXES` (`src/lib/mapFilters.ts`), so
none of it renders as a public badge on `/resources/:id`. Adding a programme
after this migration means adding a row with the right tags — not changing code.
The app side is `src/lib/rideOptions.ts`.

`ride:notice:enrollment` is the load-bearing one. Every programme here except
Direct Connect and Travel Training requires approval *before* a first trip.
Someone who needs a ride in the next hour will not get it from an enrollment
programme, and the finder says so rather than listing it as an answer.

## How it was applied (and how to re-run it)

Done on live 2026-09-03. Recorded here for a rebuild or a second environment:

1. Supabase dashboard → project `mldatfcwnmvrmxumzxyb` → **SQL Editor**.
2. Paste `supabase/migrations/041_seed_transportation_assistance.sql`.
3. Run it once.
4. **Then paste and run `supabase/migrations/047_correct_transportation_seed_accuracy.sql`.**
   041 seeds the rows; 047 corrects the phone numbers, deep links and timing
   language in them (see above). **Never run 041 without 047** — 041 alone
   publishes `(727) 540-1900` on PSTA Access and Mobility-on-Demand, which is
   the general InfoLine rather than the programme's own number.

Both are safe to re-run: 041's `INSERT`s are `ON CONFLICT (id) DO NOTHING` over
stable uuid5 ids, and 047's `UPDATE`s are keyed by `external_id`.

Idempotent: both `INSERT`s are `ON CONFLICT (id) DO NOTHING` over stable uuid5
ids (`uuid5(NAMESPACE_URL, 'https://streetrise.org/seed/041/<external_id>')`),
so a second run is a no-op.

`confidence_score = 35` in the file is documentation, not control — the column
is trigger-managed and the literal is discarded on insert. See migration 036's
header and `docs/apply-migration-037.md` for why live stores 35 for `pending`
rows while a repo-rebuilt database may not.

## Verify

```sql
-- 2 providers, both unclaimed/seeded with no user_id.
-- Anything other than 'unclaimed'/'seeded' means the column defaults won
-- and the agency could never claim its own listing — see migration 027.
SELECT organization_name, claim_status, source_type, user_id, verification_status
FROM providers
WHERE external_id IN ('PSTA-001', 'HART-001');

-- 6 resources, all pending, all deliberately off the map.
SELECT external_id, name, verification_status, is_map_ready, access_type, lat, lng
FROM resources
WHERE import_batch_id = 'transportation_batch_1'
ORDER BY external_id;

-- Every row carries a kind, an area and at least one mode.
SELECT external_id,
       array_to_string(ARRAY(SELECT t FROM unnest(tags) t WHERE t LIKE 'ride:%'), ' ') AS ride_tags
FROM resources
WHERE import_batch_id = 'transportation_batch_1'
ORDER BY external_id;

-- Expect 6. This is the query /transportation runs (fetchRideAssistance).
SELECT count(*) FROM resources
WHERE is_active AND verification_status IN ('verified','pending')
  AND category = 'transportation';

-- Expect the public map total to be UNCHANGED by this migration (165 as of
-- 2026-09-03) — these rows are not map-ready, so they must not appear here.
SELECT count(*) FROM resources
WHERE is_active AND verification_status IN ('verified','pending')
  AND is_map_ready AND lat IS NOT NULL AND lng IS NOT NULL;
```

Then open `/transportation` as an anonymous visitor and confirm all six render
in the directory — that is the RLS check, since these rows are read by `anon`
through `resources_public_read`.

## Coverage gap worth naming

This batch covers **Pinellas and Hillsborough only**. StreetRise's public copy
says Tampa Bay, Orlando and Miami. Orlando (LYNX / ACCESS LYNX) and Miami-Dade
(Golden Passport, STS paratransit, Go Connect) have directly equivalent
programmes and are not seeded here. Until they are, the Ride Assistance Finder
will honestly tell an Orlando or Miami visitor that these programmes serve a
different area, rather than pretending otherwise — but it is a real hole, and
the next transportation batch should close it.
