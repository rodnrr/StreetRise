-- ================================================================
-- StreetRise — Migration 040: Extend default staleness window to 90 days
--
-- Product call from the maintainer: at the migration-010 default of 30
-- days, keeping the freshness signal accurate meant renewing every
-- listing roughly monthly by hand (or paying to run the work-exchange-
-- style verification agent), which does not scale as the number of
-- listings grows and was making the platform look unmaintained rather
-- than making it more trustworthy. This raises the bar to 90 days —
-- both the column default (new rows) and every existing row still
-- holding the old default.
--
-- Paired with an app-code change in this same PR that removes the
-- public "may be outdated" badge from the map card, the detail sheet,
-- and /resources/:id entirely — freshness stays visible only in the
-- provider portal and admin (ProviderListings, AdminResourceEdit, and
-- the new bulk "Quick refresh" panel on /admin/resources). This
-- migration is about giving that now-internal-only signal a threshold
-- that doesn't demand constant manual renewal, not about the public
-- copy, which no longer reads this value at all.
--
-- Live already runs fn_update_resource_confidence() (captured, not yet
-- applied, in migration 037 — see that file's header), which reads
-- stale_after_days directly:
--   threshold := COALESCE(NEW.stale_after_days, 30)
-- so this change takes effect on live's real confidence score as soon
-- as it runs, independent of whether 037 itself is ever applied.
--
-- Idempotent: the backfill only raises rows below 90, never lowers a
-- row a future admin tool might set higher on purpose, and re-running
-- it is a no-op once every row is at or above 90.
-- ================================================================

ALTER TABLE resources ALTER COLUMN stale_after_days SET DEFAULT 90;

-- ── Backfill existing rows ───────────────────────────────────────
-- This UPDATE recomputes confidence_score (correctly — the threshold
-- it's scored against changed) but must not touch updated_at, which is
-- what getTrustInfo() and fn_update_resource_confidence() itself fall
-- back to for "how long has it been" when last_provider_update_at is
-- null. Same DISABLE/ENABLE idiom migration 037 uses for the same
-- reason: a bulk UPDATE must not manufacture freshness by touching a
-- column it has no business touching.

BEGIN;

ALTER TABLE resources DISABLE TRIGGER resources_updated_at;

UPDATE resources SET stale_after_days = 90 WHERE stale_after_days < 90;

ALTER TABLE resources ENABLE TRIGGER resources_updated_at;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════════════════════════════

-- Expect 0.
-- SELECT count(*) FROM resources WHERE stale_after_days < 90;

-- Confirm updated_at was not touched by the backfill — snapshot before,
-- diff after. Same check as migration 037.
-- CREATE TEMP TABLE ts_before_040 AS SELECT id, updated_at FROM resources;
--   …apply the migration…
-- SELECT count(*) FROM resources r JOIN ts_before_040 b USING (id)
--  WHERE r.updated_at IS DISTINCT FROM b.updated_at;   -- expect 0
