-- ================================================================
-- StreetRise — Migration 063: repair Jericho Road + Hernando housing
-- Sources checked 2026-09-05.
--
-- Why this migration exists:
-- - StreetRise already held two legacy Jericho Road emergency-shelter rows.
-- - Jericho's current official site explicitly says it no longer provides
--   overnight emergency shelter; its men's and women's centers are now the
--   long-term REBuilt residential recovery program.
-- - The existing provider also had a placeholder public email.
-- - Jericho's current official homepage features a resident account stating
--   that Drug Court led him to Jericho after seven months in jail with serious
--   felonies. That is affirmative evidence that felony history can be
--   considered, without implying acceptance of every offense type.
--
-- Sensitive violent- and sex-offense fields remain NULL.
-- ================================================================

-- Repair the existing provider rather than creating a duplicate.
UPDATE providers
SET contact_name = 'Program Intake',
    contact_email = 'contact@jericho-road.net',
    contact_phone = '352-799-2912',
    website = 'https://www.jericho-road.net/',
    verification_status = 'verified',
    last_verified_at = now(),
    verification_notes = 'Official Jericho Road current contact, Get Help, Recovery, History and home pages checked 2026-09-05. Placeholder contact replaced with current published organization contact. Current program is REBuilt residential recovery, not overnight emergency shelter.',
    updated_at = now()
WHERE external_id = 'JROAD-001';

-- Retire obsolete emergency-shelter listings. Preserve the rows for audit/history.
UPDATE resources
SET is_active = FALSE,
    availability_status = 'closed'::availability_status,
    verification_status = 'verified'::verification_status,
    last_verified_at = now(),
    confidence_score = 100,
    stale_after_days = 30,
    verification_notes = 'Retired 2026-09-05 after current official Jericho Road Get Help/History pages confirmed that the former men''s and women''s shelters were rebranded as recovery centers and the organization currently does not provide overnight emergency shelter.',
    updated_at = now()
WHERE external_id IN (
  'JROAD-001-mens-shelter-shelter',
  'JROAD-001-womens-shelter-marys-house-shelter'
);

-- Current Hernando housing/recovery listing.
INSERT INTO resources (
  provider_id,name,description,category,resource_type,address,phone,email,website,
  availability_status,verification_status,is_active,walk_ins_accepted,requires_id,
  requires_referral,access_type,is_map_ready,gender_policy,population_focus,
  external_id,source_file,import_batch_id,last_imported_at,last_verified_at,
  confidence_score,stale_after_days,verification_notes
)
SELECT
  p.id,
  'Jericho Road Ministries — REBuilt Residential Recovery',
  'Long-term residential recovery in Brooksville with separate men''s and women''s centers. The five-month core program is abstinence-based and may continue with transitional housing support through a longer recovery pathway of up to 25 months. Applicants use the program request form and complete a screening interview.',
  'housing'::resource_category,
  'recovery_residence',
  '{"city":"Brooksville","state":"FL"}'::jsonb,
  '352-799-2912',
  'contact@jericho-road.net',
  'https://www.jericho-road.net/get-help',
  'unknown'::availability_status,
  'verified'::verification_status,
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  'web_intake'::resource_access_type,
  FALSE,
  'unknown',
  ARRAY['substance_recovery']::text[],
  'housing-jericho-road-rebuilt-hernando',
  'migration_063',
  'housing_second_chance_063_hernando',
  now(),now(),
  95,
  30,
  'Official current pages checked 2026-09-05. Current site states no overnight emergency shelter and describes REBuilt as a residential 5–25 month recovery pathway. Official homepage currently features a participant account describing admission after jail with serious felonies via Drug Court. This supports felony-history consideration, not blanket eligibility for every offense.'
FROM providers p
WHERE p.external_id = 'JROAD-001'
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  provider_id=EXCLUDED.provider_id,
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  category=EXCLUDED.category,
  resource_type=EXCLUDED.resource_type,
  address=EXCLUDED.address,
  phone=EXCLUDED.phone,
  email=EXCLUDED.email,
  website=EXCLUDED.website,
  availability_status=EXCLUDED.availability_status,
  verification_status=EXCLUDED.verification_status,
  is_active=EXCLUDED.is_active,
  walk_ins_accepted=EXCLUDED.walk_ins_accepted,
  requires_id=EXCLUDED.requires_id,
  requires_referral=EXCLUDED.requires_referral,
  access_type=EXCLUDED.access_type,
  is_map_ready=EXCLUDED.is_map_ready,
  gender_policy=EXCLUDED.gender_policy,
  population_focus=EXCLUDED.population_focus,
  source_file=EXCLUDED.source_file,
  import_batch_id=EXCLUDED.import_batch_id,
  last_imported_at=EXCLUDED.last_imported_at,
  last_verified_at=EXCLUDED.last_verified_at,
  confidence_score=EXCLUDED.confidence_score,
  stale_after_days=EXCLUDED.stale_after_days,
  verification_notes=EXCLUDED.verification_notes,
  updated_at=now();

INSERT INTO resource_housing_details (
  resource_id,accepts_felony,accepts_violent_offense,accepts_sex_offense,
  requires_sobriety,has_curfew,application_url,intake_phone,eligibility_notes,
  housing_details_last_checked_at
)
SELECT
  r.id,
  TRUE,
  NULL::boolean,
  NULL::boolean,
  TRUE,
  NULL::boolean,
  'https://www.jericho-road.net/get-help',
  '352-799-2912',
  'Adults 18+ may apply to the structured abstinence-based REBuilt program. Applicants must detox before entry and complete a screening interview. Children cannot stay in the recovery centers. The current official site features a participant who entered through Drug Court after jail with serious felonies, supporting felony-history consideration. Current public materials do not state blanket violent- or sex-offense eligibility; call to confirm record-specific fit.',
  now()
FROM resources r
WHERE r.external_id='housing-jericho-road-rebuilt-hernando'
ON CONFLICT (resource_id) DO UPDATE SET
  accepts_felony=EXCLUDED.accepts_felony,
  accepts_violent_offense=EXCLUDED.accepts_violent_offense,
  accepts_sex_offense=EXCLUDED.accepts_sex_offense,
  requires_sobriety=EXCLUDED.requires_sobriety,
  has_curfew=EXCLUDED.has_curfew,
  application_url=EXCLUDED.application_url,
  intake_phone=EXCLUDED.intake_phone,
  eligibility_notes=EXCLUDED.eligibility_notes,
  housing_details_last_checked_at=EXCLUDED.housing_details_last_checked_at,
  updated_at=now();

-- Current evidence for the new listing and the retired legacy services.
WITH ev(external_id,claim_field,method,outcome,source_url,source_name,notes) AS (
VALUES
('housing-jericho-road-rebuilt-hernando','resource_type','official_website','confirmed','https://www.jericho-road.net/get-help','Jericho Road Ministries','Current Get Help page says Jericho operates men''s and women''s recovery centers, requires a five-month core commitment and may provide transitional housing support through a longer recovery pathway.'),
('housing-jericho-road-rebuilt-hernando','requires_sobriety','official_website','confirmed','https://www.jericho-road.net/get-help','Jericho Road Ministries','Current REBuilt program is explicitly abstinence-based and requires participants to detox before entering.'),
('housing-jericho-road-rebuilt-hernando','accepts_felony','official_website','confirmed','https://www.jericho-road.net/home','Jericho Road Ministries','Current official homepage features a participant account stating he spent seven months in jail with serious felonies and was led to Jericho Road by Drug Court, supporting that felony history can be considered. This does not establish blanket violent- or sex-offense acceptance.'),
('JROAD-001-mens-shelter-shelter','availability_status','official_website','changed','https://www.jericho-road.net/get-help','Jericho Road Ministries','Current official Get Help page says Jericho Road does not provide overnight emergency shelters; former shelter model has been replaced by residential recovery centers.'),
('JROAD-001-womens-shelter-marys-house-shelter','availability_status','official_website','changed','https://www.jericho-road.net/get-help','Jericho Road Ministries','Current official Get Help page says Jericho Road does not provide overnight emergency shelters; former shelter model has been replaced by residential recovery centers.')
)
INSERT INTO resource_evidence(
  resource_id,claim_field,method,outcome,source_url,source_name,checked_at,checked_by,notes
)
SELECT r.id,ev.claim_field,ev.method,ev.outcome,ev.source_url,ev.source_name,now(),
  'StreetRise migration 063',ev.notes
FROM ev
JOIN resources r ON r.external_id=ev.external_id
WHERE NOT EXISTS (
  SELECT 1 FROM resource_evidence e
  WHERE e.resource_id=r.id
    AND e.claim_field IS NOT DISTINCT FROM ev.claim_field
    AND e.source_url IS NOT DISTINCT FROM ev.source_url
    AND e.outcome IS NOT DISTINCT FROM ev.outcome
);
