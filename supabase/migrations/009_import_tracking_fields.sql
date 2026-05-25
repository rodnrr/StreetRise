-- ================================================================
-- StreetRise — Migration 009: Import Tracking Fields
-- Adds stable external_id columns + import provenance fields so
-- the batch-import script can safely upsert without duplicating rows.
-- ================================================================

-- ── providers ────────────────────────────────────────────────────

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS external_id      TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id  TEXT,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ;

-- unique constraint via partial index so NULL rows don't conflict
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_external_id
  ON providers(external_id) WHERE external_id IS NOT NULL;

-- ── resources ────────────────────────────────────────────────────

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS external_id       TEXT,
  ADD COLUMN IF NOT EXISTS source_file       TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id   TEXT,
  ADD COLUMN IF NOT EXISTS last_imported_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geocode_quality   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_external_id
  ON resources(external_id) WHERE external_id IS NOT NULL;

-- ── notes ────────────────────────────────────────────────────────
-- normalized_category / preferred_category is intentionally NOT
-- added here.  The CSV preferred vocabulary uses values outside the
-- resource_category enum (e.g. 'housing_assistance', 'employment').
-- Until a proper enum migration is designed and reviewed, preferred
-- category is stored in the resources.tags array as
-- "category:<preferred_value>" by the import script.
