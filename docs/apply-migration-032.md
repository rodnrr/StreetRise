# Migration 032 — South Florida seed (Miami-Dade + South Broward)

**Status: APPLIED to live 2026-08-06** (project `mldatfcwnmvrmxumzxyb`).

Nothing to do unless you are rebuilding the database from scratch or
restoring from a backup taken before 2026-08-06.

| Field | Value |
|---|---|
| File | `supabase/migrations/032_seed_south_florida_miami_broward.sql` |
| Applied | 2026-08-06 |
| Applied by | Claude Code session, via the Supabase MCP `execute_sql` tool |
| Rows added | 31 providers, 35 resources, 12 work_exchanges |
| Batch tag | `resources.import_batch_id = 'south_florida_batch_1'` |
| Re-runnable | Yes — every INSERT is `ON CONFLICT (id) DO NOTHING` with stable uuid5 IDs |

## What it added

First StreetRise coverage south of Bradenton. Before this migration the
live DB had zero resources in Miami-Dade or Broward.

- **Miami-Dade** — Miami, Overtown, Wynwood, Liberty City, Little Haiti,
  Hialeah, Miami Beach, North Miami, Homestead, Florida City, Cutler Bay
- **South Broward** — Hollywood, Pembroke Park, plus Broward county-wide
  orgs in Plantation and Fort Lauderdale that serve South Broward residents

Category spread: 11 shelter, 6 healthcare, 6 food, 4 outreach,
3 mental health, 3 legal aid, 1 employment, 1 hotline.

## Two things worth knowing

**1. Resources are seeded `pending`, not `verified`.** Every address,
phone, and website came off the org's own site or a public directory in
August 2026 — none of it was confirmed by phone. They render with the
amber "Community Listed" badge. Flip a row to `verified` in
`/admin/resources` only after an actual phone check.

**2. One row is deliberately invisible on the map.** Women In Distress of
Broward County is a domestic violence shelter with a confidential
address. It is seeded `access_type = 'confidential_address'` and
`is_map_ready = FALSE`, so the public map query excludes it by design —
34 of the 35 rows are publicly visible. The crisis line number is on the
record for admin reference and for any future phone-first surface.

## Verifying the apply

```sql
-- expect 35 / 34
SELECT count(*) AS total,
       count(*) FILTER (
         WHERE is_active
           AND verification_status IN ('verified','pending')
           AND is_map_ready AND lat IS NOT NULL AND lng IS NOT NULL
       ) AS map_visible
  FROM resources
 WHERE import_batch_id = 'south_florida_batch_1';

-- expect 12, each joining to a verified provider so /work renders
-- the org name and the "Apply on Website" button
SELECT count(*) FROM work_exchanges w
  JOIN providers p ON p.id = w.provider_id
 WHERE p.verification_status = 'verified'
   AND w.lat BETWEEN 25.3 AND 26.4;
```

## Geocoding

Coordinates come from the **US Census Bureau geocoder**
(`geocoding.geo.census.gov`, Public_AR Census2020 / Current benchmarks),
not Nominatim — the session's network policy blocks Nominatim, and the
Census geocoder is free, keyless, and does not rate-limit the way
Nominatim does. Results are street-range interpolated.

Three of 35 are block-level rather than rooftop, tracked in
`resources.geocode_quality = 'street_block'`:

| Resource | Why |
|---|---|
| Chapman Partnership Homestead | TIGER carries the block as SW 124th **Pl**, not **Ct** |
| Feeding South Florida | 2501 sits just below the 2503–2599 SW 32nd Ter range |
| Pantry of Broward / Legal Aid Broward | State-road addresses only match the `Public_AR_Current` benchmark |

All are within roughly 100 m. Worth tightening if you ever wire up a
paid geocoder.

## Front-end changes shipped alongside

- `HomePage` — `CITIES` flips Miami to `live: true`; hero headline and SEO
  description now name Miami
- `AboutPage` — coverage subtitle updated
- `lib/categories.ts` — food category description updated

Do **not** flip a metro to `live: true` in `HomePage.CITIES` without first
confirming it returns rows from the public map query. Miami was verified
at 34 anon-visible rows before flipping.

## Known follow-up

The default map center in `useMapStore` is still `{ lat: 28.2, lng: -81.9 }`
zoom 9 — Tampa Bay. A Miami or Hollywood visitor who does not grant
geolocation or run a search opens onto a map with no nearby pins. Changing
the default needs the persisted store key bumped (`streetrise-map-v3` →
`v4`) so existing visitors pick it up.
