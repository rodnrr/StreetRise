-- ================================================================
-- StreetRise — Migration 060: verified second-chance / reentry housing
--
-- Adds current, source-backed housing records that satisfy the existing
-- /housing?view=second-chance shortcut. The shortcut is intentionally a
-- derived filter: population_focus contains 'reentry' OR
-- resource_housing_details.accepts_felony = true.
--
-- Sources checked 2026-09-05:
--   PERC housing: https://www.exoffender.org/programs/programs-ex-offenders/housing/
--   PERC contact: https://www.exoffender.org/contact-us/
--   Blu Manor: https://www.blumanor.org/
--   Blu Manor housing: https://www.blumanor.org/housing
--   Blu Manor program: https://www.blumanor.org/program
--   Blu Manor apply: https://www.blumanor.org/apply
-- ================================================================

-- 1. Providers ----------------------------------------------------

INSERT INTO providers (
  organization_name, contact_name, contact_email, contact_phone, website,
  verification_status, identity_confirmed, claim_status, source_type,
  external_id, last_imported_at, last_verified_at, verification_notes
)
VALUES
  (
    'People Empowering & Restoring Communities (PERC)',
    'PERC Intake',
    'mjalazo@exoffender.org',
    '1-855-505-7372',
    'https://www.exoffender.org/',
    'verified', FALSE, 'unclaimed', 'seeded',
    'housing-provider-perc', now(), now(),
    'Official PERC housing and contact pages checked 2026-09-05. PERC serves ex-offenders returning to Pinellas County and publishes transitional housing programs.'
  ),
  (
    'Blu Manor Transitional Housing',
    'Resident Inquiries',
    'info@blumanor.org',
    '727-563-6540',
    'https://www.blumanor.org/',
    'verified', FALSE, 'unclaimed', 'seeded',
    'housing-provider-blu-manor', now(), now(),
    'Official Blu Manor pages checked 2026-09-05. Provider explicitly describes its housing as second-chance, reentry-focused, and felon-friendly.'
  )
ON CONFLICT (external_id) WHERE external_id IS NOT NULL
DO UPDATE SET
  organization_name   = EXCLUDED.organization_name,
  contact_name        = EXCLUDED.contact_name,
  contact_email       = EXCLUDED.contact_email,
  contact_phone       = EXCLUDED.contact_phone,
  website             = EXCLUDED.website,
  verification_status = EXCLUDED.verification_status,
  identity_confirmed  = EXCLUDED.identity_confirmed,
  claim_status        = EXCLUDED.claim_status,
  source_type         = EXCLUDED.source_type,
  last_imported_at    = EXCLUDED.last_imported_at,
  last_verified_at    = EXCLUDED.last_verified_at,
  verification_notes  = EXCLUDED.verification_notes,
  updated_at          = now();

-- 2. PERC reentry housing -----------------------------------------

INSERT INTO resources (
  provider_id, name, description, category, resource_type,
  address, phone, email, website,
  availability_status, verification_status, is_active,
  walk_ins_accepted, access_type, is_map_ready,
  population_focus,
  external_id, source_file, import_batch_id, last_imported_at,
  last_verified_at, confidence_score, stale_after_days,
  verification_notes
)
SELECT
  p.id,
  'PERC — Reentry Housing Programs',
  'Transitional housing for people returning to Pinellas County after incarceration. PERC publishes housing through One Unique Transition (OUT) and the Continental Housing Program, with case-management and employment support tied to reentry.',
  'housing', 'transitional_housing',
  '{"street":"12810 US HWY 19 N, Suite 1","city":"Clearwater","state":"FL","zip":"33764"}'::jsonb,
  '1-855-505-7372', 'mjalazo@exoffender.org',
  'https://www.exoffender.org/programs/programs-ex-offenders/housing/',
  'unknown', 'verified', TRUE,
  FALSE, 'phone_intake', FALSE,
  ARRAY['reentry']::text[],
  'housing-perc-reentry', 'migration_060', 'housing_second_chance_060', now(),
  now(), 95, 30,
  'Official PERC housing page checked 2026-09-05. OUT serves males returning from incarceration and/or recovery; CHP serves at-risk criminal-justice participants. Housing locations themselves are not published here, so the public office is retained only as contact context and the listing is not map-ready.'
FROM providers p
WHERE p.external_id = 'housing-provider-perc'
ON CONFLICT (external_id) WHERE external_id IS NOT NULL
DO UPDATE SET
  provider_id         = EXCLUDED.provider_id,
  name                = EXCLUDED.name,
  description         = EXCLUDED.description,
  category            = EXCLUDED.category,
  resource_type       = EXCLUDED.resource_type,
  address             = EXCLUDED.address,
  phone               = EXCLUDED.phone,
  email               = EXCLUDED.email,
  website             = EXCLUDED.website,
  availability_status = EXCLUDED.availability_status,
  verification_status = EXCLUDED.verification_status,
  is_active           = EXCLUDED.is_active,
  walk_ins_accepted   = EXCLUDED.walk_ins_accepted,
  access_type         = EXCLUDED.access_type,
  is_map_ready        = EXCLUDED.is_map_ready,
  population_focus    = EXCLUDED.population_focus,
  source_file         = EXCLUDED.source_file,
  import_batch_id     = EXCLUDED.import_batch_id,
  last_imported_at    = EXCLUDED.last_imported_at,
  last_verified_at    = EXCLUDED.last_verified_at,
  confidence_score    = EXCLUDED.confidence_score,
  stale_after_days    = EXCLUDED.stale_after_days,
  verification_notes  = EXCLUDED.verification_notes,
  updated_at          = now();

INSERT INTO resource_housing_details (
  resource_id, intake_phone, application_url, eligibility_notes,
  housing_details_last_checked_at
)
SELECT
  r.id,
  '1-855-505-7372',
  'https://www.exoffender.org/contact-us/',
  'PERC states that its housing programs serve people transitioning from incarceration. One Unique Transition is described as a safe, sober transitional community for males returning from incarceration and/or recovery programs. Contact PERC for current placement criteria and openings.',
  now()
FROM resources r
WHERE r.external_id = 'housing-perc-reentry'
ON CONFLICT (resource_id) DO UPDATE SET
  intake_phone                    = EXCLUDED.intake_phone,
  application_url                 = EXCLUDED.application_url,
  eligibility_notes               = EXCLUDED.eligibility_notes,
  housing_details_last_checked_at = EXCLUDED.housing_details_last_checked_at,
  updated_at                      = now();

-- 3. Blu Manor second-chance housing ------------------------------

INSERT INTO resources (
  provider_id, name, description, category, resource_type,
  address, phone, email, website,
  availability_status, verification_status, is_active,
  walk_ins_accepted, access_type, is_map_ready,
  population_focus, has_laundry,
  external_id, source_file, import_batch_id, last_imported_at,
  last_verified_at, confidence_score, stale_after_days,
  verification_notes
)
SELECT
  p.id,
  'Blu Manor — Second Chance Transitional Housing',
  'Felon-friendly, structured transitional housing for men and women reentering the community across Hillsborough and Pinellas counties. Shared rooms start at $850/month with utilities, Wi-Fi, and on-site laundry included.',
  'housing', 'transitional_housing',
  '{"city":"Tampa Bay Area","state":"FL"}'::jsonb,
  '727-563-6540', 'info@blumanor.org',
  'https://www.blumanor.org/',
  'limited', 'verified', TRUE,
  FALSE, 'web_intake', FALSE,
  ARRAY['reentry']::text[], TRUE,
  'housing-blu-manor-second-chance', 'migration_060', 'housing_second_chance_060', now(),
  now(), 98, 30,
  'Official Blu Manor home, housing, program, contact, and application pages checked 2026-09-05. Site explicitly says felon-friendly and reentry-focused, with limited rooms across 5+ Tampa Bay properties. Exact residential locations are not published and are therefore not map-ready.'
FROM providers p
WHERE p.external_id = 'housing-provider-blu-manor'
ON CONFLICT (external_id) WHERE external_id IS NOT NULL
DO UPDATE SET
  provider_id         = EXCLUDED.provider_id,
  name                = EXCLUDED.name,
  description         = EXCLUDED.description,
  category            = EXCLUDED.category,
  resource_type       = EXCLUDED.resource_type,
  address             = EXCLUDED.address,
  phone               = EXCLUDED.phone,
  email               = EXCLUDED.email,
  website             = EXCLUDED.website,
  availability_status = EXCLUDED.availability_status,
  verification_status = EXCLUDED.verification_status,
  is_active           = EXCLUDED.is_active,
  walk_ins_accepted   = EXCLUDED.walk_ins_accepted,
  access_type         = EXCLUDED.access_type,
  is_map_ready        = EXCLUDED.is_map_ready,
  population_focus    = EXCLUDED.population_focus,
  has_laundry         = EXCLUDED.has_laundry,
  source_file         = EXCLUDED.source_file,
  import_batch_id     = EXCLUDED.import_batch_id,
  last_imported_at    = EXCLUDED.last_imported_at,
  last_verified_at    = EXCLUDED.last_verified_at,
  confidence_score    = EXCLUDED.confidence_score,
  stale_after_days    = EXCLUDED.stale_after_days,
  verification_notes  = EXCLUDED.verification_notes,
  updated_at          = now();

INSERT INTO resource_housing_details (
  resource_id,
  accepts_felony, has_curfew,
  minimum_monthly_cost_cents,
  application_url, intake_phone, eligibility_notes,
  housing_details_last_checked_at
)
SELECT
  r.id,
  TRUE, TRUE,
  85000,
  'https://www.blumanor.org/apply',
  '727-563-6540',
  'Blu Manor explicitly describes its program as felon-friendly second-chance transitional housing. Residents are expected to maintain employment or verified income, comply with supervision requirements, follow a 10 PM standard curfew (adjustable for approved work schedules), and follow the published drug-free house rules. Violent-offense and sex-offense eligibility are not stated and remain unknown in StreetRise.',
  now()
FROM resources r
WHERE r.external_id = 'housing-blu-manor-second-chance'
ON CONFLICT (resource_id) DO UPDATE SET
  accepts_felony                  = EXCLUDED.accepts_felony,
  has_curfew                      = EXCLUDED.has_curfew,
  minimum_monthly_cost_cents      = EXCLUDED.minimum_monthly_cost_cents,
  application_url                 = EXCLUDED.application_url,
  intake_phone                    = EXCLUDED.intake_phone,
  eligibility_notes               = EXCLUDED.eligibility_notes,
  housing_details_last_checked_at = EXCLUDED.housing_details_last_checked_at,
  updated_at                      = now();

-- 4. Evidence -----------------------------------------------------

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome,
  source_url, source_name, checked_at, checked_by, notes
)
SELECT r.id, 'population_focus.reentry', 'official_website', 'confirmed',
       'https://www.exoffender.org/programs/programs-ex-offenders/housing/',
       'People Empowering & Restoring Communities (PERC)', now(),
       'StreetRise migration 060',
       'PERC states its housing serves people returning from incarceration and criminal-justice participants.'
FROM resources r
WHERE r.external_id = 'housing-perc-reentry'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'population_focus.reentry'
      AND e.source_url = 'https://www.exoffender.org/programs/programs-ex-offenders/housing/'
  );

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome,
  source_url, source_name, checked_at, checked_by, notes
)
SELECT r.id, 'accepts_felony', 'official_website', 'confirmed',
       'https://www.blumanor.org/',
       'Blu Manor Transitional Housing', now(),
       'StreetRise migration 060',
       'Blu Manor explicitly publishes that its housing is felon-friendly and designed for people reentering the community.'
FROM resources r
WHERE r.external_id = 'housing-blu-manor-second-chance'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'accepts_felony'
      AND e.source_url = 'https://www.blumanor.org/'
  );

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome,
  source_url, source_name, checked_at, checked_by, notes
)
SELECT r.id, 'minimum_monthly_cost_cents', 'official_website', 'confirmed',
       'https://www.blumanor.org/housing',
       'Blu Manor Transitional Housing', now(),
       'StreetRise migration 060',
       'Published shared-room rate starts at $850/month; utilities and Wi-Fi included.'
FROM resources r
WHERE r.external_id = 'housing-blu-manor-second-chance'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'minimum_monthly_cost_cents'
      AND e.source_url = 'https://www.blumanor.org/housing'
  );

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome,
  source_url, source_name, checked_at, checked_by, notes
)
SELECT r.id, 'has_curfew', 'official_website', 'confirmed',
       'https://www.blumanor.org/program',
       'Blu Manor Transitional Housing', now(),
       'StreetRise migration 060',
       'Published standard curfew is 10:00 PM nightly, adjustable for approved work schedules.'
FROM resources r
WHERE r.external_id = 'housing-blu-manor-second-chance'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'has_curfew'
      AND e.source_url = 'https://www.blumanor.org/program'
  );
