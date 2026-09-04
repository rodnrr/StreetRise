-- ================================================================
-- StreetRise — Migration 049: multi-agency nearest-transit lookup
--
-- PR #100 initially modelled one authoritative transit agency per county.
-- That is sufficient for HART/Hillsborough and GoPasco/Pasco, but not for
-- markets where multiple public systems overlap (for example local bus plus
-- regional rail). Keep the original nearest_transit_stop() RPC intact for
-- backwards compatibility and add an array-aware RPC for the expanded client.
--
-- The stale-feed ordering is intentional. If one operator's feed has expired
-- while another operator covering the same county still has a current feed,
-- the current operator must win even when an old/stale stop is geographically
-- closer. If every candidate is stale, the nearest stale row is returned so
-- the client can keep its existing fail-closed `stale_feed` behavior.
-- ================================================================

CREATE OR REPLACE FUNCTION nearest_transit_stop_multi(
  in_lat       DOUBLE PRECISION,
  in_lng       DOUBLE PRECISION,
  in_radius_km DOUBLE PRECISION DEFAULT 40,
  in_agencies  TEXT[] DEFAULT NULL
)
RETURNS SETOF transit_stops
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH b AS (
    SELECT (in_radius_km / 111.32) * 1.2 AS lat_deg,
           ((in_radius_km / 111.32) * 1.2)
             / GREATEST(cos(radians(in_lat)), 0.1) AS lng_deg
  )
  SELECT s.*
  FROM transit_stops s, b
  WHERE s.lat BETWEEN in_lat - b.lat_deg AND in_lat + b.lat_deg
    AND s.lng BETWEEN in_lng - b.lng_deg AND in_lng + b.lng_deg
    AND (in_agencies IS NULL OR s.agency = ANY(in_agencies))
  ORDER BY
    CASE
      WHEN s.feed_valid_until IS NOT NULL AND s.feed_valid_until < CURRENT_DATE THEN 1
      ELSE 0
    END,
    2 * 6371 * asin(sqrt(
      sin(radians(s.lat - in_lat) / 2) ^ 2
      + cos(radians(in_lat)) * cos(radians(s.lat))
        * sin(radians(s.lng - in_lng) / 2) ^ 2
    ))
  LIMIT 1;
$$;

COMMENT ON FUNCTION nearest_transit_stop_multi(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]
) IS
  'Returns the nearest stop across an optional set of transit agencies, preferring current feeds over expired feeds. SECURITY INVOKER; public transit RLS still applies.';

GRANT EXECUTE ON FUNCTION nearest_transit_stop_multi(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]
) TO anon, authenticated;
