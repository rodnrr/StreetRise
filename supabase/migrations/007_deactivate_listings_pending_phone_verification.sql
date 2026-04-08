-- ================================================================
-- StreetRise — Migration 007: Deactivate listings pending phone verification
-- ================================================================
-- Rationale:
-- Until phone verification is complete, resources should not be publicly active
-- and providers should not be marked as verified.

-- Hide all currently active resources from public map/search.
UPDATE resources
SET is_active = FALSE,
    updated_at = NOW()
WHERE is_active = TRUE;

-- Revert provider verification to pending when previously verified.
UPDATE providers
SET verification_status = 'pending',
    updated_at = NOW()
WHERE verification_status = 'verified';
