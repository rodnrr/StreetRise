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
-- The nearest-stop lookup is a single `ORDER BY <haversine> LIMIT 1` inside
-- the `nearest_transit_stop()` function below, narrowed first by a bounding
-- box that the btree index on (lat, lng) can serve. For a few thousand rows
-- per agency that is fast and exact. Enabling PostGIS would be a new
-- extension and a new dependency in the app's mental model to buy an index
-- this workload does not need.
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
  -- Identifies the RUN that produced this row, and is what the loader's
  -- cleanup DELETE matches on. Deliberately separate from `feed_version`:
  -- that is the publisher's string, and it does not always move when the
  -- emitted network does. HART's 2608.1 bundle carries two service periods,
  -- so regenerating it for the later one keeps the same published version
  -- while emitting a different set of stops — leaving anything dropped from
  -- the network behind, still claiming service (caught in review on PR #100).
  -- An agency republishing a corrected bundle under an unchanged version has
  -- the same effect. The fingerprint is computed from the rows actually
  -- emitted, so it moves whenever membership does.
  feed_fingerprint  TEXT,

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
  -- Identifies the RUN that produced this row, and is what the loader's
  -- cleanup DELETE matches on. Deliberately separate from `feed_version`:
  -- that is the publisher's string, and it does not always move when the
  -- emitted network does. HART's 2608.1 bundle carries two service periods,
  -- so regenerating it for the later one keeps the same published version
  -- while emitting a different set of stops — leaving anything dropped from
  -- the network behind, still claiming service (caught in review on PR #100).
  -- An agency republishing a corrected bundle under an unchanged version has
  -- the same effect. The fingerprint is computed from the rows actually
  -- emitted, so it moves whenever membership does.
  feed_fingerprint  TEXT,

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
-- 3. nearest_transit_stop()
-- ════════════════════════════════════════════════════════════════
-- Nearest-neighbour lookup, server-side.
--
-- This deliberately does NOT follow the map's "fetch the set once, filter in
-- the browser" pattern, and the difference matters. That pattern exists so
-- every facet can show the number of results it would return; it works
-- because the public resource set is a few hundred rows. Nearest-neighbour
-- is a different shape of question over a much larger table: Miami-Dade
-- alone is 6,973 stops, and a 40 km bounding box around downtown contains
-- 6,964 of them. Shipping those to a phone to pick one is absurd, and
-- capping the fetch instead — as an earlier revision of this did with an
-- unordered `LIMIT 500` — silently discards 92% of the candidates before
-- the nearest is chosen, which can report a farther stop, miss a walkable
-- one, or wrongly claim no coverage (caught in review on PR #100).
--
-- Ordering has to happen where all the candidates are. The bounding box
-- narrows the scan using the btree index; the haversine then orders only
-- what survives, and LIMIT 1 returns a single row.
--
-- The app still measures the distance it DISPLAYS with `geo.ts`, the same
-- helper the map uses, so there remains exactly one distance implementation
-- that a user-visible number can come from. The copy of the formula here
-- only ever decides ordering.
--
-- SECURITY INVOKER (the default, stated explicitly because it is load
-- bearing) means RLS still applies to the caller — this function is a
-- convenience, not a way around the policies below. `search_path` is pinned,
-- per the hardening advice `get_advisors` gives for every other function in
-- this schema.

CREATE FUNCTION nearest_transit_stop(
  in_lat       DOUBLE PRECISION,
  in_lng       DOUBLE PRECISION,
  in_radius_km DOUBLE PRECISION DEFAULT 40,
  in_agency    TEXT DEFAULT NULL
)
RETURNS SETOF transit_stops
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH b AS (
    -- Latitude degrees are ~111.32 km everywhere; longitude degrees shrink
    -- towards the poles, hence the 1/cos(lat) widening. Both axes carry a
    -- 20% margin so the box can never clip a stop the ORDER BY would have
    -- ranked first. GREATEST() guards the polar singularity.
    SELECT (in_radius_km / 111.32) * 1.2 AS lat_deg,
           ((in_radius_km / 111.32) * 1.2)
             / GREATEST(cos(radians(in_lat)), 0.1) AS lng_deg
  )
  SELECT s.*
  FROM transit_stops s, b
  WHERE s.lat BETWEEN in_lat - b.lat_deg AND in_lat + b.lat_deg
    AND s.lng BETWEEN in_lng - b.lng_deg AND in_lng + b.lng_deg
    AND (in_agency IS NULL OR s.agency = in_agency)
  ORDER BY 2 * 6371 * asin(sqrt(
             sin(radians(s.lat - in_lat) / 2) ^ 2
             + cos(radians(in_lat)) * cos(radians(s.lat))
               * sin(radians(s.lng - in_lng) / 2) ^ 2
           ))
  LIMIT 1;
$$;

-- `in_agency` scopes the search to one operator, and the app passes it
-- whenever the listing's county resolves to a loaded feed. Agencies overlap at
-- county lines: HART and GoPasco publish stops 2 and 3 METRES apart at the
-- Wiregrass park-and-ride and AdventHealth Wesley Chapel. Without scoping, a
-- Pasco address can be answered with the marginally-closer HART row — which
-- names the wrong operator today, and after HART's feed expires (2027-01-02,
-- against GoPasco's 2031-12-13) makes the whole panel go silent on an
-- expired-feed check while a perfectly valid GoPasco stop sits three metres
-- away. Caught in review on PR #100.
--
-- NULL means "any agency", which is what the app passes when it could not
-- resolve the city to a county. A stop that is genuinely walkable is positive
-- evidence whoever runs it, so that case stays unscoped.
--
-- The Get There panel renders for visitors who never sign in, so anon needs
-- to call this. RLS still gates which rows come back.
GRANT EXECUTE ON FUNCTION nearest_transit_stop(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT)
  TO anon, authenticated;


-- ════════════════════════════════════════════════════════════════
-- 4. Provenance for the derived transit flag
-- ════════════════════════════════════════════════════════════════
-- `resources.public_transit_accessible` has two kinds of TRUE in it, and
-- until now nothing could tell them apart:
--
--   • a HUMAN said so — 19 of the 29 rows true on live were hand-set by
--     migration 032, and a provider who knows there is a stop outside their
--     door that no published feed lists is the most valuable kind of TRUE
--     this column can hold;
--   • a FEED said so — what the backfill in 043–046 writes.
--
-- The distinction matters because of a real staleness path (caught in review
-- on PR #100): the seed migrations only ever RAISE the flag, so when a later
-- GTFS refresh withdraws the only stop near a listing, the generated DELETE
-- removes the stop while the flag stays TRUE forever, and the map's "Near
-- transit" facet and badge go on asserting access that no longer exists.
--
-- The obvious repair — reset the flag and recompute — is not safe. Run
-- against live today it would clear exactly one row: Branches North Dade,
-- which sits 400.2 m from its nearest stop. That is a hand-set flag two
-- metres past an arbitrary threshold, and almost certainly right. Recomputing
-- would quietly replace somebody's knowledge with our inference.
--
-- This column is what makes lowering safe: the backfill stamps the rows it
-- raises, and only those rows are ever eligible to be lowered again. A NULL
-- source is a human's TRUE and is never touched.

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS public_transit_accessible_source TEXT;

COMMENT ON COLUMN resources.public_transit_accessible_source IS
  'Where public_transit_accessible came from. ''transit_feed'' means a GTFS '
  'proximity backfill set it and a later refresh may unset it. NULL means a '
  'human set it and no automated pass may overwrite it.';


-- ════════════════════════════════════════════════════════════════
-- 5. Keep the derived flag true when a listing MOVES
-- ════════════════════════════════════════════════════════════════
-- The loader re-derives `public_transit_accessible` whenever the FEED
-- changes. The other half of the problem is the listing changing: both
-- `AdminResourceEdit` and `ProviderListingEdit` write `lat`/`lng`, so an admin
-- correcting a geocode moves a listing out from under a flag that was derived
-- for its old position — and nothing would revisit it until the next GTFS
-- migration, which could be a quarter away (caught in review on PR #100).
--
-- Recomputing rather than clearing, because a corrected address is just as
-- likely to be NEAR a stop as far from one, and clearing would drop the
-- listing out of the map's "Near transit" filter until the next refresh.
--
-- The human-set rule from section 4 still holds absolutely: a TRUE with a NULL
-- source is somebody's knowledge and this returns early rather than touch it.
-- A FALSE that nothing has evaluated (also NULL source) CAN be raised, which
-- is the same thing the loader's backfill does.
--
-- `SECURITY INVOKER` (the plpgsql default, left alone deliberately) means the
-- read of `transit_stops` happens as whoever is editing. That is fine and
-- intended — the table is public-read — and it keeps this from becoming a
-- privilege escalation path the way a DEFINER function could.
--
-- Scoped by `UPDATE OF lat, lng` plus a WHEN clause, so an ordinary edit that
-- does not move the listing costs nothing, and the loader's own backfill —
-- which updates the flag but never the coordinates — cannot re-enter it.

CREATE FUNCTION resources_refresh_transit_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  near_stop BOOLEAN;
BEGIN
  -- A human's TRUE is never revised by anything automated.
  IF OLD.public_transit_accessible AND OLD.public_transit_accessible_source IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    IF NEW.public_transit_accessible_source = 'transit_feed' THEN
      NEW.public_transit_accessible := FALSE;
      NEW.public_transit_accessible_source := NULL;
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM transit_stops s
    WHERE s.lat BETWEEN NEW.lat - 0.005 AND NEW.lat + 0.005
      AND s.lng BETWEEN NEW.lng - 0.006 AND NEW.lng + 0.006
      AND 2 * 6371000 * asin(sqrt(
            sin(radians(s.lat - NEW.lat) / 2) ^ 2
            + cos(radians(NEW.lat)) * cos(radians(s.lat))
              * sin(radians(s.lng - NEW.lng) / 2) ^ 2
          )) <= 400
  ) INTO near_stop;

  IF near_stop THEN
    NEW.public_transit_accessible := TRUE;
    NEW.public_transit_accessible_source := 'transit_feed';
  ELSIF NEW.public_transit_accessible_source = 'transit_feed' THEN
    NEW.public_transit_accessible := FALSE;
    NEW.public_transit_accessible_source := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER resources_transit_flag_on_move
  BEFORE UPDATE OF lat, lng ON resources
  FOR EACH ROW
  WHEN (NEW.lat IS DISTINCT FROM OLD.lat OR NEW.lng IS DISTINCT FROM OLD.lng)
  EXECUTE FUNCTION resources_refresh_transit_flag();


-- ════════════════════════════════════════════════════════════════
-- 6. RLS
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
