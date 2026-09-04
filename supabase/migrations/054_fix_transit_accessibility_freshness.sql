-- ================================================================
-- StreetRise — Migration 054: keep derived transit accessibility current
--
-- Review on PR #105 found a real stale-data path: GTFS-derived
-- `resources.public_transit_accessible = TRUE` could outlive the feed that
-- justified it. The nearest-stop panel already fails closed on an expired
-- `feed_valid_until`, but the stored map/filter flag did not.
--
-- This migration makes the stored flag obey the same rule and changes the
-- proximity threshold from 400 m to exactly 1,609.34 m (1 mile), per product
-- decision. Human-set TRUE values remain protected.
--
-- Why a scheduled refresh is required
-- -------------------------------
-- A row does not receive an UPDATE merely because the calendar crosses a
-- feed's expiration date. A migration-time `feed_valid_until >= CURRENT_DATE`
-- predicate would therefore be correct only on the day the migration ran and
-- could become stale later with no database event to revisit it.
--
-- `pg_cron` runs the same deterministic refresh every five minutes. The
-- refresh updates only rows whose derived answer actually changed, and a
-- resources-only updated_at wrapper lets that automated maintenance avoid
-- manufacturing a human-facing "Updated just now" timestamp.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. Scheduler
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ════════════════════════════════════════════════════════════════
-- 2. Preserve resource freshness semantics during derived refreshes
-- ════════════════════════════════════════════════════════════════
--
-- The original `resources_updated_at` trigger calls the generic
-- `update_updated_at()` function on every UPDATE. That is correct for human
-- edits, but a scheduled GTFS-derived flag correction must not make a resource
-- look newly verified or provider-refreshed.
--
-- Keep the trigger name unchanged because existing migrations deliberately
-- disable/enable it by name. Normal writes behave exactly as before; only the
-- transaction-local StreetRise maintenance flag suppresses the timestamp.

CREATE OR REPLACE FUNCTION public.resources_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('streetrise.skip_resources_updated_at', true) = 'on' THEN
    RETURN NEW;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resources_updated_at ON public.resources;

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.resources_set_updated_at();


-- ════════════════════════════════════════════════════════════════
-- 3. Recompute feed-derived transit flags from CURRENT feeds
-- ════════════════════════════════════════════════════════════════
--
-- Rules:
--   • exact walking/proximity cutoff: 1,609.34 metres (1 mile)
--   • an expired GTFS stop cannot justify a TRUE
--   • a NULL feed_valid_until keeps the legacy "not proven expired" behavior
--   • human TRUE = public_transit_accessible TRUE + source NULL; never touched
--   • feed-derived TRUE rows are lowered when no current qualifying stop exists
--
-- The latitude/longitude box is only an indexed prefilter and is deliberately
-- 20% wider than the requested radius. The haversine expression is the final
-- authority, so the user-facing threshold remains exactly 1,609.34 m.

CREATE OR REPLACE FUNCTION public.refresh_transit_accessibility_flags()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('streetrise.skip_resources_updated_at', 'on', true);

  -- Raise previously-false rows and repair any feed-derived row that should be
  -- true now. Human TRUE rows (TRUE + NULL source) do not satisfy this WHERE.
  WITH eligible AS (
    SELECT r.id
    FROM public.resources r
    WHERE r.lat IS NOT NULL
      AND r.lng IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.transit_stops s
        WHERE (s.feed_valid_until IS NULL OR s.feed_valid_until >= CURRENT_DATE)
          AND s.lat BETWEEN r.lat - ((1.60934 / 111.32) * 1.2)
                        AND r.lat + ((1.60934 / 111.32) * 1.2)
          AND s.lng BETWEEN r.lng - (((1.60934 / 111.32) * 1.2)
                                      / GREATEST(cos(radians(r.lat)), 0.1))
                        AND r.lng + (((1.60934 / 111.32) * 1.2)
                                      / GREATEST(cos(radians(r.lat)), 0.1))
          AND 2 * 6371000 * asin(sqrt(
                sin(radians(s.lat - r.lat) / 2) ^ 2
                + cos(radians(r.lat)) * cos(radians(s.lat))
                  * sin(radians(s.lng - r.lng) / 2) ^ 2
              )) <= 1609.34
      )
  )
  UPDATE public.resources r
  SET public_transit_accessible = TRUE,
      public_transit_accessible_source = 'transit_feed'
  FROM eligible e
  WHERE r.id = e.id
    AND (
      NOT r.public_transit_accessible
      OR r.public_transit_accessible_source = 'transit_feed'
    )
    AND (
      r.public_transit_accessible IS DISTINCT FROM TRUE
      OR r.public_transit_accessible_source IS DISTINCT FROM 'transit_feed'
    );

  -- Lower only rows an earlier GTFS pass raised. A human TRUE carries NULL
  -- source and is therefore ineligible for automated clearing.
  UPDATE public.resources r
  SET public_transit_accessible = FALSE,
      public_transit_accessible_source = NULL
  WHERE r.public_transit_accessible
    AND r.public_transit_accessible_source = 'transit_feed'
    AND r.lat IS NOT NULL
    AND r.lng IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.transit_stops s
      WHERE (s.feed_valid_until IS NULL OR s.feed_valid_until >= CURRENT_DATE)
        AND s.lat BETWEEN r.lat - ((1.60934 / 111.32) * 1.2)
                      AND r.lat + ((1.60934 / 111.32) * 1.2)
        AND s.lng BETWEEN r.lng - (((1.60934 / 111.32) * 1.2)
                                    / GREATEST(cos(radians(r.lat)), 0.1))
                      AND r.lng + (((1.60934 / 111.32) * 1.2)
                                    / GREATEST(cos(radians(r.lat)), 0.1))
        AND 2 * 6371000 * asin(sqrt(
              sin(radians(s.lat - r.lat) / 2) ^ 2
              + cos(radians(r.lat)) * cos(radians(s.lat))
                * sin(radians(s.lng - r.lng) / 2) ^ 2
            )) <= 1609.34
    );

  PERFORM set_config('streetrise.skip_resources_updated_at', 'off', true);
END;
$$;

-- This function performs privileged maintenance and must not become an anon
-- write path merely because PostgREST exposes functions in the public schema.
REVOKE ALL ON FUNCTION public.refresh_transit_accessibility_flags()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_transit_accessibility_flags()
  TO service_role;


-- ════════════════════════════════════════════════════════════════
-- 4. Apply the same rule when a resource is inserted or MOVES
-- ════════════════════════════════════════════════════════════════
--
-- Migration 042 installed these triggers already; replacing the function body
-- changes their behavior without dropping the triggers. This closes the same
-- expiry/radius bug for newly created listings and corrected geocodes.

CREATE OR REPLACE FUNCTION public.resources_refresh_transit_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  near_stop BOOLEAN;
BEGIN
  -- Human TRUE is authoritative and is never replaced by an automated pass.
  IF NEW.public_transit_accessible
     AND NEW.public_transit_accessible_source IS NULL
     AND (
       TG_OP = 'INSERT'
       OR (
         OLD.public_transit_accessible
         AND OLD.public_transit_accessible_source IS NULL
       )
     ) THEN
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
    FROM public.transit_stops s
    WHERE (s.feed_valid_until IS NULL OR s.feed_valid_until >= CURRENT_DATE)
      AND s.lat BETWEEN NEW.lat - ((1.60934 / 111.32) * 1.2)
                    AND NEW.lat + ((1.60934 / 111.32) * 1.2)
      AND s.lng BETWEEN NEW.lng - (((1.60934 / 111.32) * 1.2)
                                    / GREATEST(cos(radians(NEW.lat)), 0.1))
                    AND NEW.lng + (((1.60934 / 111.32) * 1.2)
                                    / GREATEST(cos(radians(NEW.lat)), 0.1))
      AND 2 * 6371000 * asin(sqrt(
            sin(radians(s.lat - NEW.lat) / 2) ^ 2
            + cos(radians(NEW.lat)) * cos(radians(s.lat))
              * sin(radians(s.lng - NEW.lng) / 2) ^ 2
          )) <= 1609.34
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


-- ════════════════════════════════════════════════════════════════
-- 5. Converge immediately, then keep the date-dependent answer current
-- ════════════════════════════════════════════════════════════════

SELECT public.refresh_transit_accessibility_flags();

-- Idempotent job replacement makes rebuilds and branch replays predictable.
DO $$
DECLARE
  existing_job BIGINT;
BEGIN
  SELECT jobid
  INTO existing_job
  FROM cron.job
  WHERE jobname = 'streetrise-refresh-transit-accessibility'
  ORDER BY jobid DESC
  LIMIT 1;

  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;
END;
$$;

SELECT cron.schedule(
  'streetrise-refresh-transit-accessibility',
  '*/5 * * * *',
  'SELECT public.refresh_transit_accessibility_flags();'
);


-- ════════════════════════════════════════════════════════════════
-- VERIFY after apply
-- ════════════════════════════════════════════════════════════════
--
-- 1. No feed-derived TRUE may lack a currently-valid stop within one mile.
-- 2. Human TRUE rows remain source NULL.
-- 3. cron.job contains exactly one enabled job named
--    streetrise-refresh-transit-accessibility.
-- 4. Editing/moving a resource still fires resources_updated_at normally;
--    only refresh_transit_accessibility_flags() suppresses that timestamp.
