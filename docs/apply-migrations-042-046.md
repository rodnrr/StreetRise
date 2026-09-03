# Applying Migrations 042–046 (+048) — Transit stops from four Florida GTFS feeds

**Status: APPLIED to live 2026-09-03** (042–046 plus 048), by the maintainer.
Verified from this session by reading live: **11,091 stops**, **184 routes**,
four distinct feed fingerprints, and **35** `public_transit_accessible` flags
carrying the `transit_feed` stamp.

> ### ⚠️ One outstanding re-run: migration 045
>
> Live carries the **pre-correction** Miami-Dade rows. 045 was regenerated
> after it was applied, to drop routes that neither board nor alight at a stop
> (a `stop_times` call with `pickup_type = 1` **and** `drop_off_type = 1`).
> Two stops on live are still wrong:
>
> | Stop | Says it is served by | Should be |
> |---|---|---|
> | `mdt:7836` — NW 20 ST & NW 5 PL | `MIAALP`, 20, 32 | 20, 32 |
> | `mdt:9656` — SW 344 ST & SW 2 AV (E/F) | `301`, 302, 344 | 302, 344 |
>
> **Re-running 045 in full is the fix, and it is safe.** The upsert restamps
> all 6,973 Miami-Dade rows with the new fingerprint `03abfad9b9e5`, so the
> trailing `DELETE ... feed_fingerprint IS DISTINCT FROM` matches nothing;
> neither stop moves, so no distance and no flag changes; and the backfill runs
> with `resources_updated_at` disabled, as it always does. Verify with the
> query at the end of this file.
>
> Low urgency — two stops each naming one route that passes through without
> stopping — but it is a claim about service that a passenger cannot use.

| Migration | Agency | County | Stops | Routes | Feed | Size |
|---|---|---|---|---|---|---|
| **042** | — | — | — | — | DDL only | 6 KB |
| **043** | HART | Hillsborough | 2,245 | 32 | `2608.1`, valid → 2027-01-02 | 410 KB |
| **044** | MCAT | Manatee | 928 | 16 | `20260814`, valid → 2027-06-04 | 170 KB |
| **045** | Miami-Dade Transit | Miami-Dade | 6,973 | 122 | derived, valid → 2027-12-31 | 1.4 MB |
| **046** | GoPasco | Pasco | 945 | 14 | `20260828`, valid → 2031-12-13 | 180 KB |

**Run 042 first** — the other four insert into tables it creates. 043–046 are
independent of each other and can be applied in any order, or individually.
Each is self-contained: it loads its agency's stops *and* runs the
`public_transit_accessible` backfill, so applying just 045 correctly flags the
Miami listings without a separate step. The backfill only ever raises a flag,
so running it four times costs nothing.

The app degrades honestly without them: `src/lib/transit.ts` returns
`no_coverage` when the query finds nothing, and the Get There panel renders no
transit line at all rather than an error or an empty box.

## Why

`resources.public_transit_accessible` is a hand-set boolean the map renders as
a "Near transit" facet. On live today **all 21 Hillsborough listings say
FALSE** — including First Baptist Progress Village, which is **17 metres** from
a stop on Route 8. The filter isn't empty, it's wrong, and it hides listings
from the people who filter on it.

Measured against the four feeds:

| | Hillsborough (HART) | Miami-Dade (MDT) | Pasco | Manatee |
|---|---|---|---|---|
| Listings on live | 21 | 25 | 2 | **0** |
| Within 400 m of a stop | 11 | 23 | 0 | — |
| Flag currently wrong (will be raised) | 11 | 5 | 0 | — |

The far end matters as much as the near end. Hillsborough's four parks and
campgrounds are **7 to 11 miles** from any stop, and Pasco's two campgrounds
are 1.5 and 3.8 miles out. For someone without a car that is the single most
important fact on the page, and the schema had no way to say it.

**Miami-Dade also confirms rather than corrects.** 18 of the 19 hand-set TRUE
flags from migration 032 measure inside 400 m, most within 100 m — a good
result for hand-entered data, and worth knowing. The one exception, Branches
North Dade, comes out at 400.4 m: over the line by a rounding error, and left
alone, because none of this ever lowers a flag.

**Manatee loads stops that nothing currently matches.** There are no public
Manatee listings on live (CLAUDE.md records migration 022 as having expanded
into "Manatee/Bradenton", but nothing from it is publicly visible). It is still
worth loading: the first Manatee listing gets a nearest-stop line the day it is
added, and without it the app cannot distinguish "no feed" from "no transit".

## What each migration does

**042 — DDL only.** `transit_routes` (33 rows for HART) and `transit_stops`
(one row per stop with active service), plus a btree index on `(lat, lng)`,
`updated_at` triggers, public-read / admin-write RLS mirroring `faq` and
`blog_posts`, the `nearest_transit_stop()` function the app calls, and a
`resources.public_transit_accessible_source` column recording where that flag
came from.

No PostGIS: that function narrows by bounding box (index-served) then orders by
haversine and returns one row. Ordering has to happen server-side — a 40 km box
around downtown Miami holds 6,964 of Miami-Dade's 6,973 stops, and an earlier
revision fetched a capped, *unordered* page of them and picked the nearest of
whatever came back. It is `SECURITY INVOKER`, so RLS still applies, with
`search_path` pinned. It takes an optional `in_agency`, and the app passes the
county's operator whenever the city resolves — HART and GoPasco publish stops
**2 and 3 metres apart** at the Wiregrass park-and-ride and AdventHealth Wesley
Chapel, so an unscoped search answers a Pasco address with the wrong operator,
and once HART's feed expires it would silence the panel entirely while a valid
GoPasco stop sits beside it.

**043 — data + backfill.** 2,245 stops and 32 routes generated by
`scripts/build-transit-sql.ts` from HART's feed **2608.1** (valid 2026-06-07 →
2027-01-02), then a guarded `UPDATE` on `resources`.

## Provenance — this is not like migration 041

Everything in 043 is read straight out of the agency's own published bundle,
supplied by the maintainer 2026-09-03. Stop coordinates, route names, service
calendars and fares all come from HART. Contrast migration 041, whose phone
numbers and eligibility details are second-hand and still need verifying.

Only service_ids active on 2026-09-03 were counted. The feed also carries a
period that ended 2026-08-15; including it would have let stops that lost
service in the August shake-up keep making listings look reachable. **6,307 of
10,878 trips** and **208,452 of 411,239** `stop_times` rows are on active
service. The rest are deliberately dropped.

### Fares, straight from `fare_attributes.txt`

| Fare class | Price | Routes |
|---|---|---|
| 1 | $2.00 | 29 regular bus routes |
| 3 | **$0.00** | 800 — TECO Line Streetcar |
| 4 | $1.00 | 576 — HARTFlex East Fletcher |
| 5 | **$0.00** | SkyConnect (Tampa International Airport) |

Free transport through downtown Tampa, Channelside and Ybor is materially
useful to the people StreetRise serves, and the app has never mentioned it.
`is_fare_free` is set only from an explicit `0.00` — a route the feed prices at
NULL is *unknown*, not free.

## The backfill raises freely, and lowers only what it raised

Two statements per migration. The **raise** sets the flag where a stop is
within 400 m and stamps `public_transit_accessible_source = 'transit_feed'`.
The **lower** clears the flag only for rows carrying that stamp whose stop the
current feeds no longer contain — so a later GTFS refresh that withdraws a stop
also withdraws the claim, instead of leaving it true forever.

**A hand-set TRUE has a NULL source and is never touched.** That is the whole
point of the column. A blind reset-and-recompute, run against live today, would
clear Branches North Dade — a flag hand-set by migration 032 that sits 400.2 m
from its nearest stop, two metres past an arbitrary threshold and almost
certainly right. 19 of the 29 currently-true rows were set by hand, and a
provider who knows about a stop no published feed lists is the most valuable
kind of TRUE this column holds.

Nothing is lowered on a first run, because nothing is stamped yet.

The loader handles the feed changing. A `resources_transit_flag_on_move`
trigger (migration 042) handles the *listing* changing: both `AdminResourceEdit`
and `ProviderListingEdit` write `lat`/`lng`, so correcting a geocode would
otherwise leave a flag derived for the old position until the next GTFS
migration, a quarter away. It recomputes rather than clears — a corrected
address is as likely to be near a stop as far from one — and returns early on a
hand-set TRUE, same rule as everywhere else.

The reason a *blanket* FALSE is still never written, for rows we did not
raise:

- **We hold one agency's feed.** HART is Hillsborough. St. Petersburg is PSTA,
  Orlando is LYNX, Miami-Dade is its own. Writing FALSE outside Hillsborough
  would assert "no bus" on the basis of having no data.
- **Even inside Hillsborough** a stop can exist that this feed doesn't
  describe — a school shuttle, a stop added mid-quarter.

So: explicit TRUE where a stop is measurable within 400 m, silence everywhere
else. Same fail-open rule the map applies to `overnight_allowed` and
`gender_policy`, and the same "only raises, never lowers" shape as migration
040's backfill.

`resources_updated_at` is disabled across the UPDATE (same idiom as 037 and
040). "Updated 3d ago" claims a *human* checked the listing; a derived-data
backfill must not manufacture that.

### One caveat on the 11 rows

Seven of the eleven sit in three clusters where several distinct services share
one rounded coordinate — Red Shield Center, Trinity Cafe Nebraska, Recuperative
Care and an emergency shelter all carry `27.9614,-82.4597`, and those are not
the same address. All three clusters are in central Tampa where stops are
dense, so the TRUE flag is very likely right anyway, but **the underlying
geocoding bug is real and worth fixing separately.** It is logged in
`docs/OPEN_ITEMS.md`.

## How it was applied (and how to re-run it)

Done on live 2026-09-03. Recorded here for a rebuild, a second environment, or
the outstanding 045 re-run noted at the top.

1. Supabase dashboard → project `mldatfcwnmvrmxumzxyb` → **SQL Editor**.
2. Paste and run `supabase/migrations/042_transit_stops.sql`.
3. Paste and run `supabase/migrations/043_seed_hart_transit.sql`.
4. Then 044 (MCAT), 045 (Miami-Dade) and 046 (GoPasco) — independent of each
   other and of order, each self-contained.
5. **Finally run `supabase/migrations/048_optimize_transit_rls.sql`.** It
   replaces 042's admin `FOR ALL` policy on each transit table with
   write-only admin policies, leaving a single public SELECT path. 042's
   version is functionally correct but trips Supabase's
   `multiple_permissive_policies` advisor, since the public and admin SELECT
   paths overlap on tables that are public-read anyway. Applying 042 without
   048 works; it just leaves that warning standing.

043 is ~410 KB, which is an unpleasant paste on a phone. Both are idempotent —
043's INSERTs are `ON CONFLICT (id) DO UPDATE`, so a re-run refreshes rather
than duplicating, and the backfill only ever raises a flag that is already
TRUE. 042 is not idempotent (plain `CREATE TABLE`); re-running it errors
harmlessly with "already exists".

## Refreshing when HART publishes a new feed

Roughly quarterly, on service-change dates:

```bash
unzip HARTgoogle_transit.zip -d /tmp/gtfs
npm run transit:sql -- /tmp/gtfs hart > supabase/migrations/0NN_seed_hart_transit.sql
```

Commit the output as a **new** migration; don't patch 043. The generated SQL
ends with `DELETE … WHERE feed_fingerprint IS DISTINCT FROM '<run fingerprint>'`,
so stops that disappeared from the network are removed rather than lingering and
claiming service that no longer exists — and then re-runs the
`public_transit_accessible` backfill, so a listing whose only nearby stop was
withdrawn loses the flag along with the stop.

The cleanup keys on `feed_fingerprint` — a hash of the rows a run emits —
rather than on the publisher's `feed_version`, because the published string does
not reliably move when the network does. HART's 2608.1 bundle carries two
service periods, so regenerating it for the later one (via the optional `asOf`
argument) emits a different stop set under an identical version; keyed on
`feed_version` the cleanup would spare everything dropped, and one HART stop is
in exactly that position. An agency republishing a corrected bundle without
bumping its version has the same effect. `feed_version` remains as human-facing
provenance.

That backfill is **emitted by the generator**, not hand-written into 043–046,
and that placement is load-bearing: a refresh commits this output verbatim, so
anything living only in the seed migrations would run once at first seed and
never again. Every future migration this generator produces carries it.

Adding PSTA, LYNX or Miami-Dade later is another run with a different agency
slug — not a schema change. The `agency` column and the `<agency>:<id>` primary
key exist so a Pinellas stop can never overwrite a HART stop, and both agencies
number their stops from 1.

## Verify

```sql
-- Expect 2245 stops / 32 routes, all feed 2608.1.
SELECT agency, feed_version, feed_valid_until, count(*)
FROM transit_stops GROUP BY 1,2,3;
SELECT agency, feed_version, count(*) FROM transit_routes GROUP BY 1,2;

-- Expect exactly routes 800 and Sky.
SELECT route_id, short_name, long_name, fare_price
FROM transit_routes WHERE is_fare_free ORDER BY route_id;

-- Nothing should have a NULL weekday window — every active stop has weekday
-- service in this feed. A non-zero count means the time parser regressed
-- (HART right-aligns single-digit hours as ' 5:01:41'; see the script).
SELECT count(*) FROM transit_stops WHERE weekday_first IS NULL;

-- Spot-check a known stop: expect '05:01' / '00:32' on Route 34.
SELECT stop_name, route_short_names, weekday_first, weekday_last
FROM transit_stops WHERE id = 'hart:1249';

-- The nearest-stop function the app calls. From Camillus House in downtown
-- Miami this must return a stop a few dozen metres away, not an arbitrary one
-- from elsewhere in the county.
SELECT stop_name, route_short_names
FROM nearest_transit_stop(25.7907, -80.2069, 40);

-- And from First Baptist Progress Village: expect the Progress Village Park
-- stop on Route 8, ~17 m away.
SELECT stop_name, route_short_names
FROM nearest_transit_stop(27.899227, -82.360059, 40);

-- After the backfill: expect 29 + 11 = 40, up from 29.
SELECT count(*) FROM resources
WHERE is_active AND verification_status IN ('verified','pending')
  AND is_map_ready AND public_transit_accessible;

-- Provenance split. Expect the 29 pre-existing rows to stay NULL (hand-set,
-- untouchable) and only newly-raised rows to carry the stamp.
SELECT public_transit_accessible_source, count(*)
FROM resources WHERE public_transit_accessible GROUP BY 1;

-- Nothing should have been lowered on a first run.
SELECT count(*) FROM resources
WHERE public_transit_accessible_source = 'transit_feed'
  AND NOT public_transit_accessible;  -- expect 0

-- The move trigger exists and is scoped to coordinate changes.
SELECT tgname, pg_get_triggerdef(oid) LIKE '%UPDATE OF lat, lng%' AS scoped
FROM pg_trigger WHERE tgname = 'resources_transit_flag_on_move';

-- The backfill must NOT have manufactured freshness. Record max(updated_at)
-- BEFORE applying and confirm it is unchanged afterwards.
SELECT max(updated_at) FROM resources;
```

Then open a Tampa listing as an anonymous visitor and confirm the Get There
panel shows the nearest stop — that is the RLS check, since `anon` has to read
both tables. Open one of the Plant City parks and confirm it shows the amber
"nearest HART stop is about 8 mi away" line instead.

### Verifying the 045 re-run

```sql
-- Both rows should come back with the route that only passes through removed,
-- and the new fingerprint. Before the re-run, 7836 lists MIAALP and 9656
-- lists 301.
SELECT id, stop_name, route_short_names, feed_fingerprint
FROM transit_stops
WHERE id IN ('mdt:7836', 'mdt:9656')
ORDER BY id;

-- Nothing should have been deleted: Miami-Dade stays at 6,973 stops, and every
-- row should carry the new fingerprint.
SELECT feed_fingerprint, count(*)
FROM transit_stops
WHERE agency = 'mdt'
GROUP BY 1;
```
