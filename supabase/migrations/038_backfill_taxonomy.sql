-- ================================================================
-- StreetRise — Migration 038: Backfill taxonomy & facility flags
--
-- Repo-completeness re-add. This backfill was applied to LIVE on
-- 2026-05-25 (supabase_migrations version 20260525134735, name
-- "012_backfill_taxonomy") but its file was never merged into the
-- repo — it lived only on a since-deleted session branch. The SQL
-- below is reproduced verbatim from the statement recorded in the
-- live migration history, so the repo can rebuild the same state.
--
-- Steps 1-6 are idempotent and guarded — each only fills unset rows,
-- so re-running them changes nothing. Numbered 038 (next free) rather
-- than the original 012 because 012 is a renumber-gap on this repo.
--
-- Step 7 is NOT a no-op on an already-populated database. It is
-- `UPDATE resources SET stale_after_days = stale_after_days` with no
-- WHERE clause — a blanket touch of every row, present in the original
-- live statement to re-fire the confidence trigger for rows steps 1-6
-- changed. It fires `resources_updated_at` (migration 001) on EVERY
-- row, unconditionally stamping `updated_at = now()` table-wide.
-- `getTrustInfo()` reads `updated_at` for "Updated Xd ago" and stale
-- warnings, so re-running this file against live or any already-seeded
-- database manufactures false freshness across the whole table.
-- Migration 037 hits the identical hazard with the identical
-- statement and wraps it in `ALTER TABLE ... DISABLE/ENABLE TRIGGER
-- resources_updated_at` for exactly this reason — this file has no
-- such guard. Found by Codex review on PR #92, 2026-09-01.
--
-- Do not re-run this file against a database that already has this
-- backfill's effects (i.e. live, or anything restored from it) without
-- first wrapping step 7 the way 037 does. It is safe to run once
-- against a freshly-migrated, unseeded database.
-- ================================================================

-- ── 1. serves_meals ───────────────────────────────────────────────
UPDATE resources
SET serves_meals = TRUE
WHERE category = 'food'
  AND serves_meals = FALSE;

-- ── 2. Campground showers & restrooms ─────────────────────────────
UPDATE resources
SET has_showers   = TRUE,
    has_restrooms = TRUE
WHERE category   = 'outdoor_space'
  AND subcategory = 'campground'
  AND (has_showers = FALSE OR has_restrooms = FALSE);

UPDATE resources
SET has_restrooms = TRUE
WHERE category   = 'outdoor_space'
  AND subcategory = 'primitive_campground'
  AND has_restrooms = FALSE;

-- ── 3. gender_policy = 'gender_inclusive' for universal categories ─
UPDATE resources
SET gender_policy = 'gender_inclusive'
WHERE gender_policy = 'unknown'
  AND category IN (
    'outdoor_space', 'food', 'work_exchange', 'employment',
    'medical', 'healthcare', 'childcare', 'transportation'
  );

-- ── 4. population_focus: domestic violence resources ──────────────
UPDATE resources
SET population_focus = ARRAY['domestic_violence']
WHERE population_focus = '{}'
  AND (
    subcategory IN (
      'domestic_violence_shelter',
      'domestic_violence_support',
      'women_children_shelter'
    )
    OR resource_type = 'domestic_violence_shelter'
  );

-- ── 5. population_focus: veteran resources ────────────────────────
UPDATE resources
SET population_focus = ARRAY['veterans']
WHERE population_focus = '{}'
  AND subcategory IN (
    'veteran_housing_support',
    'veteran_employment_support',
    'veteran_support_line',
    'veteran_support'
  );

-- ── 6. resource_type backfill ─────────────────────────────────────
UPDATE resources SET resource_type = 'work_exchange'
WHERE resource_type IS NULL AND subcategory = 'career_center' AND category = 'work_exchange';

UPDATE resources SET resource_type = 'hot_meal'
WHERE resource_type IS NULL AND category = 'food' AND subcategory IN ('free_meal', 'free_meals');

UPDATE resources SET resource_type = 'food_pantry'
WHERE resource_type IS NULL AND category = 'food'
  AND subcategory IN ('food_distribution', 'food_assistance', 'food_assistance_navigation');

UPDATE resources SET resource_type = 'crisis_hotline'
WHERE resource_type IS NULL AND subcategory IN ('homeless_helpline', 'hotline_intake', 'resource_navigation');

UPDATE resources SET resource_type = 'medical_clinic'
WHERE resource_type IS NULL AND subcategory IN ('medical_respite', 'recuperative_care');

UPDATE resources SET resource_type = 'day_use_park'
WHERE resource_type IS NULL AND category = 'outdoor_space'
  AND subcategory IN ('day_use_park', 'day_use_park_with_restrooms', 'day_use_park_with_showers');

-- ── 7. Re-fire confidence trigger ─────────────────────────────────
UPDATE resources SET stale_after_days = stale_after_days;
