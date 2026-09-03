# Transit feed provenance — 2026-09-03

This record documents the static GTFS inputs evaluated for the StreetRise transit coverage expansion after PR #100.

All feeds were downloaded in GitHub Actions, checked for the required GTFS tables (`agency.txt`, `routes.txt`, `stops.txt`, `trips.txt`, `stop_times.txt`), SHA-256 hashed, and processed with `scripts/build-transit-sql.ts` using an explicit reference date of `20260903`.

Raw GTFS ZIP archives are **not** committed to the repository. Only generated SQL migrations and this provenance record are retained. As of migration 054, future generator runs call the single canonical `refresh_transit_accessibility_flags()` function, so feed refreshes inherit the current-feed / exactly-one-mile accessibility rule rather than carrying a duplicate proximity implementation.

## Accepted feeds

| Migration | StreetRise slug | System / coverage | Source used | ZIP SHA-256 | Active output | Feed validity |
|---|---|---|---|---|---|---|
| `050_seed_psta_transit.sql` | `psta` | PSTA — Pinellas | `https://www.psta.net/latest/google_transit.zip` | `0eac1f7e941729be83fc17c6a9b21a6750a068161da66c8d046b5434442053aa` | 3,986 stops / 39 routes | 2027-02-06 |
| `051_seed_lynx_transit.sql` | `lynx` | LYNX — Orange, Osceola, Seminole | `http://gtfsrt.golynx.com/gtfsrt/google_transit.zip` | `cbca5a8b07e49b21ede1491e841543b4d78c65a709161d26664d3b9d4e6bc9d6` | 3,687 stops / 62 routes | 2026-12-12 |
| `052_seed_bct_transit.sql` | `bct` | Broward County Transit — Broward | Mobility Database official BCT archive `mdb-330-202606300003` | `486e7cc3a40f0fa39fd9124258af11199f65921dcdc93de6bf69d9340a4c5afe` | 4,657 active stops / 44 routes | 2026-09-26 |
| `053_seed_citrus_connection_transit.sql` | `citrus_connection` | Citrus Connection — Polk | `https://www.ccbusinfo.com/InfoPoint/gtfs-zip.ashx` | `2c606f89a0034205edb05bbeaff44f8722b7b7fecc2edfbfc045b1ad3772cdd6` | 949 stops / 27 routes | 2027-12-31 |
| `055_seed_breeze_transit.sql` | `breeze` | Breeze Transit — Sarasota County | `https://breezerider.tripsparkhost.com/static/google_transit.zip` | `e658c0031c44d8947ac02b1db6b6f5d464fcc37fcf2f1d23a2295978c13a95d9` | 1,310 stops / 15 routes | 2026-12-04 |

### Breeze source note

Sarasota County identifies Breeze Transit as its public transit system and publishes developer guidance for GTFS data. The producer feed used here is Breeze's TripSpark-hosted static GTFS endpoint. Before migration 055 was committed, the archive was independently cross-checked against the current cataloged Breeze feed, then pinned during the build by its SHA-1 (`20c127087e440ccc5f0b53b31d2c7a62c37e98e1`) and SHA-256 above. The importer emitted feed version `2026 Spring V1 and 77 78 R03`, 1,310 active stops and 15 routes, with service through 2026-12-04. Migration 055 finishes by calling migration 054's canonical current-feed / one-mile accessibility refresh rather than carrying the generator's former 400 m rule.

### Broward source note

Broward County Transit's producer URL (`https://www.broward.org/bct/documents/google_transit.zip`) returned HTTP 403 during the build. The accepted input is the exact official BCT snapshot archived by Mobility Database (`mdb-330`), downloaded there on 2026-06-30. Mobility Database reports 44 routes and a service period beginning 2026-06-21 and ending 2026-09-26/27. The archive URL is pinned in the temporary build history rather than silently substituting a different network.

## Rejected feed — Hernando County TheBus

The county-hosted GTFS file was downloaded and validated structurally but **rejected for staleness**:

- Source: `https://media-002-us.cdn.govstack.com/hernandocounty-us/media/zkqclmfs/current-gtfs-thehernandoexpress-fl-us.zip`
- SHA-256: `fe6a16bfa5007a3c962b042da483d8e6b40eeb14a7cb1404c6337a768041c1cd`
- Feed version: `20250228`
- Published feed validity: **2026-03-08**
- Importer would have emitted only 328 stops / 8 routes

That conflicts with Hernando County's current public route information, which lists Routes 1–11 and says Routes 10 and 11 launched in May 2026. No Hernando migration was committed and Hernando is **not** enabled in `AGENCIES_BY_COUNTY`. StreetRise should remain silent there until a current GTFS source is available.

## Existing Miami-Dade coverage retained

Miami-Dade Transit was already loaded by PR #100 and is intentionally **not duplicated** in this expansion:

- StreetRise slug: `mdt`
- Existing live rows checked 2026-09-03: **6,973 stops / 122 routes**
- Existing feed validity: **2027-12-31**
- `miami_dade` remains mapped to `['mdt']`

The multi-agency lookup introduced in migration 049 is additive and keeps MDT as Miami-Dade's current authoritative operator. It is designed to allow a later Tri-Rail feed without another lookup redesign.

## Regional rail intentionally deferred

SunRail and Tri-Rail both publish transit data and are relevant to StreetRise's markets, but they are not included in this initial bus-feed expansion. The current Get There result copy says “Bus stop”; adding rail before making that UI mode-neutral would mislabel train stations. Migration 049 and the `county -> agency[]` model are in place so rail can be added cleanly in a follow-up.