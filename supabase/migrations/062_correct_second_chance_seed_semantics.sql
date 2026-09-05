-- ================================================================
-- StreetRise — Migration 062: correct second-chance seed semantics
--
-- 1) 70x7's published $250 charge is a one-time program fee, not a
--    security deposit. Keep it in notes/evidence; do not model it as deposit.
-- 2) Project 180 publishes referral/recommendation partners and candidate
--    vetting, but does not state that a referral is mandatory. Do not expose
--    requires_referral=true without explicit support.
-- ================================================================

UPDATE resource_housing_details h
SET deposit_cents = NULL,
    updated_at = now()
FROM resources r
WHERE h.resource_id = r.id
  AND r.external_id = 'housing-70x7-justice-involved';

UPDATE resources
SET requires_referral = FALSE,
    updated_at = now()
WHERE external_id = 'housing-project-180-residential';

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome,
  source_url, source_name, checked_at, checked_by, notes
)
SELECT r.id, 'program_fee', 'official_website', 'confirmed',
       'https://70x7housing.org/apply/',
       '70x7 Housing Foundation Inc', now(),
       'StreetRise migration 062',
       'The provider publishes a one-time $250 program fee. This is intentionally not stored in deposit_cents because the source does not call it a security deposit.'
FROM resources r
WHERE r.external_id = 'housing-70x7-justice-involved'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'program_fee'
      AND e.source_url = 'https://70x7housing.org/apply/'
  );
