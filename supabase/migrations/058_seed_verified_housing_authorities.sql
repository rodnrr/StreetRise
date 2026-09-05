-- ================================================================
-- StreetRise — Migration 058: initial verified housing authority seed
--
-- Purpose:
--   Put the housing capability introduced by migrations 056/057 to work
--   with a small set of official-source records already represented in
--   StreetRise outreach workbooks.
--
-- Trust rules:
--   * Official agency pages only for published claims in this seed.
--   * HCV/Section 8 ASSISTANCE is resource_type = 'voucher_program'.
--   * Voucher ACCEPTANCE is resource_housing_details.accepts_vouchers.
--   * A closed HCV waitlist does not mean the program itself is closed;
--     availability_status remains 'limited' while waitlist_status='closed'.
--   * Tarpon Springs Housing Authority is intentionally NOT classified as
--     a voucher_program: its official site says it does not administer HCV
--     vouchers, while certain affordable properties do accept them.
--
-- Official sources checked 2026-09-05:
--   SPHA: https://www.stpeteha.org/apply-for-housing
--   PCHA: https://pinellashousing.com/housing_opportunities/housing_programs/waitlist.php
--   PCHA: https://pinellashousing.com/departments/what_we_do/index.php
--   TSHA: https://tarponspringshousing.com/affordable-housing/
--   TSHA: https://tarponspringshousing.com/contact-us/
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. Providers
-- ────────────────────────────────────────────────────────────────

INSERT INTO providers (
  organization_name, contact_name, contact_email, contact_phone, website,
  verification_status, identity_confirmed, claim_status, source_type,
  external_id, last_imported_at, last_verified_at, verification_notes
)
VALUES
  (
    'St. Petersburg Housing Authority',
    'Larry Gonzalez',
    'lgonzalez@stpeteha.org',
    '727-323-3171',
    'https://www.stpeteha.org/',
    'verified', FALSE, 'unclaimed', 'seeded',
    'housing-provider-spha', now(), now(),
    'Official SPHA sources checked 2026-09-05. HCV leadership and program remain active; general Section 8/HCV waitlist is closed.'
  ),
  (
    'Pinellas County Housing Authority',
    'Miriam Torres',
    'mtorres@pinellashousing.com',
    '727-443-7684',
    'https://pinellashousing.com/',
    'verified', FALSE, 'unclaimed', 'seeded',
    'housing-provider-pcha', now(), now(),
    'Official PCHA sources checked 2026-09-05. Miriam Torres is Associate Director of the Housing Choice Voucher Program.'
  ),
  (
    'Tarpon Springs Housing Authority',
    'Pamela Chekmazov',
    'info@tarponhousing.com',
    '727-937-4411',
    'https://tarponspringshousing.com/',
    'verified', FALSE, 'unclaimed', 'seeded',
    'housing-provider-tsha', now(), now(),
    'Official TSHA sources checked 2026-09-05. TSHA provides affordable housing and accepts HCV at specified properties, but states that it does not administer Section 8 HCV vouchers.'
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


-- ────────────────────────────────────────────────────────────────
-- 2. Canonical housing resources
-- ────────────────────────────────────────────────────────────────

INSERT INTO resources (
  provider_id, name, description, category, resource_type,
  address, phone, email, website,
  availability_status, verification_status, is_active,
  walk_ins_accepted, access_type, is_map_ready,
  external_id, source_file, import_batch_id, last_imported_at,
  last_verified_at, confidence_score, stale_after_days,
  verification_notes
)
SELECT
  p.id,
  'St. Petersburg Housing Authority — Housing Choice Voucher (Section 8)',
  'Housing Choice Voucher (Section 8) rental-assistance program administered by the St. Petersburg Housing Authority. The program remains active for participants, but the general HCV waitlist is currently closed to new applications.',
  'housing', 'voucher_program',
  '{"street":"2001 Gandy Blvd. North","city":"St. Petersburg","state":"FL","zip":"33702"}'::jsonb,
  '727-323-3171', 'lgonzalez@stpeteha.org',
  'https://www.stpeteha.org/apply-for-housing',
  'limited', 'verified', TRUE,
  FALSE, 'web_intake', FALSE,
  'housing-spha-hcv', 'migration_058', 'housing_seed_058', now(),
  now(), 95, 30,
  'Official SPHA application and HCV pages checked 2026-09-05. General Section 8/HCV waitlist is closed; existing participants remain served.'
FROM providers p
WHERE p.external_id = 'housing-provider-spha'
ON CONFLICT (external_id) WHERE external_id IS NOT NULL
DO UPDATE SET
  provider_id          = EXCLUDED.provider_id,
  name                 = EXCLUDED.name,
  description          = EXCLUDED.description,
  category             = EXCLUDED.category,
  resource_type        = EXCLUDED.resource_type,
  address              = EXCLUDED.address,
  phone                = EXCLUDED.phone,
  email                = EXCLUDED.email,
  website              = EXCLUDED.website,
  availability_status  = EXCLUDED.availability_status,
  verification_status  = EXCLUDED.verification_status,
  is_active            = EXCLUDED.is_active,
  walk_ins_accepted    = EXCLUDED.walk_ins_accepted,
  access_type          = EXCLUDED.access_type,
  is_map_ready         = EXCLUDED.is_map_ready,
  source_file          = EXCLUDED.source_file,
  import_batch_id      = EXCLUDED.import_batch_id,
  last_imported_at     = EXCLUDED.last_imported_at,
  last_verified_at     = EXCLUDED.last_verified_at,
  confidence_score     = EXCLUDED.confidence_score,
  stale_after_days     = EXCLUDED.stale_after_days,
  verification_notes   = EXCLUDED.verification_notes,
  updated_at           = now();

INSERT INTO resources (
  provider_id, name, description, category, resource_type,
  address, phone, email, website,
  availability_status, verification_status, is_active,
  walk_ins_accepted, access_type, is_map_ready,
  external_id, source_file, import_batch_id, last_imported_at,
  last_verified_at, confidence_score, stale_after_days,
  verification_notes
)
SELECT
  p.id,
  'Pinellas County Housing Authority — Housing Choice Voucher (Section 8)',
  'Housing Choice Voucher (Section 8) rental-assistance program administered by the Pinellas County Housing Authority. The program remains active for participants, but the general HCV waitlist is currently closed to new applications.',
  'housing', 'voucher_program',
  '{"street":"11479 Ulmerton Rd.","city":"Largo","state":"FL","zip":"33778"}'::jsonb,
  '727-443-7684', 'mtorres@pinellashousing.com',
  'https://pinellashousing.com/housing_opportunities/housing_programs/waitlist.php',
  'limited', 'verified', TRUE,
  FALSE, 'web_intake', FALSE,
  'housing-pcha-hcv', 'migration_058', 'housing_seed_058', now(),
  now(), 95, 30,
  'Official PCHA HCV and waitlist pages checked 2026-09-05. General HCV/Section 8 waitlist is closed to new applications.'
FROM providers p
WHERE p.external_id = 'housing-provider-pcha'
ON CONFLICT (external_id) WHERE external_id IS NOT NULL
DO UPDATE SET
  provider_id          = EXCLUDED.provider_id,
  name                 = EXCLUDED.name,
  description          = EXCLUDED.description,
  category             = EXCLUDED.category,
  resource_type        = EXCLUDED.resource_type,
  address              = EXCLUDED.address,
  phone                = EXCLUDED.phone,
  email                = EXCLUDED.email,
  website              = EXCLUDED.website,
  availability_status  = EXCLUDED.availability_status,
  verification_status  = EXCLUDED.verification_status,
  is_active            = EXCLUDED.is_active,
  walk_ins_accepted    = EXCLUDED.walk_ins_accepted,
  access_type          = EXCLUDED.access_type,
  is_map_ready         = EXCLUDED.is_map_ready,
  source_file          = EXCLUDED.source_file,
  import_batch_id      = EXCLUDED.import_batch_id,
  last_imported_at     = EXCLUDED.last_imported_at,
  last_verified_at     = EXCLUDED.last_verified_at,
  confidence_score     = EXCLUDED.confidence_score,
  stale_after_days     = EXCLUDED.stale_after_days,
  verification_notes   = EXCLUDED.verification_notes,
  updated_at           = now();

INSERT INTO resources (
  provider_id, name, description, category, resource_type,
  address, phone, email, website,
  availability_status, verification_status, is_active,
  walk_ins_accepted, access_type, is_map_ready,
  external_id, source_file, import_batch_id, last_imported_at,
  last_verified_at, confidence_score, stale_after_days,
  verification_notes
)
SELECT
  p.id,
  'Tarpon Springs Housing Authority — Affordable Housing',
  'Affordable housing administered or managed by the Tarpon Springs Housing Authority. TSHA states that it does not administer Section 8 Housing Choice Vouchers, but specified affordable properties accept Section 8 vouchers. Its affordable-housing waiting lists are currently closed.',
  'housing', 'affordable_housing',
  '{"street":"500 South Walton Avenue","city":"Tarpon Springs","state":"FL","zip":"34689"}'::jsonb,
  '727-937-4411', 'info@tarponhousing.com',
  'https://tarponspringshousing.com/affordable-housing/',
  'limited', 'verified', TRUE,
  FALSE, 'web_intake', FALSE,
  'housing-tsha-affordable', 'migration_058', 'housing_seed_058', now(),
  now(), 95, 30,
  'Official TSHA affordable-housing and contact pages checked 2026-09-05. TSHA explicitly says it does not administer HCV vouchers; specified affordable locations accept them. Waiting lists are closed.'
FROM providers p
WHERE p.external_id = 'housing-provider-tsha'
ON CONFLICT (external_id) WHERE external_id IS NOT NULL
DO UPDATE SET
  provider_id          = EXCLUDED.provider_id,
  name                 = EXCLUDED.name,
  description          = EXCLUDED.description,
  category             = EXCLUDED.category,
  resource_type        = EXCLUDED.resource_type,
  address              = EXCLUDED.address,
  phone                = EXCLUDED.phone,
  email                = EXCLUDED.email,
  website              = EXCLUDED.website,
  availability_status  = EXCLUDED.availability_status,
  verification_status  = EXCLUDED.verification_status,
  is_active            = EXCLUDED.is_active,
  walk_ins_accepted    = EXCLUDED.walk_ins_accepted,
  access_type          = EXCLUDED.access_type,
  is_map_ready         = EXCLUDED.is_map_ready,
  source_file          = EXCLUDED.source_file,
  import_batch_id      = EXCLUDED.import_batch_id,
  last_imported_at     = EXCLUDED.last_imported_at,
  last_verified_at     = EXCLUDED.last_verified_at,
  confidence_score     = EXCLUDED.confidence_score,
  stale_after_days     = EXCLUDED.stale_after_days,
  verification_notes   = EXCLUDED.verification_notes,
  updated_at           = now();


-- ────────────────────────────────────────────────────────────────
-- 3. Housing-specific details
-- ────────────────────────────────────────────────────────────────

INSERT INTO resource_housing_details (
  resource_id, application_url, intake_phone, eligibility_notes,
  waitlist_status, waitlist_last_checked_at,
  housing_details_last_checked_at
)
SELECT
  r.id,
  'https://www.stpeteha.org/apply-for-housing',
  '727-323-3171',
  'Applications for the general Section 8/HCV program are accepted only when SPHA opens the waitlist. As of 2026-09-05, the waitlist is closed and SPHA is not accepting new applications.',
  'closed', now(), now()
FROM resources r
WHERE r.external_id = 'housing-spha-hcv'
ON CONFLICT (resource_id) DO UPDATE SET
  application_url                 = EXCLUDED.application_url,
  intake_phone                    = EXCLUDED.intake_phone,
  eligibility_notes               = EXCLUDED.eligibility_notes,
  waitlist_status                 = EXCLUDED.waitlist_status,
  waitlist_last_checked_at        = EXCLUDED.waitlist_last_checked_at,
  housing_details_last_checked_at = EXCLUDED.housing_details_last_checked_at,
  updated_at                      = now();

INSERT INTO resource_housing_details (
  resource_id, application_url, intake_phone, eligibility_notes,
  waitlist_status, waitlist_last_checked_at,
  housing_details_last_checked_at
)
SELECT
  r.id,
  'https://pinellashousing.com/housing_opportunities/housing_programs/waitlist.php',
  '727-443-7684',
  'PCHA administers the Housing Choice Voucher (Section 8) program. As of 2026-09-05, PCHA is not accepting new applications for the general HCV/Section 8 waitlist.',
  'closed', now(), now()
FROM resources r
WHERE r.external_id = 'housing-pcha-hcv'
ON CONFLICT (resource_id) DO UPDATE SET
  application_url                 = EXCLUDED.application_url,
  intake_phone                    = EXCLUDED.intake_phone,
  eligibility_notes               = EXCLUDED.eligibility_notes,
  waitlist_status                 = EXCLUDED.waitlist_status,
  waitlist_last_checked_at        = EXCLUDED.waitlist_last_checked_at,
  housing_details_last_checked_at = EXCLUDED.housing_details_last_checked_at,
  updated_at                      = now();

INSERT INTO resource_housing_details (
  resource_id, accepts_vouchers, income_restricted,
  application_url, intake_phone, eligibility_notes,
  waitlist_status, waitlist_last_checked_at,
  housing_details_last_checked_at
)
SELECT
  r.id,
  TRUE, TRUE,
  'https://tarponspringshousing.com/affordable-housing/',
  '727-937-4411',
  'TSHA states that it does not administer Section 8 Housing Choice Vouchers. It does state that Section 8 vouchers are accepted at specified affordable locations, and that its affordable-housing waiting lists are currently closed.',
  'closed', now(), now()
FROM resources r
WHERE r.external_id = 'housing-tsha-affordable'
ON CONFLICT (resource_id) DO UPDATE SET
  accepts_vouchers                 = EXCLUDED.accepts_vouchers,
  income_restricted                = EXCLUDED.income_restricted,
  application_url                  = EXCLUDED.application_url,
  intake_phone                     = EXCLUDED.intake_phone,
  eligibility_notes                = EXCLUDED.eligibility_notes,
  waitlist_status                  = EXCLUDED.waitlist_status,
  waitlist_last_checked_at         = EXCLUDED.waitlist_last_checked_at,
  housing_details_last_checked_at  = EXCLUDED.housing_details_last_checked_at,
  updated_at                       = now();


-- ────────────────────────────────────────────────────────────────
-- 4. Evidence / provenance
-- ────────────────────────────────────────────────────────────────

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome, source_url, source_name,
  checked_at, checked_by, notes
)
SELECT
  r.id, 'voucher_program', 'official_website', 'confirmed',
  'https://www.stpeteha.org/apply-for-housing',
  'St. Petersburg Housing Authority', now(), 'StreetRise migration 058',
  'Official SPHA page identifies Section 8/HCV as a housing-assistance program.'
FROM resources r
WHERE r.external_id = 'housing-spha-hcv'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'voucher_program'
      AND e.source_url = 'https://www.stpeteha.org/apply-for-housing'
  );

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome, source_url, source_name,
  checked_at, checked_by, notes
)
SELECT
  r.id, 'waitlist_status', 'official_website', 'confirmed',
  'https://www.stpeteha.org/apply-for-housing',
  'St. Petersburg Housing Authority', now(), 'StreetRise migration 058',
  'Official SPHA page states that the general Section 8/HCV waitlist is currently closed and new applications are not being accepted.'
FROM resources r
WHERE r.external_id = 'housing-spha-hcv'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'waitlist_status'
      AND e.source_url = 'https://www.stpeteha.org/apply-for-housing'
  );

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome, source_url, source_name,
  checked_at, checked_by, notes
)
SELECT
  r.id, 'voucher_program', 'official_website', 'confirmed',
  'https://pinellashousing.com/departments/what_we_do/index.php',
  'Pinellas County Housing Authority', now(), 'StreetRise migration 058',
  'Official PCHA page identifies its HCV program as Housing Choice Voucher / Section 8 rental assistance.'
FROM resources r
WHERE r.external_id = 'housing-pcha-hcv'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'voucher_program'
      AND e.source_url = 'https://pinellashousing.com/departments/what_we_do/index.php'
  );

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome, source_url, source_name,
  checked_at, checked_by, notes
)
SELECT
  r.id, 'waitlist_status', 'official_website', 'confirmed',
  'https://pinellashousing.com/housing_opportunities/housing_programs/waitlist.php',
  'Pinellas County Housing Authority', now(), 'StreetRise migration 058',
  'Official PCHA waitlist page states that the general HCV/Section 8 waitlist is closed to new applications.'
FROM resources r
WHERE r.external_id = 'housing-pcha-hcv'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'waitlist_status'
      AND e.source_url = 'https://pinellashousing.com/housing_opportunities/housing_programs/waitlist.php'
  );

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome, source_url, source_name,
  checked_at, checked_by, notes
)
SELECT
  r.id, 'accepts_vouchers', 'official_website', 'confirmed',
  'https://tarponspringshousing.com/affordable-housing/',
  'Tarpon Springs Housing Authority', now(), 'StreetRise migration 058',
  'Official TSHA page says it does not administer Section 8 HCV vouchers but does accept Section 8 vouchers at specified affordable locations.'
FROM resources r
WHERE r.external_id = 'housing-tsha-affordable'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'accepts_vouchers'
      AND e.source_url = 'https://tarponspringshousing.com/affordable-housing/'
  );

INSERT INTO resource_evidence (
  resource_id, claim_field, method, outcome, source_url, source_name,
  checked_at, checked_by, notes
)
SELECT
  r.id, 'waitlist_status', 'official_website', 'confirmed',
  'https://tarponspringshousing.com/affordable-housing/',
  'Tarpon Springs Housing Authority', now(), 'StreetRise migration 058',
  'Official TSHA page states its affordable-housing waiting lists are closed.'
FROM resources r
WHERE r.external_id = 'housing-tsha-affordable'
  AND NOT EXISTS (
    SELECT 1 FROM resource_evidence e
    WHERE e.resource_id = r.id
      AND e.claim_field = 'waitlist_status'
      AND e.source_url = 'https://tarponspringshousing.com/affordable-housing/'
  );
