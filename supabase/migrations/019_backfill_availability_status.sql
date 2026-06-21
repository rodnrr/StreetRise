-- ================================================================
-- StreetRise — Migration 019: Backfill availability_status for seed resources
-- ================================================================

-- 75 of 106 map-ready active resources show availability_status = 'unknown',
-- making the public map appear unreliable before launch.
--
-- Scope: only resources that are active, map-ready, still 'unknown', AND
-- have never been touched by a real provider (last_provider_update_at IS NULL).
-- Resources a provider has explicitly updated are left as-is.

UPDATE resources
SET availability_status = 'available'
WHERE is_active = TRUE
  AND is_map_ready = TRUE
  AND availability_status = 'unknown'
  AND last_provider_update_at IS NULL;
