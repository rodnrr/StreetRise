-- StreetRise Second Chance Housing QA audit
-- Read-only. Safe to run before/after a regional seed migration.
--
-- A Second Chance result is housing where either:
--   accepts_felony = true OR population_focus contains 'reentry'.

-- 1) Public result set -------------------------------------------------------
SELECT
  r.id,
  r.external_id,
  r.name,
  r.resource_type,
  r.address->>'city' AS city,
  r.address->>'state' AS state,
  r.gender_policy,
  r.requires_referral,
  r.access_type,
  r.is_map_ready,
  r.verification_status,
  r.confidence_score,
  r.last_verified_at,
  r.stale_after_days,
  h.accepts_felony,
  h.accepts_violent_offense,
  h.accepts_sex_offense,
  h.requires_sobriety,
  h.minimum_monthly_cost_cents,
  h.deposit_cents,
  h.housing_details_last_checked_at,
  COUNT(e.id) AS evidence_count
FROM resources r
LEFT JOIN resource_housing_details h ON h.resource_id = r.id
LEFT JOIN resource_evidence e ON e.resource_id = r.id
WHERE r.is_active = true
  AND r.category = 'housing'
  AND (
    h.accepts_felony IS TRUE
    OR 'reentry' = ANY(r.population_focus)
  )
GROUP BY r.id, h.resource_id
ORDER BY r.address->>'city' NULLS LAST, r.name;

-- 2) Quality failures -------------------------------------------------------
WITH second_chance AS (
  SELECT
    r.*,
    h.resource_id AS housing_detail_resource_id,
    h.housing_details_last_checked_at,
    COUNT(e.id) AS evidence_count
  FROM resources r
  LEFT JOIN resource_housing_details h ON h.resource_id = r.id
  LEFT JOIN resource_evidence e ON e.resource_id = r.id
  WHERE r.is_active = true
    AND r.category = 'housing'
    AND (
      h.accepts_felony IS TRUE
      OR 'reentry' = ANY(r.population_focus)
    )
  GROUP BY r.id, h.resource_id, h.housing_details_last_checked_at
)
SELECT external_id, name, issue
FROM (
  SELECT external_id, name, 'missing phone/contact path' AS issue
  FROM second_chance WHERE phone IS NULL OR btrim(phone) = ''
  UNION ALL
  SELECT external_id, name, 'missing website' FROM second_chance
  WHERE website IS NULL OR btrim(website) = ''
  UNION ALL
  SELECT external_id, name, 'missing housing details' FROM second_chance
  WHERE housing_detail_resource_id IS NULL
  UNION ALL
  SELECT external_id, name, 'missing evidence' FROM second_chance
  WHERE evidence_count = 0
  UNION ALL
  SELECT external_id, name, 'missing housing details check timestamp' FROM second_chance
  WHERE housing_details_last_checked_at IS NULL
  UNION ALL
  SELECT external_id, name, 'not verified' FROM second_chance
  WHERE verification_status <> 'verified'
  UNION ALL
  SELECT external_id, name, 'confidence below 90' FROM second_chance
  WHERE confidence_score < 90
  UNION ALL
  SELECT external_id, name, 'freshness window is not 30 days' FROM second_chance
  WHERE stale_after_days <> 30
  UNION ALL
  SELECT external_id, name, 'referral required but access path looks onsite' FROM second_chance
  WHERE requires_referral IS TRUE AND access_type = 'onsite'
  UNION ALL
  SELECT external_id, name, 'map-ready despite non-onsite intake' FROM second_chance
  WHERE is_map_ready IS TRUE AND access_type IN ('phone_intake','web_intake','confidential_address','not_map_ready')
) failures
ORDER BY name, issue;

-- 3) Potential provider duplicates -----------------------------------------
-- Review rows manually; a shared umbrella website can be legitimate.
WITH normalized AS (
  SELECT
    id,
    organization_name,
    external_id,
    lower(trim(organization_name)) AS normalized_name,
    lower(regexp_replace(coalesce(website,''), '^https?://(www\.)?|/$', '', 'g')) AS normalized_website
  FROM providers
)
SELECT
  a.organization_name,
  a.external_id,
  b.organization_name AS possible_duplicate_name,
  b.external_id AS possible_duplicate_external_id,
  a.normalized_website
FROM normalized a
JOIN normalized b ON a.id < b.id
 AND (
   a.normalized_name = b.normalized_name
   OR (a.normalized_website <> '' AND a.normalized_website = b.normalized_website)
 )
ORDER BY a.organization_name;

-- 4) Anonymous-role visibility ---------------------------------------------
BEGIN;
SET LOCAL ROLE anon;
SELECT COUNT(*) AS anon_second_chance_count
FROM resources r
LEFT JOIN resource_housing_details h ON h.resource_id = r.id
WHERE r.is_active = true
  AND r.category = 'housing'
  AND (
    h.accepts_felony IS TRUE
    OR 'reentry' = ANY(r.population_focus)
  );
ROLLBACK;
