-- ================================================================
-- StreetRise — Migration 042: Transit stops and routes (DDL only)
--
-- NOT APPLIED. Runbook: docs/apply-migrations-042-046.md
--
-- Schema for static GTFS data, so a listing can answer "can I get here
-- on the bus, and does one actually stop near enough to walk?".
--
-- This migration is DDL only; migration 043 loads HART's feed into it.
-- They are split because the shapes are different: this file is small,
-- reviewable, and runs once, while 043 is ~2,200 generated rows that get
-- re-run every time an agency publishes a new feed (HART does so on
-- service-change dates, roughly quarterly).
--
-- ── Why store this at all ────────────────────────────────────
-- `resources.public_transit_accessible` is a hand-set boolean that nobody
-- fills in. On live today all 21 Hillsborough listings say FALSE, including
-- one that is 17 metres from a bus stop. The map renders that as a "Near
-- transit" facet, so the filter is actively wrong rather than merely empty.
-- Stop coordinates are a fact we can check, so this replaces a guess with a
-- measurement.
--
-- It also lets the app say the far more useful negative: the four parks and
-- campgrounds in the same set are 7 to 11 MILES from the nearest stop. For
-- someone without a car that is the single most important thing on the page,
-- and nothing in the schema could express it before.
--
-- ── Why not PostGIS ─────────────────────────────────────────
-- The app queries a small lat/lng bounding box around one resource and
-- computes exact great-circle distance in the browser with the `geo.ts`
-- helpers it already uses for the map. That needs a plain btree index on
-- (lat, lng) and nothing else. Enabling PostGIS for a nearest-neighbour
-- query over 2,245 rows would be a new extension, a new dependency in the
-- app's mental model, and a second distance implementation that could
-- disagree with the one the map already ships.
--
-- ── Why an agency column ────────────────────────────────────
-- This feed is HART, which is Hillsborough only. PSTA (Pinellas), LYNX
-- (Orlando) and Miami-Dade Transit are separate agencies with separate
-- feeds. `agency` plus a prefixed primary key means adding one later is a
-- second import, not a migration — and means a Pinellas stop can never
-- silently overwrite a HART stop that happens to share a stop_id, which
-- they very much do (both agencies number stops from 1).
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. transit_routes
-- ════════════════════════════════════════════════════════════════
-- 33 rows for HART. Small enough to be worth keeping so the UI can say
-- "Route 6 — 56th Street" instead of "6", and — the reason this table
-- exists at all — so it can say which routes are FREE. HART's own
-- fare_attributes.txt prices route 800 (the TECO Line Streetcar) and the
-- airport SkyConnect at $0.00. Free transport through downtown, Channelside
-- and Ybor is materially useful to the people StreetRise serves, and it is
-- not currently mentioned anywhere in the app.

CREATE TABLE transit_routes (
  -- '<agency>:<route_id>' — see the agency note in the header.
  id                TEXT PRIMARY KEY,
  agency            TEXT NOT NULL,
  route_id          TEXT NOT NULL,
  short_name        TEXT,
  long_name         TEXT,
  -- GTFS route_type: 0 tram/streetcar, 3 bus. Kept raw rather than mapped
  -- to an enum — this is a published external vocabulary, not ours.
  route_type        SMALLINT,
  color             TEXT,
  -- From fare_attributes.txt via fare_rules.txt. NULL means the feed
  -- published no fare for this route, which is NOT the same as free —
  -- `is_fare_free` is only ever set from an explicit 0.00.
  fare_price        NUMERIC(6,2),
  fare_currency     TEXT,
  is_fare_free      BOOLEAN NOT NULL DEFAULT FALSE,
  feed_version      TEXT,
  feed_valid_until  DATE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (agency, route_id)
);


-- ════════════════════════════════════════════════════════════════
-- 2. transit_stops
-- ════════════════════════════════════════════════════════════════
-- One row per stop that has service under the CURRENTLY ACTIVE calendar.
-- Stops belonging to an expired service period are not loaded: a stop that
-- was served until August but is not served now must not make a listing
-- look reachable today.

CREATE TABLE transit_stops (
  -- '<agency>:<stop_id>'.
  id                TEXT PRIMARY KEY,
  agency            TEXT NOT NULL,
  stop_id           TEXT NOT NULL,
  stop_code         TEXT,
  stop_name         TEXT NOT NULL,
  lat               DOUBLE PRECISION NOT NULL,
  lng               DOUBLE PRECISION NOT NULL,

  -- Public-facing route labels ("6", "12"), not route_ids. Denormalised on
  -- purpose: it is what the UI renders, it is at most a handful of short
  -- strings, and it saves a join on the hot path.
  route_short_names TEXT[] NOT NULL DEFAULT '{}',
  route_ids         TEXT[] NOT NULL DEFAULT '{}',

  -- Day-type coverage under the active calendar. "No Sunday service" is
  -- decision-relevant on its own: several listings here are weekday-only,
  -- and a Sunday meal service you cannot reach on a Sunday is a wasted trip.
  serves_weekday    BOOLEAN NOT NULL DEFAULT FALSE,
  serves_saturday   BOOLEAN NOT NULL DEFAULT FALSE,
  serves_sunday     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Widest weekday departure window at this stop, as local 'HH:MM' in the
  -- agency's timezone. TEXT rather than TIME because GTFS legitimately
  -- publishes times past 24:00:00 for trips that run after midnight, and
  -- normalising those into a TIME would silently move a 00:30 departure to
  -- the wrong end of the day.
  weekday_first     TEXT,
  weekday_last      TEXT,

  -- From feed_info.txt. The app STOPS asserting anything from a stop whose
  -- feed has expired rather than quietly serving last quarter's network —
  -- same reasoning as the map's "Open right now" filter failing closed.
  feed_version      TEXT,
  feed_valid_until  DATE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (agency, stop_id)
);

-- The app's only access pattern: a small bounding box around one resource.
CREATE INDEX idx_transit_stops_lat_lng ON transit_stops (lat, lng);
CREATE INDEX idx_transit_stops_agency  ON transit_stops (agency);

CREATE TRIGGER transit_stops_updated_at
  BEFORE UPDATE ON transit_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transit_routes_updated_at
  BEFORE UPDATE ON transit_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════════════════════════════
-- 3. RLS
-- ════════════════════════════════════════════════════════════════
-- Public read, admin write — the same shape as `faq` and `blog_posts`.
-- This is published open data from a public transit agency; there is
-- nothing here to withhold, and the anon role has to read it because the
-- Get There panel renders for visitors who never sign in.
--
-- Writes are admin-only. The importer runs with the service-role key,
-- which bypasses RLS, so it is unaffected by this.

ALTER TABLE transit_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_stops  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transit_routes_public_read"
  ON transit_routes FOR SELECT
  USING (TRUE);

CREATE POLICY "transit_routes_admin_all"
  ON transit_routes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "transit_stops_public_read"
  ON transit_stops FOR SELECT
  USING (TRUE);

CREATE POLICY "transit_stops_admin_all"
  ON transit_stops FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
