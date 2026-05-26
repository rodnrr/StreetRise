-- ============================================================
-- Migration 012: Stable external IDs + provider consolidation + deduplication
-- ============================================================
-- What this migration does (in order):
--   1. Assigns human-readable external_ids to every provider using the
--      same slug format as the seed CSV (e.g. ACTS-001, CSTB-001)
--   2. Merges the duplicate "First Contact / 211 Tampa Bay Cares" provider
--      into canonical "First Contact" (FCONT-001), fixing a category
--      mis-tagging along the way; removes the empty test provider
--   3. Deduplicates resources BEFORE assigning external_ids so the
--      existing unique index on resources.external_id is never violated:
--        a. Drops the "Permanent Supportive Housing (other)" mis-tag
--        b. Keeps MIN(id) per (name, category, provider_id) group
--   4. Derives a stable external_id for every resource:
--        {PROVIDER_EXTERNAL_ID}-{name-slug}-{category}
--      Future imports use ON CONFLICT(external_id) DO UPDATE instead
--      of inserting blindly.
--   5. Notes: idx_providers_external_id and idx_resources_external_id
--      (both UNIQUE) already exist — no new DDL needed.
--
-- Safe to re-run: provider updates are guarded by external_id IS NULL.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Provider external_ids (matches seed CSV Provider ID column)
-- ─────────────────────────────────────────────────────────────

UPDATE providers SET external_id = 'ACTS-001'        WHERE organization_name = 'ACTS' AND external_id IS NULL;
UPDATE providers SET external_id = 'CASA-001'         WHERE organization_name = 'CASA Pinellas' AND external_id IS NULL;
UPDATE providers SET external_id = 'CCTH-001'         WHERE organization_name = 'Catholic Charities Tampa Hope' AND external_id IS NULL;
UPDATE providers SET external_id = 'COVE-001'         WHERE organization_name = 'Cove Community Housing Solutions Center' AND external_id IS NULL;
UPDATE providers SET external_id = 'CSP-001'          WHERE organization_name = 'CareerSource Polk' AND external_id IS NULL;
UPDATE providers SET external_id = 'CSTB-001'         WHERE organization_name = 'CareerSource Tampa Bay' AND external_id IS NULL;
UPDATE providers SET external_id = 'FEAST-001'        WHERE organization_name = 'FEAST Food Pantry' AND external_id IS NULL;
UPDATE providers SET external_id = 'FCONT-001'        WHERE organization_name = 'First Contact' AND external_id IS NULL;
UPDATE providers SET external_id = 'FEEDSTP-001'      WHERE organization_name = 'Feed St. Pete' AND external_id IS NULL;
UPDATE providers SET external_id = 'FSP-001'          WHERE organization_name = 'Florida State Parks – Tampa Bay' AND external_id IS NULL;
UPDATE providers SET external_id = 'FTB-001'          WHERE organization_name = 'Feeding Tampa Bay' AND external_id IS NULL;
UPDATE providers SET external_id = 'FTB-PIN-001'      WHERE organization_name = 'Feeding Tampa Bay - Pinellas County' AND external_id IS NULL;
UPDATE providers SET external_id = 'HEP-001'          WHERE organization_name = 'HEP' AND external_id IS NULL;
UPDATE providers SET external_id = 'HERN-PARKS-001'   WHERE organization_name = 'Hernando County Parks & Recreation' AND external_id IS NULL;
UPDATE providers SET external_id = 'HILLS-PARKS-001'  WHERE organization_name = 'Hillsborough County Parks & Recreation' AND external_id IS NULL;
UPDATE providers SET external_id = 'HVA-001'          WHERE organization_name = 'Hope Villages of America' AND external_id IS NULL;
UPDATE providers SET external_id = 'JWB-001'          WHERE organization_name = 'JWB Children''s Services Council of Pinellas' AND external_id IS NULL;
UPDATE providers SET external_id = 'MATTIE-001'       WHERE organization_name = 'Mattie Williams Neighborhood Family Center' AND external_id IS NULL;
UPDATE providers SET external_id = 'METMIN-001'       WHERE organization_name = 'Metropolitan Ministries' AND external_id IS NULL;
UPDATE providers SET external_id = 'MM-001'           WHERE organization_name = 'Mary & Martha House' AND external_id IS NULL;
UPDATE providers SET external_id = 'PASCO-PARKS-001'  WHERE organization_name ILIKE 'Pasco County Parks%Natural Resources' AND external_id IS NULL;
UPDATE providers SET external_id = 'PHOPE-001'        WHERE organization_name = 'Pinellas Hope (Catholic Charities)' AND external_id IS NULL;
UPDATE providers SET external_id = 'PIN-PARKS-001'    WHERE organization_name = 'Pinellas County Parks & Conservation Resources' AND external_id IS NULL;
UPDATE providers SET external_id = 'PSH-001'          WHERE organization_name = 'Pinellas Safe Harbor' AND external_id IS NULL;
UPDATE providers SET external_id = 'RCS-001'          WHERE organization_name = 'RCS Pinellas' AND external_id IS NULL;
-- Two Salvation Army corps — different cities, kept as separate providers
UPDATE providers SET external_id = 'SALV-STPETE-001'  WHERE organization_name = 'Salvation Army St. Petersburg' AND external_id IS NULL;
UPDATE providers SET external_id = 'SALV-TAMPA-001'   WHERE organization_name = 'Salvation Army Tampa' AND external_id IS NULL;
UPDATE providers SET external_id = 'SR-ADMIN-001'     WHERE organization_name = 'StreetRise Admin' AND external_id IS NULL;
UPDATE providers SET external_id = 'SR-OFFICIAL-001'  WHERE organization_name = 'StreetRise Official' AND external_id IS NULL;
UPDATE providers SET external_id = 'SVDP-001'         WHERE organization_name = 'St. Vincent de Paul CARES (Pinellas)' AND external_id IS NULL;
UPDATE providers SET external_id = 'TALBOT-001'       WHERE organization_name = 'Talbot House' AND external_id IS NULL;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Merge duplicate provider + remove test provider
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  fcont_211_id uuid := '078764d7-f68e-d7c3-cc82-4574cb29b078';
  fcont_id     uuid;
BEGIN
  SELECT id INTO fcont_id FROM providers WHERE external_id = 'FCONT-001';

  -- Fix category mis-tagging before the move: hotline/nav resources were
  -- imported as category=shelter under the 211 duplicate
  UPDATE resources
  SET category = 'other'
  WHERE provider_id = fcont_211_id
    AND name IN ('Homeless Helpline', 'Pinellas Rapid Re-Housing Collaborative')
    AND category = 'shelter';

  -- Move non-duplicate resources to the canonical FCONT-001 provider
  UPDATE resources r
  SET provider_id = fcont_id
  WHERE r.provider_id = fcont_211_id
    AND NOT EXISTS (
      SELECT 1 FROM resources r2
      WHERE r2.provider_id = fcont_id
        AND r2.name     = r.name
        AND r2.category = r.category
    );

  -- Delete any resources still under the duplicate provider (true dupes)
  DELETE FROM resources WHERE provider_id = fcont_211_id;

  -- Remove the now-empty duplicate provider row
  DELETE FROM providers WHERE id = fcont_211_id;
END $$;

-- Remove the empty test/placeholder provider (guard: only if no resources)
DELETE FROM providers
WHERE organization_name = 'fudged  '
  AND NOT EXISTS (SELECT 1 FROM resources WHERE provider_id = providers.id);

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Deduplicate resources FIRST (before assigning external_ids)
--         This avoids violating the existing unique index on external_id
-- ─────────────────────────────────────────────────────────────

-- 3a. "Permanent Supportive Housing" exists as both category=shelter and
--     category=other under Pinellas Hope. Shelter is correct; drop other.
DELETE FROM resources
WHERE name = 'Permanent Supportive Housing'
  AND category = 'other'
  AND provider_id = (SELECT id FROM providers WHERE external_id = 'PHOPE-001');

-- 3b. For every (name, category, provider_id) group with more than one row,
--     keep the row with the smallest UUID; delete the rest.
DELETE FROM resources
WHERE id NOT IN (
  SELECT MIN(id)
  FROM resources
  GROUP BY name, category, provider_id
);

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Assign external_ids to resources (now safe — no dupes remain)
-- Pattern: {PROVIDER_EXTERNAL_ID}-{name-slug}-{category}
-- Slug: non-alphanumeric stripped, spaces collapsed to hyphens, lowercased
-- ─────────────────────────────────────────────────────────────

UPDATE resources r
SET external_id =
  p.external_id
  || '-'
  || lower(regexp_replace(regexp_replace(r.name, '[^a-zA-Z0-9 ]', '', 'g'), '\s+', '-', 'g'))
  || '-'
  || r.category::text
FROM providers p
WHERE r.provider_id = p.id
  AND p.external_id IS NOT NULL
  AND r.external_id IS NULL;

-- Note: idx_providers_external_id and idx_resources_external_id (both UNIQUE)
-- already exist from a prior migration — no new DDL needed.

COMMIT;
