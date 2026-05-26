-- ================================================================
-- StreetRise — Migration 010: Provider & Resource Trust System
-- Adds confidence scoring, staleness tracking, and provider
-- identity/re-verification lifecycle fields.
--
-- Rollback (in order):
--   DROP TRIGGER resources_confidence_score ON resources;
--   DROP FUNCTION compute_confidence_score();
--   ALTER TABLE resources DROP COLUMN IF EXISTS confidence_score,
--     DROP COLUMN IF EXISTS stale_after_days,
--     DROP COLUMN IF EXISTS last_provider_update_at,
--     DROP COLUMN IF EXISTS verification_notes;
--   ALTER TABLE providers DROP COLUMN IF EXISTS identity_confirmed,
--     DROP COLUMN IF EXISTS re_verification_due_at,
--     DROP COLUMN IF EXISTS suspension_reason,
--     DROP COLUMN IF EXISTS verification_notes,
--     DROP COLUMN IF EXISTS suspended_at;
-- ================================================================

-- ── resources: trust and freshness fields ────────────────────────

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS confidence_score        SMALLINT NOT NULL DEFAULT 50
    CHECK (confidence_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS stale_after_days        SMALLINT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS last_provider_update_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes      TEXT;

-- Note: last_verified_at was already added in migration 009; not duplicated here.

-- ── providers: identity and lifecycle fields ─────────────────────

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS identity_confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS re_verification_due_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason        TEXT,
  ADD COLUMN IF NOT EXISTS verification_notes       TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at             TIMESTAMPTZ;

-- ── Confidence score auto-compute function ───────────────────────
-- Points breakdown (max 100, capped with LEAST):
--   10  is_active = true
--   10  description length > 30 chars
--   10  phone present
--    5  website present
--   10  hours_of_operation is non-empty JSON
--   25  verification_status = 'verified'
--    5  verification_status = 'pending'
--   20  last update within stale_after_days
--   10  last update within 2× stale_after_days (not within 1×)
--   10  is_map_ready with valid lat/lng

CREATE OR REPLACE FUNCTION compute_confidence_score()
RETURNS TRIGGER AS $$
DECLARE
  score    INTEGER := 0;
  ref_time TIMESTAMPTZ;
BEGIN
  IF NEW.is_active THEN score := score + 10; END IF;

  IF NEW.description IS NOT NULL AND length(NEW.description) > 30 THEN
    score := score + 10;
  END IF;

  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN score := score + 10; END IF;
  IF NEW.website IS NOT NULL AND NEW.website <> '' THEN score := score + 5; END IF;

  IF NEW.hours_of_operation IS NOT NULL AND NEW.hours_of_operation::text NOT IN ('{}', 'null') THEN
    score := score + 10;
  END IF;

  IF NEW.verification_status = 'verified' THEN
    score := score + 25;
  ELSIF NEW.verification_status = 'pending' THEN
    score := score + 5;
  END IF;

  ref_time := COALESCE(NEW.last_provider_update_at, NEW.updated_at);
  IF ref_time IS NOT NULL THEN
    IF NOW() - ref_time <= (NEW.stale_after_days || ' days')::INTERVAL THEN
      score := score + 20;
    ELSIF NOW() - ref_time <= (NEW.stale_after_days * 2 || ' days')::INTERVAL THEN
      score := score + 10;
    END IF;
  END IF;

  IF NEW.is_map_ready AND NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    score := score + 10;
  END IF;

  NEW.confidence_score := LEAST(score::SMALLINT, 100::SMALLINT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resources_confidence_score ON resources;
CREATE TRIGGER resources_confidence_score
  BEFORE INSERT OR UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION compute_confidence_score();

-- ── Indexes ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resources_confidence_score
  ON resources(confidence_score);

CREATE INDEX IF NOT EXISTS idx_resources_last_provider_update_at
  ON resources(last_provider_update_at);

-- ── Initialize scores on existing rows ───────────────────────────
-- Touch updated_at to fire the trigger and recompute scores.
-- Uses a safe no-op UPDATE that changes nothing but fires BEFORE UPDATE.
UPDATE resources SET stale_after_days = stale_after_days;
