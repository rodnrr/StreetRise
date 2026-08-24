-- ================================================================
-- StreetRise — Migration 039: Backfill gender_policy from public data
--
-- Repo-completeness re-add. This backfill was applied to LIVE on
-- 2026-06-18 (supabase_migrations version 20260618200147, name
-- "backfill_gender_policy_from_public_data") but its file was never
-- merged into the repo — it lived only on a since-deleted session
-- branch. The SQL below is reproduced verbatim from the statement
-- recorded in the live migration history.
--
-- Resolves the remaining gender_policy = 'unknown' rows using
-- name/subcategory signals, then fails the rest open to
-- 'gender_inclusive' (consistent with the map's fail-open rule: an
-- unknown policy must never hide a real bed). Idempotent — only
-- touches rows still marked 'unknown', so re-running is a no-op.
-- Runs after 038 (taxonomy backfill), matching the live apply order.
-- ================================================================

UPDATE resources
SET gender_policy = 'men_only'
WHERE gender_policy = 'unknown'
  AND category = 'shelter'
  AND name ILIKE 'Men''s%';

UPDATE resources
SET gender_policy = 'women_only'
WHERE gender_policy = 'unknown'
  AND subcategory = 'women_children_shelter';

UPDATE resources
SET gender_policy = 'youth_only'
WHERE gender_policy = 'unknown'
  AND subcategory = 'youth_shelter';

UPDATE resources
SET gender_policy = 'gender_inclusive'
WHERE gender_policy = 'unknown';
