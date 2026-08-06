-- ================================================================
-- StreetRise — Migration 032: South Florida Seed (Miami-Dade + South Broward)
--
-- APPLIED TO LIVE 2026-08-06 (project mldatfcwnmvrmxumzxyb).
-- Verified after apply: 31 providers, 35 resources, 12 work_exchanges,
-- 34 rows visible to the anon role through RLS. Re-running is safe —
-- every INSERT is ON CONFLICT (id) DO NOTHING and the IDs are stable
-- uuid5 values, so a second run is a no-op.
--
-- First coverage outside the Tampa Bay / Central Florida corridor.
-- Before this migration the live DB had ZERO resources south of
-- Bradenton; every existing row is Tampa Bay, Polk, Hernando, Pasco,
-- Manatee, or Orlando/Osceola.
--
-- Adds:
--   31 providers      (verified, user_id NULL — same pattern as 008/020)
--   35 resources      (34 map-ready + 1 confidential-address hotline)
--   12 work_exchanges (volunteer + skills roles, read by /work)
--
-- Coverage:
--   Miami-Dade — Miami, Overtown, Wynwood, Little Haiti, Hialeah,
--                Miami Beach, North Miami, Homestead, Florida City,
--                Cutler Bay, Doral/Airport West
--   S. Broward — Hollywood, Pembroke Park, Plantation, Fort Lauderdale
--
-- ── Sourcing ──────────────────────────────────────────────────
-- Every address, phone, and website below was read off the org's own
-- site or a public service directory in Aug 2026. Nothing here was
-- confirmed by phone, so resources are seeded verification_status =
-- 'pending' → they render with the amber "Community Listed" badge.
-- Staff flips a row to 'verified' ("Staff Verified", blue) in
-- AdminResources only after an actual phone check.
--
-- Providers are seeded 'verified' because public RLS only exposes
-- verified providers, and /work joins providers to render the org
-- name + "Apply on Website" button. This mirrors migrations 008/020.
--
-- ── Geocoding ─────────────────────────────────────────────────
-- All coordinates from the US Census Bureau geocoder (Public_AR
-- Census2020 / Current benchmarks), street-range interpolated.
-- Two are block-level rather than exact — flagged inline below and
-- carried in geocode_quality:
--   • Chapman Partnership Homestead — TIGER has SW 124th PL, not CT
--   • Feeding South Florida        — 2501 sits just below the
--                                    2503–2599 SW 32nd Ter range
--
-- ── Public map query requires ─────────────────────────────────
--   is_active = true
--   AND verification_status IN ('verified','pending')
--   AND is_map_ready = true
--   AND lat IS NOT NULL AND lng IS NOT NULL
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. PROVIDERS
-- ════════════════════════════════════════════════════════════════
-- `website` is what the /work page uses for its "Apply on Website"
-- CTA, so orgs that carry a work_exchange row below point at their
-- volunteer page. Orgs without one point at their homepage. The
-- resource rows in section 2 carry the org homepage independently,
-- so the map detail page always links somewhere useful.
--
-- `contact_email` is NOT NULL. Where no public org-level address was
-- published we use the same `*.placeholder` convention migration 020
-- established rather than inventing a plausible-looking address.

INSERT INTO providers (
  id, user_id, organization_name, contact_name, contact_email,
  contact_phone, website, verification_status, role
) VALUES

  -- ── Miami-Dade ────────────────────────────────────────────────
  ('a533d993-ae72-5c18-9c9b-a1bd868d71d9', NULL, 'Camillus House', 'Volunteer Engagement',
   'volunteer@camillus_house.placeholder', '(305) 374-1065',
   'https://www.camillus.org/ways-to-help/volunteer-opportunities/', 'verified', 'provider'),

  ('f6afa82f-40bc-5f8d-9774-8a9a65223a8e', NULL, 'Chapman Partnership', 'Client Services',
   'contact@chapman_partnership.placeholder', '(305) 329-3000',
   'https://chapmanpartnership.org/', 'verified', 'provider'),

  ('5bfc6798-13df-5b33-b0dd-b9026f7a43da', NULL, 'Lotus House Women''s Shelter', 'Volunteer Services',
   'volunteering@lotushouse.org', '(305) 438-0556',
   'https://www.lotushouse.org/volunteering/', 'verified', 'provider'),

  ('ad03cbd5-1ce1-5cc7-89d6-f0a338937891', NULL, 'Miami Rescue Mission / Broward Outreach Centers', 'Volunteer Services',
   'volunteer@miami_rescue_mission.placeholder', '(305) 571-2211',
   'https://caringplace.org/', 'verified', 'provider'),

  ('6a7e59a7-240c-501d-9c41-54cfc4da1219', NULL, 'Camillus Health Concern', 'Patient Services',
   'contact@camillus_health.placeholder', '(305) 577-4840',
   'https://camillushealth.org/', 'verified', 'provider'),

  ('5460dafb-0cc7-5e5a-8290-fb5d45787d86', NULL, 'Miami Bridge Youth & Family Services', 'Intake',
   'contact@miami_bridge.placeholder', '(305) 635-8953',
   'https://miamibridge.org/', 'verified', 'provider'),

  ('e78bd122-8865-5029-aa84-e7b66d77738b', NULL, 'Legal Services of Greater Miami', 'Intake',
   'contact@legal_services_miami.placeholder', '(305) 576-0080',
   'https://www.legalservicesmiami.org/', 'verified', 'provider'),

  ('cce7ac52-331a-58a3-a02f-02abbddf2546', NULL, 'Jessie Trice Community Health System', 'Patient Services',
   'contact@jessie_trice.placeholder', '(305) 805-1700',
   'https://www.jtchs.org/', 'verified', 'provider'),

  ('52273a3c-c60c-5e4f-ab49-9a7419c089c8', NULL, 'Community Health of South Florida', 'Patient Services',
   'contact@chi_south_florida.placeholder', '(305) 252-4820',
   'https://chisouthfl.org/', 'verified', 'provider'),

  ('a133e08c-13cc-5e68-94b4-1f686ddf0722', NULL, 'Americans for Immigrant Justice', 'Intake',
   'contact@aij_justice.placeholder', '(305) 573-1106',
   'https://aijustice.org/', 'verified', 'provider'),

  ('0ac56ce4-9e87-5823-a811-b26cdcc99b5b', NULL, 'Curley''s House of Style / Hope Relief Food Bank', 'Pantry Coordinator',
   'contact@curleys_house.placeholder', '(305) 759-9805',
   'https://curleyshousefoodbank.com/', 'verified', 'provider'),

  ('7d27ec73-0ccd-5a3b-af02-aaeda7f20338', NULL, 'Farm Share', 'Volunteer Services',
   'information@farmshare.org', '(305) 246-3276',
   'https://www.farmshare.org/become-a-volunteer', 'verified', 'provider'),

  ('c8338360-b3a1-5555-92fb-fb38b8ffb53a', NULL, 'Sant La Haitian Neighborhood Center', 'Client Services',
   'info@santla.org', '(305) 573-4871',
   'https://www.santla.org/', 'verified', 'provider'),

  ('a8225e85-a008-57fa-923b-73f90dadf93b', NULL, 'Citrus Health Network', 'Access Center',
   'contact@citrus_health.placeholder', '(305) 825-0300',
   'https://citrushealth.org/', 'verified', 'provider'),

  ('6df648c5-d079-56c1-8b65-7c46f99eeefa', NULL, 'Borinquen Medical Centers', 'Patient Services',
   'contact@borinquen_health.placeholder', '(305) 576-6611',
   'https://borinquenhealth.org/', 'verified', 'provider'),

  ('9c22a8ec-195b-58c3-8a2d-297d9841c325', NULL, 'Douglas Gardens Community Mental Health Center', 'Intake',
   'contact@douglas_gardens.placeholder', '(305) 531-5341',
   'https://www.dgcmhc.org/', 'verified', 'provider'),

  ('366c50c9-e064-501a-805c-bb9181a8a064', NULL, 'Branches', 'Client Services',
   'info@branchesfl.org', '(305) 442-8306',
   'https://branchesfl.org/', 'verified', 'provider'),

  -- ── South Broward / Broward ───────────────────────────────────
  ('5e22755c-e57a-5d85-871b-d198b0b0c7cd', NULL, 'Hispanic Unity of Florida', 'Client Services',
   'contact@hispanic_unity.placeholder', '(954) 964-8884',
   'https://www.hispanicunity.org/', 'verified', 'provider'),

  ('c0f17bdc-6c5b-5548-91fc-dc582132a703', NULL, 'Jubilee Center of South Broward', 'Volunteer Coordinator',
   'contact@jubilee_center.placeholder', '(954) 920-0106',
   'https://thejubileecenter.org/', 'verified', 'provider'),

  ('3a993bca-f1ae-57d4-9c8f-2fb872fb100e', NULL, 'Henderson Behavioral Health', 'Access Center',
   'contact@henderson_bh.placeholder', '(954) 921-2600',
   'https://www.hendersonbh.org/', 'verified', 'provider'),

  ('cfd9aa3e-7494-55bd-8c2c-dab0c9f0e50b', NULL, 'Memorial Healthcare System', 'Financial Assistance',
   'contact@memorial_healthcare.placeholder', '(954) 987-2000',
   'https://www.mhs.net/', 'verified', 'provider'),

  ('8da2e252-945d-554d-89cc-5564ba6d7df9', NULL, 'The Salvation Army of Broward County', 'Social Services',
   'FtLauderdaleFL@uss.salvationarmy.org', '(954) 524-6991',
   'https://fortlauderdale.salvationarmyflorida.org/', 'verified', 'provider'),

  ('b348533c-1dcb-5887-8b43-2508881272aa', NULL, 'Feeding South Florida', 'Volunteer Services',
   'volunteers@feedingsouthflorida.org', '(954) 518-1818',
   'https://feedingsouthflorida.org/volunteer/', 'verified', 'provider'),

  ('3983ccfc-a49d-5013-a315-e19662bcae00', NULL, 'HOPE South Florida', 'Client Services',
   'info@HOPESouthFlorida.org', '(954) 566-2311',
   'https://hopesouthflorida.org/', 'verified', 'provider'),

  ('d1b404bd-caab-52fe-9f96-b8d753f53fe8', NULL, 'LifeNet4Families', 'Volunteer Coordinator',
   'info@ln4f.org', '(954) 792-2328',
   'https://ln4f.org/', 'verified', 'provider'),

  ('eb81ee9b-bf15-5013-8869-531c44e56094', NULL, 'Legal Aid Service of Broward County', 'Intake',
   'contact@legal_aid_broward.placeholder', '(954) 765-8950',
   'https://www.browardlegalaid.org/', 'verified', 'provider'),

  ('b1a64181-1a3a-5352-bca5-0283f064e21c', NULL, 'Broward Partnership for the Homeless', 'Intake',
   'contact@broward_partnership.placeholder', '(954) 779-3990',
   'https://bphi.org/', 'verified', 'provider'),

  ('e042a571-6bea-51a4-a94c-08a6cee14aba', NULL, 'Broward House', 'Client Services',
   'info@browardhouse.org', '(954) 568-7373',
   'https://browardhouse.org/', 'verified', 'provider'),

  ('9a82fad7-6671-54b7-a375-8ea4873eb89a', NULL, 'The Pantry of Broward', 'Client Services',
   'contact@pantry_broward.placeholder', '(954) 358-1481',
   'https://www.thepantryofbroward.org/', 'verified', 'provider'),

  ('85f4a9f9-3543-5e8f-b970-31e5a9b7eb26', NULL, 'Habitat for Humanity of Broward', 'Volunteer Engagement',
   'volunteer@habitat_broward.placeholder', '(954) 763-7771',
   'https://habitatbroward.org/', 'verified', 'provider'),

  ('c5919cdb-733b-55dd-8386-f634ac06f3b1', NULL, 'Women In Distress of Broward County', 'Crisis Line',
   'info@womenindistress.org', '(954) 761-1133',
   'https://widbroward.org/', 'verified', 'provider')

ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- 2. RESOURCES
-- ════════════════════════════════════════════════════════════════
-- `resource_type` values below are constrained by the LIVE check
-- constraint `resources_resource_type_check`, which is NOT the list
-- documented in CLAUDE.md. Live accepts: emergency_shelter,
-- transitional_housing, food_pantry, hot_meal, shower_facility,
-- restroom_access, day_use_park, warming_cooling_center,
-- domestic_violence_shelter, veteran_housing, youth_shelter,
-- work_exchange, crisis_hotline, job_training, legal_services,
-- medical_clinic, mental_health_clinic, substance_recovery_program,
-- clothing_closet, hygiene_supplies, laundry_facility,
-- childcare_services, transportation_assistance, outreach_program,
-- other.
--
-- Every description ends by telling the reader to call and confirm.
-- These are unverified public-source listings and the copy says so —
-- no "guaranteed", no "always up to date", no promise of a bed.

INSERT INTO resources (
  id, provider_id, name, description, category, subcategory, resource_type,
  address, lat, lng, geocode_quality, access_type, is_map_ready,
  phone, email, website,
  availability_status, beds_total, beds_available,
  walk_ins_accepted, requires_id, requires_referral,
  gender_policy, population_focus,
  serves_meals, has_showers, has_restrooms, has_laundry,
  wheelchair_accessible, public_transit_accessible, overnight_allowed,
  hours_of_operation, languages_spoken, tags,
  import_batch_id, source_file, last_imported_at,
  verification_status, is_active
) VALUES

  -- ══ MIAMI-DADE — SHELTER ═════════════════════════════════════

  ('563e423e-e847-50ab-b4ec-2a97f51f4119', 'a533d993-ae72-5c18-9c9b-a1bd868d71d9',
   'Camillus House — Emergency Shelter & Day Services',
   'Miami''s broadest homeless-services campus: emergency, transitional, and permanent housing plus meals, showers, clothing, job training, counseling, and on-site medical care. Serves men, women, and children. Call the intake line before arriving — bed availability changes daily and is not shown here. Listing built from public information; call to confirm intake hours.',
   'shelter', 'emergency_shelter', 'emergency_shelter',
   '{"street": "1603 NW 7th Ave", "city": "Miami", "state": "FL", "zip": "33136"}'::jsonb,
   25.7907, -80.2069, 'rooftop', 'onsite', TRUE,
   '(877) 994-4357', NULL, 'https://www.camillus.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'gender_inclusive', '{}',
   TRUE, TRUE, TRUE, FALSE,
   TRUE, TRUE, TRUE,
   '{"summary": "Office Mon-Fri 8 AM-5 PM; shelter operates 24/7 (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{shelter,meals,showers,clothing,job training}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('8d907222-5367-5358-acbe-ddbcb4582e1c', 'f6afa82f-40bc-5f8d-9774-8a9a65223a8e',
   'Chapman Partnership — Downtown Miami Homeless Assistance Center',
   'Homeless Assistance Center run as the private-sector partner of the Miami-Dade County Homeless Trust. Emergency shelter with wraparound case management, job placement, childcare, and health services on one campus. Entry is generally by referral through the Homeless Trust — call before going. Listing built from public information; call to confirm intake.',
   'shelter', 'emergency_shelter', 'emergency_shelter',
   '{"street": "1550 N Miami Ave", "city": "Miami", "state": "FL", "zip": "33136"}'::jsonb,
   25.7900, -80.1947, 'rooftop', 'onsite', TRUE,
   '(305) 329-3000', NULL, 'https://chapmanpartnership.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   'gender_inclusive', '{families}',
   TRUE, TRUE, TRUE, TRUE,
   TRUE, TRUE, TRUE,
   '{"summary": "Office Mon-Fri 8 AM-5 PM; campus operates 24/7 (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{shelter,case management,families,meals}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- Geocode note: TIGER carries this block as SW 124th PL, not CT.
  -- Pin is block-accurate (~100 m), not rooftop.
  ('bcb1acca-d33b-5321-82fc-73ada65cf8be', 'f6afa82f-40bc-5f8d-9774-8a9a65223a8e',
   'Chapman Partnership — Homestead Homeless Assistance Center',
   'South Miami-Dade Homeless Assistance Center serving the Homestead and Florida City area with emergency shelter, case management, and support services. Entry is generally by referral through the Miami-Dade Homeless Trust — call before going. Listing built from public information; call to confirm intake.',
   'shelter', 'emergency_shelter', 'emergency_shelter',
   '{"street": "28205 SW 124th Ct", "city": "Homestead", "state": "FL", "zip": "33033"}'::jsonb,
   25.5055, -80.3934, 'street_block', 'onsite', TRUE,
   '(305) 329-3000', NULL, 'https://chapmanpartnership.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   'gender_inclusive', '{families}',
   TRUE, TRUE, TRUE, TRUE,
   TRUE, FALSE, TRUE,
   '{"summary": "Office Mon-Fri 8 AM-5 PM; campus operates 24/7 (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{shelter,case management,families,south dade}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('ab372b01-9e49-57a2-b4da-b98ca43feabe', '5bfc6798-13df-5b33-b0dd-b9026f7a43da',
   'Lotus House Women''s Shelter',
   'Shelter in Overtown for women, youth, and children — housing plus meals, health and wellness care, childcare, job-readiness and life-skills programming. Operates 24/7, year round. Call or email the shelter line before arriving to check space. Listing built from public information; call to confirm intake.',
   'shelter', 'emergency_shelter', 'emergency_shelter',
   '{"street": "217 NW 15th St", "city": "Miami", "state": "FL", "zip": "33136"}'::jsonb,
   25.7896, -80.1990, 'rooftop', 'onsite', TRUE,
   '(305) 438-0556', 'needshelter@lotushouse.org', 'https://www.lotushouse.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'women_only', '{families,pregnant_women}',
   TRUE, TRUE, TRUE, TRUE,
   TRUE, TRUE, TRUE,
   '{"summary": "Intake line 6 AM-9 PM daily; shelter operates 24/7 (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{shelter,women,children,meals,childcare}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('47078d12-3dfb-5986-82e0-fc24adf3f0df', 'ad03cbd5-1ce1-5cc7-89d6-f0a338937891',
   'Miami Rescue Mission — Center for Men',
   'Emergency overnight shelter for men, plus a long-term residential recovery and job-training program. Walk-in hours for food and showers are posted as Mon, Wed, Fri, and Sat afternoons. Call to confirm current walk-in times and overnight space before you go. Listing built from public information.',
   'shelter', 'emergency_shelter', 'emergency_shelter',
   '{"street": "2020 NW 1st Ave", "city": "Miami", "state": "FL", "zip": "33127"}'::jsonb,
   25.7958, -80.1968, 'rooftop', 'onsite', TRUE,
   '(305) 571-2211', NULL, 'https://caringplace.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'men_only', '{substance_recovery}',
   TRUE, TRUE, TRUE, FALSE,
   FALSE, TRUE, TRUE,
   '{"summary": "Walk-in for food & showers Mon, Wed, Fri, Sat 3-5:30 PM (call to confirm)"}'::jsonb,
   '{English,Spanish}',
   '{shelter,men,meals,showers,recovery}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('20dd329a-547b-5906-b090-80588bc4d24e', 'ad03cbd5-1ce1-5cc7-89d6-f0a338937891',
   'Miami Rescue Mission — Center for Women and Children',
   'Emergency overnight shelter and long-term recovery programming for women and children, two blocks north of the Center for Men. Call ahead to check availability — space for families is limited. Listing built from public information; call to confirm intake hours.',
   'shelter', 'emergency_shelter', 'emergency_shelter',
   '{"street": "2250 NW 1st Ave", "city": "Miami", "state": "FL", "zip": "33127"}'::jsonb,
   25.7986, -80.1969, 'rooftop', 'onsite', TRUE,
   '(305) 571-2250', NULL, 'https://caringplace.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'women_only', '{families,substance_recovery}',
   TRUE, TRUE, TRUE, FALSE,
   FALSE, TRUE, TRUE,
   '{"summary": "Call for intake hours"}'::jsonb,
   '{English,Spanish}',
   '{shelter,women,children,meals,recovery}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('c8f26966-0050-5ad3-98e3-8e63bfbda6d4', '5460dafb-0cc7-5e5a-8290-fb5d45787d86',
   'Miami Bridge — Youth Emergency Shelter (Miami Campus)',
   'Emergency shelter and crisis care for runaway, homeless, and at-risk youth ages 10-17, staffed 24 hours a day. Also serves families in crisis with counseling and reunification support. Intake line answers around the clock. Listing built from public information; call to confirm.',
   'shelter', 'youth_shelter', 'youth_shelter',
   '{"street": "2810 NW South River Dr", "city": "Miami", "state": "FL", "zip": "33125"}'::jsonb,
   25.7933, -80.2414, 'rooftop', 'onsite', TRUE,
   '(305) 635-8953', NULL, 'https://miamibridge.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'youth_only', '{young_adults}',
   TRUE, TRUE, TRUE, TRUE,
   FALSE, TRUE, TRUE,
   '{"summary": "24 hours a day, 7 days a week"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{shelter,youth,crisis,ages 10-17}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('4b2d1b49-40bb-5131-83bd-e61d7bf9673b', '5460dafb-0cc7-5e5a-8290-fb5d45787d86',
   'Miami Bridge — Youth Emergency Shelter (Homestead Campus)',
   'South Dade emergency shelter for youth in crisis ages 10-17, with counseling and family reunification services. Staffed 24 hours. Call the campus line before arriving. Listing built from public information; call to confirm.',
   'shelter', 'youth_shelter', 'youth_shelter',
   '{"street": "326 NW 3rd Ave", "city": "Homestead", "state": "FL", "zip": "33030"}'::jsonb,
   25.4728, -80.4826, 'rooftop', 'onsite', TRUE,
   '(305) 246-8956', NULL, 'https://miamibridge.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'youth_only', '{young_adults}',
   TRUE, TRUE, TRUE, TRUE,
   FALSE, FALSE, TRUE,
   '{"summary": "24 hours a day, 7 days a week"}'::jsonb,
   '{English,Spanish}',
   '{shelter,youth,crisis,south dade}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- ══ MIAMI-DADE — HEALTH ══════════════════════════════════════

  ('aba21f37-098c-5be5-a5e5-10cc91562d83', '6a7e59a7-240c-501d-9c41-54cfc4da1219',
   'Camillus Health Concern — Community Health Center',
   'Non-profit health center built specifically for people who are homeless or living on low income in Miami-Dade: primary care, dental, behavioral health, health education, and specialty referrals. Ability to pay is not a barrier. Call for an appointment — walk-in capacity varies. Listing built from public information; call to confirm services.',
   'healthcare', 'community_health_center', 'medical_clinic',
   '{"street": "336 NW 5th St", "city": "Miami", "state": "FL", "zip": "33128"}'::jsonb,
   25.7787, -80.2006, 'rooftop', 'onsite', TRUE,
   '(305) 577-4840', NULL, 'https://camillushealth.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'gender_inclusive', '{}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Primary care & behavioral health Mon/Thu/Fri 7 AM-5 PM, Tue/Wed 7 AM-7 PM; dental Mon-Fri 7 AM-4:30 PM"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{medical,dental,behavioral health,sliding scale}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('68c2d7ab-41fb-5104-bfe7-bdf24dcefb6f', 'cce7ac52-331a-58a3-a02f-02abbddf2546',
   'Jessie Trice Community Health System — Main Health Center',
   'Federally Qualified Health Center serving Miami-Dade with primary care, pediatrics, OB/GYN, dental, and behavioral health on a sliding fee scale. Insured and uninsured patients both accepted. Additional clinic sites operate across the county — call or check the website for the nearest one. Listing built from public information; call to confirm.',
   'healthcare', 'community_health_center', 'medical_clinic',
   '{"street": "5607 NW 27th Ave", "city": "Miami", "state": "FL", "zip": "33142"}'::jsonb,
   25.8258, -80.2408, 'rooftop', 'onsite', TRUE,
   '(305) 805-1700', NULL, 'https://www.jtchs.org/',
   'unknown', NULL, NULL,
   FALSE, TRUE, FALSE,
   'gender_inclusive', '{}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Call for clinic hours"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{medical,dental,FQHC,sliding scale}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('43bb0e0b-20bc-5b9a-9769-9e6cd16337fa', '52273a3c-c60c-5e4f-ab49-9a7419c089c8',
   'Community Health of South Florida — Doris Ison Health Center',
   'South Dade''s main community health center: primary care, pediatrics, dental, OB/GYN, adult and pediatric behavioral health, pharmacy, lab, and radiology, plus walk-in and urgent care. Sliding fee scale; free prescription delivery and transportation are offered. Listing built from public information; call to confirm hours and eligibility.',
   'healthcare', 'community_health_center', 'medical_clinic',
   '{"street": "10300 SW 216th St", "city": "Cutler Bay", "state": "FL", "zip": "33190"}'::jsonb,
   25.5666, -80.3594, 'rooftop', 'onsite', TRUE,
   '(305) 252-4824', NULL, 'https://chisouthfl.org/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   'gender_inclusive', '{}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Mon-Fri 8:30 AM-5 PM; walk-in Mon-Sat 8 AM-2 PM; urgent care daily 2-10 PM (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{medical,dental,urgent care,FQHC,sliding scale}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('2db8484a-4fa5-5b98-86a7-353941b8510d', '6df648c5-d079-56c1-8b65-7c46f99eeefa',
   'Borinquen Medical Centers — Main Health Center',
   'Federally Qualified Health Center that grew out of a Wynwood community clinic in 1972. Primary care, dental, behavioral health, HIV services, and pediatrics on a sliding fee scale across several Miami-Dade sites. Listing built from public information; call to confirm which site offers the service you need.',
   'healthcare', 'community_health_center', 'medical_clinic',
   '{"street": "3601 Federal Hwy", "city": "Miami", "state": "FL", "zip": "33137"}'::jsonb,
   25.8106, -80.1907, 'rooftop', 'onsite', TRUE,
   '(305) 576-6611', NULL, 'https://borinquenhealth.org/',
   'unknown', NULL, NULL,
   FALSE, TRUE, FALSE,
   'gender_inclusive', '{hiv_aids}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Call for clinic hours"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{medical,dental,behavioral health,FQHC,sliding scale}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('6540c050-4773-5a20-a67f-876487892fb9', 'a8225e85-a008-57fa-923b-73f90dadf93b',
   'Citrus Health Network — Hialeah Main Center',
   'Non-profit community mental health center serving Hialeah and Miami-Dade since 1979: outpatient psychiatry, counseling, medication management, and assessment/emergency services, alongside primary care and maternal-child health at nearby sites. Listing built from public information; call to confirm intake and current wait times.',
   'mental_health', 'community_mental_health', 'mental_health_clinic',
   '{"street": "4175 W 20th Ave", "city": "Hialeah", "state": "FL", "zip": "33012"}'::jsonb,
   25.8597, -80.3223, 'rooftop', 'onsite', TRUE,
   '(305) 825-0300', NULL, 'https://citrushealth.org/',
   'unknown', NULL, NULL,
   FALSE, TRUE, FALSE,
   'gender_inclusive', '{mental_health}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Call for clinic hours"}'::jsonb,
   '{English,Spanish}',
   '{mental health,counseling,psychiatry}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('6355d258-a03d-556f-bc28-9a5e1a7d5a0f', '9c22a8ec-195b-58c3-8a2d-297d9841c325',
   'Douglas Gardens Community Mental Health Center — Miami Beach',
   'Community mental health center serving Miami Beach and north Miami-Dade with outpatient counseling, psychiatric care, and case management, including services for older adults. Listing built from public information; call to confirm intake and insurance accepted.',
   'mental_health', 'community_mental_health', 'mental_health_clinic',
   '{"street": "1680 Meridian Ave, Suite 501", "city": "Miami Beach", "state": "FL", "zip": "33139"}'::jsonb,
   25.7914, -80.1367, 'rooftop', 'onsite', TRUE,
   '(305) 531-5341', NULL, 'https://www.dgcmhc.org/',
   'unknown', NULL, NULL,
   FALSE, TRUE, FALSE,
   'gender_inclusive', '{seniors,mental_health}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Call for clinic hours"}'::jsonb,
   '{English,Spanish}',
   '{mental health,counseling,seniors}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- ══ MIAMI-DADE — FOOD ════════════════════════════════════════

  ('424913bc-f6f3-5c1b-9b79-6ded3fb1a23c', '0ac56ce4-9e87-5823-a811-b26cdcc99b5b',
   'Curley''s House of Style — Hope Relief Food Bank',
   'Neighborhood food bank in Liberty City distributing groceries and fresh produce to families and seniors. Open Tuesday through Friday, mid-morning to mid-afternoon. Call ahead — distribution days and supply can change week to week. Listing built from public information.',
   'food', 'food_pantry', 'food_pantry',
   '{"street": "6025 NW 6th Ct", "city": "Miami", "state": "FL", "zip": "33127"}'::jsonb,
   25.8307, -80.2073, 'rooftop', 'onsite', TRUE,
   '(305) 759-9805', NULL, 'https://curleyshousefoodbank.com/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'gender_inclusive', '{families,seniors}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, TRUE, NULL,
   '{"summary": "Tue-Fri 10 AM-3 PM (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{food pantry,groceries,produce}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('08eb0fb7-b36b-5f4a-842b-f7575cc76a2d', '7d27ec73-0ccd-5a3b-af02-aaeda7f20338',
   'Farm Share — Homestead Warehouse',
   'Florida''s largest independent food bank, headquartered in Homestead. Runs free drive-through and walk-up food distributions across the state and supplies a network of local pantries with fresh produce and groceries — no cost, no application. Distribution locations and dates change constantly: check the schedule on farmshare.org or call before travelling.',
   'food', 'food_bank', 'food_pantry',
   '{"street": "14125 SW 320th St", "city": "Homestead", "state": "FL", "zip": "33033"}'::jsonb,
   25.4702, -80.4205, 'rooftop', 'onsite', TRUE,
   '(305) 246-3276', 'Information@farmshare.org', 'https://www.farmshare.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'gender_inclusive', '{families}',
   FALSE, FALSE, FALSE, FALSE,
   TRUE, FALSE, NULL,
   '{"summary": "Warehouse Mon-Fri; distribution dates vary — check farmshare.org"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{food bank,produce,free distribution}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- ══ MIAMI-DADE — LEGAL ═══════════════════════════════════════

  ('c25b7cd3-03b2-57eb-8f76-47e4b2676089', 'e78bd122-8865-5029-aa84-e7b66d77738b',
   'Legal Services of Greater Miami — Main Office',
   'Non-profit law firm providing free civil legal help to low-income residents of Miami-Dade and Monroe counties — housing and eviction, public benefits, family, consumer, and disaster cases. No cost for services; eligibility is checked during intake. Apply by phone or through the website. Listing built from public information.',
   'legal_aid', 'civil_legal_aid', 'legal_services',
   '{"street": "4343 W Flagler St, Suite 100", "city": "Miami", "state": "FL", "zip": "33134"}'::jsonb,
   25.7717, -80.2665, 'rooftop', 'onsite', TRUE,
   '(305) 576-0080', NULL, 'https://www.legalservicesmiami.org/',
   'unknown', NULL, NULL,
   FALSE, TRUE, FALSE,
   'gender_inclusive', '{}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Mon-Fri business hours; apply by phone or online (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{legal aid,eviction,benefits,free}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('998f33ca-b555-5e8c-b71d-f027844fae44', 'a133e08c-13cc-5e68-94b4-1f686ddf0722',
   'Americans for Immigrant Justice',
   'Non-profit immigration law firm offering direct legal representation to immigrants in South Florida, including survivors of domestic violence and trafficking, detained adults, and unaccompanied children. Services in English and Spanish. Call during office hours to ask about intake — capacity is limited. Listing built from public information.',
   'legal_aid', 'immigration_legal', 'legal_services',
   '{"street": "6355 NW 36th St, Suite 2201", "city": "Miami", "state": "FL", "zip": "33166"}'::jsonb,
   25.8074, -80.2996, 'rooftop', 'onsite', TRUE,
   '(305) 573-1106', NULL, 'https://aijustice.org/',
   'unknown', NULL, NULL,
   FALSE, TRUE, FALSE,
   'gender_inclusive', '{domestic_violence}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, FALSE, NULL,
   '{"summary": "Mon-Fri 9 AM-5 PM"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{legal aid,immigration,free}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- ══ MIAMI-DADE — OUTREACH / FAMILY SERVICES ══════════════════

  ('f4b609d0-f1b4-5143-a762-13d776bcb43d', 'c8338360-b3a1-5555-92fb-fb38b8ffb53a',
   'Sant La Haitian Neighborhood Center',
   'Neighborhood resource center for the Haitian and Haitian-American community in North Miami: emergency assistance, benefits and immigration application help, job-skills support, financial literacy, and referrals. Services in Haitian Creole, French, English, and Spanish. Listing built from public information; call to confirm hours.',
   'outreach', 'neighborhood_center', 'outreach_program',
   '{"street": "13450 W Dixie Hwy", "city": "North Miami", "state": "FL", "zip": "33161"}'::jsonb,
   25.8993, -80.1793, 'rooftop', 'onsite', TRUE,
   '(305) 573-4871', 'info@santla.org', 'https://www.santla.org/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   'gender_inclusive', '{families}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Mon-Thu 9 AM-6 PM; Fri 9 AM-2 PM"}'::jsonb,
   '{Haitian Creole,French,English,Spanish}',
   '{outreach,benefits,immigration help,job skills}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('3a729367-f236-545c-aad4-080a92cc1076', '366c50c9-e064-501a-805c-bb9181a8a064',
   'Branches — North Dade Center',
   'Family stability center offering free tax preparation, financial coaching, benefits screening, and youth after-school and college-readiness programming. Listing built from public information; call to confirm program schedules and eligibility.',
   'outreach', 'family_services', 'outreach_program',
   '{"street": "11500 NW 12th Ave", "city": "Miami", "state": "FL", "zip": "33168"}'::jsonb,
   25.8798, -80.2186, 'rooftop', 'onsite', TRUE,
   '(305) 442-8306', 'info@branchesfl.org', 'https://branchesfl.org/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   'gender_inclusive', '{families,young_adults}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Mon-Fri 8:30 AM-5:30 PM (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{free tax prep,financial coaching,youth programs}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('80115f86-f77d-5739-97cf-33b37e9cc257', '366c50c9-e064-501a-805c-bb9181a8a064',
   'Branches — South Dade Center',
   'Florida City site offering the same family stability services as the North Dade center: free tax preparation, financial coaching, benefits screening, and youth programming for the Homestead and Florida City area. Listing built from public information; call to confirm program schedules.',
   'outreach', 'family_services', 'outreach_program',
   '{"street": "129 SW 5th Ave", "city": "Florida City", "state": "FL", "zip": "33034"}'::jsonb,
   25.4464, -80.4833, 'rooftop', 'onsite', TRUE,
   '(305) 442-8306', 'info@branchesfl.org', 'https://branchesfl.org/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   'gender_inclusive', '{families,young_adults}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, FALSE, NULL,
   '{"summary": "Mon-Fri business hours (call to confirm)"}'::jsonb,
   '{English,Spanish}',
   '{free tax prep,financial coaching,youth programs,south dade}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- ══ SOUTH BROWARD — HOLLYWOOD ════════════════════════════════

  ('87accdbb-d830-5f28-bd4d-c5b9bc8408a6', 'ad03cbd5-1ce1-5cc7-89d6-f0a338937891',
   'Broward Outreach Center — Hollywood',
   'The Miami Rescue Mission''s Hollywood campus (also known as The Caring Place): emergency shelter for men, women, and children, plus meals, showers, job training, computer and education classes, health care, and transitional housing. Call before arriving to check space. Listing built from public information; call to confirm intake hours.',
   'shelter', 'emergency_shelter', 'emergency_shelter',
   '{"street": "2056 Scott St", "city": "Hollywood", "state": "FL", "zip": "33020"}'::jsonb,
   26.0298, -80.1486, 'rooftop', 'onsite', TRUE,
   '(954) 926-7417', NULL, 'https://caringplace.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'gender_inclusive', '{families,substance_recovery}',
   TRUE, TRUE, TRUE, TRUE,
   FALSE, TRUE, TRUE,
   '{"summary": "Call for intake hours; shelter operates 24/7"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{shelter,meals,showers,job training,hollywood}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('f7bf7b9e-1c3d-542e-819d-1128140089dd', 'c0f17bdc-6c5b-5548-91fc-dc582132a703',
   'Jubilee Center of South Broward — Soup Kitchen & Day Services',
   'Free hot lunch served daily around 11 AM to roughly 150 people, no questions asked. Also offers a clothing closet, hygiene kits, emergency groceries, help applying for food stamps and Medicaid, ID assistance, and legal aid referrals. Listing built from public information; call to confirm today''s meal time.',
   'food', 'soup_kitchen', 'hot_meal',
   '{"street": "2020 Scott St", "city": "Hollywood", "state": "FL", "zip": "33020"}'::jsonb,
   26.0298, -80.1479, 'rooftop', 'onsite', TRUE,
   '(954) 920-0106', NULL, 'https://thejubileecenter.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'gender_inclusive', '{}',
   TRUE, FALSE, TRUE, FALSE,
   FALSE, TRUE, NULL,
   '{"summary": "Hot lunch served daily around 11 AM (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{hot meals,clothing,hygiene,benefits help,hollywood}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('f4fa5bcf-515e-59ea-8556-3f93a8bdd972', '5e22755c-e57a-5d85-871b-d198b0b0c7cd',
   'Hispanic Unity of Florida — Hollywood One-Stop Center',
   'One-stop center in Hollywood offering services in three languages: job-readiness and employment support, free tax preparation, ESOL and citizenship classes, small-business coaching, immigration consultations, early childhood education, and after-school youth programs. Listing built from public information; call to confirm program schedules and eligibility.',
   'employment', 'workforce_services', 'job_training',
   '{"street": "5840 Johnson St", "city": "Hollywood", "state": "FL", "zip": "33021"}'::jsonb,
   26.0177, -80.2047, 'rooftop', 'onsite', TRUE,
   '(954) 964-8884', NULL, 'https://www.hispanicunity.org/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   'gender_inclusive', '{families}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Mon-Fri 8:30 AM-5 PM"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{employment,ESOL,citizenship,free tax prep,hollywood}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('5daa3751-6e8c-568d-898b-7c211eabaf76', '3a993bca-f1ae-57d4-9c8f-2fb872fb100e',
   'Henderson Behavioral Health — South Broward (Hollywood)',
   'Outpatient mental health and substance use services for South Broward: psychiatric evaluation, medication management, counseling, and case management. Henderson also runs a 24/7 mobile crisis response team for adults and youth at (954) 463-0911 and a walk-in Centralized Receiving Center for adults 18+ at (954) 606-0911. Listing built from public information; call to confirm intake.',
   'mental_health', 'community_mental_health', 'mental_health_clinic',
   '{"street": "1957 Jackson St", "city": "Hollywood", "state": "FL", "zip": "33020"}'::jsonb,
   26.0087, -80.1461, 'rooftop', 'onsite', TRUE,
   '(954) 921-2600', NULL, 'https://www.hendersonbh.org/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   'gender_inclusive', '{mental_health,substance_recovery}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Clinic Mon-Fri business hours; mobile crisis team 24/7 at (954) 463-0911"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{mental health,crisis,counseling,hollywood}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('c45be859-6a7a-521e-9934-ea91cc9dbd80', 'cfd9aa3e-7494-55bd-8c2c-dab0c9f0e50b',
   'Memorial Regional Hospital — Emergency & Financial Assistance',
   'Public safety-net hospital in Hollywood with a 24-hour emergency department and Level I Trauma Center. Memorial runs a financial assistance program for patients who cannot pay — reach that team at (954) 276-5501, Mon-Fri 9 AM-7 PM and Sat 9 AM-1 PM. The ER treats emergencies regardless of ability to pay. Listing built from public information.',
   'healthcare', 'hospital', 'medical_clinic',
   '{"street": "3501 Johnson St", "city": "Hollywood", "state": "FL", "zip": "33021"}'::jsonb,
   26.0183, -80.1799, 'rooftop', 'onsite', TRUE,
   '(954) 987-2000', NULL, 'https://www.mhs.net/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'gender_inclusive', '{}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Emergency department 24/7; financial assistance Mon-Fri 9 AM-7 PM, Sat 9 AM-1 PM"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{hospital,emergency,trauma,financial assistance,hollywood}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('2a148859-e3bb-51a3-873e-31553146029c', '8da2e252-945d-554d-89cc-5564ba6d7df9',
   'The Salvation Army — Hollywood Corps Community Center',
   'Emergency assistance in South Broward: food, clothing, and one-time help with rent or utilities to keep households from losing housing, plus seasonal programs. Broward emergency assistance intake also runs through the county homeless helpline at (954) 563-4357. Listing built from public information; call to confirm what assistance is currently funded.',
   'outreach', 'emergency_assistance', 'outreach_program',
   '{"street": "1960 Sherman St", "city": "Hollywood", "state": "FL", "zip": "33020"}'::jsonb,
   26.0325, -80.1467, 'rooftop', 'onsite', TRUE,
   '(954) 524-6991', NULL, 'https://fortlauderdale.salvationarmyflorida.org/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   'gender_inclusive', '{families}',
   FALSE, FALSE, TRUE, FALSE,
   FALSE, TRUE, NULL,
   '{"summary": "Call for assistance intake hours"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{emergency assistance,food,clothing,rent help,hollywood}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- ══ SOUTH BROWARD — PEMBROKE PARK ════════════════════════════

  -- Geocode note: 2501 sits just below the 2503-2599 SW 32nd Ter
  -- TIGER range, so this pin is block-accurate, not rooftop.
  ('8edbeabe-25af-5dcc-b218-048315621385', 'b348533c-1dcb-5887-8b43-2508881272aa',
   'Feeding South Florida — Pembroke Park Distribution Center',
   'The largest Feeding America food bank in Florida, serving Palm Beach, Broward, Miami-Dade, and Monroe counties through a network of partner pantries and direct distributions. This warehouse is the regional hub, not a walk-up pantry — use the food locator on feedingsouthflorida.org or call to find the distribution nearest you. Listing built from public information.',
   'food', 'food_bank', 'food_pantry',
   '{"street": "2501 SW 32nd Ter", "city": "Pembroke Park", "state": "FL", "zip": "33023"}'::jsonb,
   25.9880, -80.1742, 'street_block', 'onsite', TRUE,
   '(954) 518-1818', NULL, 'https://feedingsouthflorida.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   'gender_inclusive', '{families}',
   FALSE, FALSE, FALSE, FALSE,
   TRUE, FALSE, NULL,
   '{"summary": "Warehouse Mon-Fri 8 AM-5 PM; find a distribution site at feedingsouthflorida.org"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{food bank,partner pantries,produce}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- ══ BROWARD COUNTY-WIDE (serving South Broward) ══════════════

  ('cb2d6029-3f5f-50a8-82b2-3e6d4cdd300b', '3983ccfc-a49d-5013-a315-e19662bcae00',
   'HOPE South Florida — Homeless Services',
   'Broward-wide homeless services: overnight shelter, rapid re-housing, hot meals and clothing, mobile shower services, a day respite program, case management, and help obtaining ID, employment, and permanent housing. The Broward homeless helpline is (954) 563-4357. Listing built from public information; call to confirm which programs have openings.',
   'shelter', 'homeless_services', 'transitional_housing',
   '{"street": "2701 W Cypress Creek Rd", "city": "Fort Lauderdale", "state": "FL", "zip": "33309"}'::jsonb,
   26.2027, -80.1809, 'rooftop', 'onsite', TRUE,
   '(954) 566-2311', 'info@HOPESouthFlorida.org', 'https://hopesouthflorida.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   'gender_inclusive', '{families}',
   TRUE, TRUE, TRUE, FALSE,
   TRUE, FALSE, TRUE,
   '{"summary": "Office Mon-Fri; homeless helpline (954) 563-4357"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{shelter,rapid rehousing,meals,mobile showers}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('b4577159-4d8a-5473-a329-27a2b5b1feaa', 'd1b404bd-caab-52fe-9f96-b8d753f53fe8',
   'LifeNet4Families — Community Café & Day Services',
   'Daily hot meals in the Community Café, served every morning, plus a food pantry, clothing, showers, personal care products, phone charging, vision testing and eyeglasses, and connections to health care and other services. Walk-in, no referral needed. Listing built from public information; call to confirm today''s meal hours.',
   'food', 'soup_kitchen', 'hot_meal',
   '{"street": "1 NW 33rd Ter", "city": "Fort Lauderdale", "state": "FL", "zip": "33311"}'::jsonb,
   26.1213, -80.1907, 'rooftop', 'onsite', TRUE,
   '(954) 792-2328', 'info@ln4f.org', 'https://ln4f.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   'gender_inclusive', '{}',
   TRUE, TRUE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Community Café daily 7:30-11:30 AM (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{hot meals,food pantry,showers,clothing}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('2d208359-2c8a-59b9-bf69-640fdb29195f', 'b1a64181-1a3a-5352-bca5-0283f064e21c',
   'Broward Partnership — Central Homeless Assistance Center',
   'Broward''s central Homeless Assistance Center: emergency shelter with on-site case management, health care, behavioral health, and employment services. Entry is through the Broward homeless helpline at (954) 563-4357 rather than walk-up — call that line first. Listing built from public information; call to confirm.',
   'shelter', 'emergency_shelter', 'emergency_shelter',
   '{"street": "920 NW 7th Ave", "city": "Fort Lauderdale", "state": "FL", "zip": "33311"}'::jsonb,
   26.1352, -80.1509, 'rooftop', 'onsite', TRUE,
   '(954) 779-3990', NULL, 'https://bphi.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   'gender_inclusive', '{families}',
   TRUE, TRUE, TRUE, TRUE,
   TRUE, TRUE, TRUE,
   '{"summary": "Intake via Broward homeless helpline (954) 563-4357; campus operates 24/7"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{shelter,case management,helpline intake}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('f98a5c12-32fc-5d5f-a0f2-d6e8ca342e7b', 'e042a571-6bea-51a4-a94c-08a6cee14aba',
   'Broward House — HIV Services & Housing',
   'Services for people living with or at risk of HIV in Broward County: free HIV and STI testing, medical case management, mental health counseling, medical respite care, transitional housing with 24-hour medical support, and affordable rental housing. Listing built from public information; call to confirm eligibility and current openings.',
   'healthcare', 'hiv_services', 'medical_clinic',
   '{"street": "750 SE 3rd Ave, 2nd Floor", "city": "Fort Lauderdale", "state": "FL", "zip": "33316"}'::jsonb,
   26.1126, -80.1401, 'rooftop', 'onsite', TRUE,
   '(954) 568-7373', 'info@browardhouse.org', 'https://browardhouse.org/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   'gender_inclusive', '{hiv_aids,lgbtq,substance_recovery}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Mon-Fri business hours (call to confirm)"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{HIV services,free testing,housing,counseling}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('76db8ef4-8bbc-569e-b3a4-f93520ec5562', '9a82fad7-6671-54b7-a375-8ea4873eb89a',
   'The Pantry of Broward — Senior & Grandfamily Food Pantry',
   'Monthly food box of roughly 55 pounds — including fresh fruit, vegetables, and bread — for low-income seniors 60 and over and for grandparents of any age with legal custody of their grandchildren. Client-based program, so registration is required before pickup. Listing built from public information; call to confirm eligibility and enrollment.',
   'food', 'food_pantry', 'food_pantry',
   '{"street": "2800 W State Road 84, Suite 101", "city": "Fort Lauderdale", "state": "FL", "zip": "33312"}'::jsonb,
   26.0863, -80.1764, 'street_block', 'onsite', TRUE,
   '(954) 358-1481', NULL, 'https://www.thepantryofbroward.org/',
   'unknown', NULL, NULL,
   FALSE, TRUE, FALSE,
   'gender_inclusive', '{seniors,families}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, FALSE, NULL,
   '{"summary": "Mon-Fri 8 AM-4 PM; registration required"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{food pantry,seniors,grandfamilies,monthly box}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  ('fd23b5dd-14ab-5455-997a-54f6ab60ca30', 'eb81ee9b-bf15-5013-8869-531c44e56094',
   'Legal Aid Service of Broward County',
   'Free civil legal assistance for low-income and eligible Broward residents — housing and eviction, family, consumer, benefits, and immigration matters. Eligibility is screened at intake. Listing built from public information; call to confirm intake process and current case types.',
   'legal_aid', 'civil_legal_aid', 'legal_services',
   '{"street": "491 N State Road 7", "city": "Plantation", "state": "FL", "zip": "33317"}'::jsonb,
   26.1280, -80.2023, 'street_block', 'onsite', TRUE,
   '(954) 765-8950', NULL, 'https://www.browardlegalaid.org/',
   'unknown', NULL, NULL,
   FALSE, TRUE, FALSE,
   'gender_inclusive', '{}',
   FALSE, FALSE, TRUE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Mon-Fri 9 AM-5 PM"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{legal aid,eviction,family law,free}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE),

  -- ══ CONFIDENTIAL ADDRESS — NOT MAP READY ═════════════════════
  -- Domestic-violence shelters do not publish a street address, and
  -- publishing one would put people at risk. Seeded with
  -- access_type = 'confidential_address' and is_map_ready = FALSE,
  -- so it is excluded from the public map query by design and is
  -- visible to admins only. If a phone-first surface is ever added
  -- to the app, this row is what it should read.

  ('cd236027-3968-51b7-93e8-1ce8aa5a61b6', 'c5919cdb-733b-55dd-8386-f634ac06f3b1',
   'Women In Distress of Broward County — 24-Hour Crisis Line',
   'Broward County''s state-certified domestic violence center. The 24-hour crisis line at (954) 761-1133 connects callers to emergency shelter, safety planning, individual and group counseling, and advocacy. Shelter location is confidential and is not published — call the crisis line and staff will arrange safe entry.',
   'hotline', 'domestic_violence', 'crisis_hotline',
   '{"city": "Broward County", "state": "FL"}'::jsonb,
   NULL, NULL, NULL, 'confidential_address', FALSE,
   '(954) 761-1133', 'info@womenindistress.org', 'https://widbroward.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   'gender_inclusive', '{domestic_violence,families}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, TRUE,
   '{"summary": "Crisis line answered 24 hours a day, 7 days a week"}'::jsonb,
   '{English,Spanish,Haitian Creole}',
   '{domestic violence,crisis line,24/7,confidential}',
   'south_florida_batch_1', 'migration_032', NOW(),
   'pending', TRUE)

ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- 3. WORK EXCHANGES
-- ════════════════════════════════════════════════════════════════
-- Read by /work (the WorkExchangePage queries this table directly —
-- the `work_exchange` resource category is a separate thing and never
-- appears there). Every listing below is an unpaid volunteer role
-- taken from the org's own "get involved" material, so exchange_type
-- is 'volunteering' and compensation is NULL throughout. Nothing here
-- is presented as a job or as paid work.

INSERT INTO work_exchanges (
  id, provider_id, title, description, exchange_type,
  hours_per_week, compensation, skills_required, skills_gained,
  is_active, lat, lng, address
) VALUES

  -- ── Feeding South Florida (Pembroke Park) ─────────────────────
  ('4b123d4d-e9f5-53ac-9441-ed5269b52797', 'b348533c-1dcb-5887-8b43-2508881272aa',
   'Warehouse Sort & Pack Volunteer — Pembroke Park',
   'Inspect, sort, and repack donated food at the Feeding South Florida warehouse so it can reach families across Broward and Miami-Dade. Short training is given on arrival; no experience needed. Ages 12-14 volunteer with adult supervision, 15 and up independently. Register for a shift at feedingsouthflorida.org/volunteer.',
   'volunteering',
   NULL, NULL, '{}', '{warehouse operations,food handling,teamwork}',
   TRUE, 25.9880, -80.1742,
   '{"street": "2501 SW 32nd Ter", "city": "Pembroke Park", "state": "FL", "zip": "33023"}'::jsonb),

  ('2dfaca03-28cb-5719-ad56-f43debd9ecb2', 'b348533c-1dcb-5887-8b43-2508881272aa',
   'Mobile Pantry & Senior Meal Distribution Volunteer',
   'Help hand out groceries at mobile pantry sites and deliver meals to seniors across South Florida. Outdoor work, mostly standing and lifting. Registration and a volunteer account are required before your first shift — sign up at feedingsouthflorida.org/volunteer or email volunteers@feedingsouthflorida.org.',
   'volunteering',
   NULL, NULL, '{}', '{community outreach,logistics,customer service}',
   TRUE, 25.9880, -80.1742,
   '{"street": "2501 SW 32nd Ter", "city": "Pembroke Park", "state": "FL", "zip": "33023"}'::jsonb),

  -- ── Camillus House (Miami) ────────────────────────────────────
  ('d8c23b65-f430-5115-91d8-9c3a6c4498d6', 'a533d993-ae72-5c18-9c9b-a1bd868d71d9',
   'Meal Service & Campus Volunteer — Camillus House',
   'Prepare and serve meals on the Camillus House campus, or help in the garden, warehouse, or with clerical work. Camillus also welcomes volunteers who want to teach a skill — cooking, yoga, financial literacy. An in-person orientation is held monthly, alternating between a Saturday morning and a Thursday evening. Register through the volunteer portal linked from camillus.org.',
   'volunteering',
   NULL, NULL, '{}', '{food service,community service,teaching}',
   TRUE, 25.7907, -80.2069,
   '{"street": "1603 NW 7th Ave", "city": "Miami", "state": "FL", "zip": "33136"}'::jsonb),

  -- ── Lotus House (Miami) ───────────────────────────────────────
  ('86549ad9-b576-51cc-9bac-bccedb6049ef', '5bfc6798-13df-5b33-b0dd-b9026f7a43da',
   'Meal Service Volunteer — Lotus House',
   'Serve meals to the women, youth, and children sheltered at Lotus House in Overtown, and help with supply-closet organization, inventory, gardening, and other on-site projects. All volunteers create an account on the shelter''s volunteer platform and complete waivers before scheduling — start at lotushouse.org/volunteering.',
   'volunteering',
   NULL, NULL, '{}', '{food service,organization,community service}',
   TRUE, 25.7896, -80.1990,
   '{"street": "217 NW 15th St", "city": "Miami", "state": "FL", "zip": "33136"}'::jsonb),

  ('e656efd4-1b5c-501e-b306-88f3571e1c1e', '5bfc6798-13df-5b33-b0dd-b9026f7a43da',
   'Workshop & Tutoring Volunteer — Lotus House',
   'Lead a workshop or activity for shelter residents — job-readiness, computer classes, basic life skills, health and wellness — or tutor children after school. Useful if you have a skill to teach and can commit to a recurring session. Set up a volunteer account first, then email info@lotushouse.org to propose a workshop.',
   'volunteering',
   NULL, NULL, '{teaching}', '{teaching,mentoring,curriculum design}',
   TRUE, 25.7896, -80.1990,
   '{"street": "217 NW 15th St", "city": "Miami", "state": "FL", "zip": "33136"}'::jsonb),

  -- ── Habitat for Humanity of Broward ───────────────────────────
  ('1a6ec753-6bcd-5d16-b824-fd1e97319575', '85f4a9f9-3543-5e8f-b970-31e5a9b7eb26',
   'ReStore Volunteer — Fort Lauderdale',
   'Help run the Habitat for Humanity of Broward ReStore on West Broward Boulevard: receiving and pricing donated furniture, appliances, and building materials, merchandising the floor, and assisting customers. Proceeds fund Habitat''s local homebuilding. Store runs Monday through Saturday; ask about shift times when you register at habitatbroward.org.',
   'volunteering',
   NULL, NULL, '{}', '{retail operations,inventory,customer service}',
   TRUE, 26.1223, -80.1487,
   '{"street": "505 W Broward Blvd", "city": "Fort Lauderdale", "state": "FL", "zip": "33311"}'::jsonb),

  ('1bb1515d-2d54-518e-b70a-1bff306f46d2', '85f4a9f9-3543-5e8f-b970-31e5a9b7eb26',
   'Construction Site Volunteer — Habitat for Humanity of Broward',
   'Work alongside Habitat crews and partner families on affordable-home builds and repairs across Broward County. No construction experience required — site supervisors train volunteers on the tools and tasks each day. Build locations vary; register through habitatbroward.org to see the current calendar.',
   'volunteering',
   NULL, NULL, '{}', '{construction basics,carpentry,painting,teamwork}',
   TRUE, 26.1223, -80.1487,
   '{"street": "505 W Broward Blvd", "city": "Fort Lauderdale", "state": "FL", "zip": "33311"}'::jsonb),

  -- ── Broward Outreach Center — Hollywood ───────────────────────
  ('e967b92a-2924-5a28-b093-8a6a60f4cbdf', 'ad03cbd5-1ce1-5cc7-89d6-f0a338937891',
   'Shelter Support Volunteer — Broward Outreach Center Hollywood',
   'Support the Hollywood campus of the Miami Rescue Mission: serving meals, sorting donated food and clothing, and helping with education and youth programming for shelter residents. Group and individual shifts both available. Call the campus at (954) 926-7417 or start at caringplace.org to arrange a shift.',
   'volunteering',
   NULL, NULL, '{}', '{food service,community service,youth mentoring}',
   TRUE, 26.0298, -80.1486,
   '{"street": "2056 Scott St", "city": "Hollywood", "state": "FL", "zip": "33020"}'::jsonb),

  -- ── Farm Share (Homestead) ────────────────────────────────────
  ('9fdf321a-634a-5a2e-bb01-71ecbc7c57bd', '7d27ec73-0ccd-5a3b-af02-aaeda7f20338',
   'Food Distribution Volunteer — Farm Share',
   'Help load and hand out fresh produce and groceries at Farm Share''s free distribution events, or sort at the Homestead warehouse. No experience needed — just a willingness to work outdoors and lift boxes. Volunteers sign a release and waiver at the event. Fill in the volunteer form at farmshare.org/become-a-volunteer, or email information@farmshare.org, and Farm Share will match you to a distribution near you.',
   'volunteering',
   NULL, NULL, '{}', '{logistics,food handling,community outreach}',
   TRUE, 25.4702, -80.4205,
   '{"street": "14125 SW 320th St", "city": "Homestead", "state": "FL", "zip": "33033"}'::jsonb),

  -- ── LifeNet4Families (Fort Lauderdale) ────────────────────────
  ('161ef7a8-10c1-579e-ba3f-8bf498d4bc49', 'd1b404bd-caab-52fe-9f96-b8d753f53fe8',
   'Community Café Kitchen Volunteer — LifeNet4Families',
   'Prepare and serve hot meals in the Community Café, which feeds neighbors every morning, and help keep the kitchen clean and stocked. Related roles cover the food pantry, clothing room, and front office. Volunteers complete an application and waiver and watch the orientation video before their first shift — details at ln4f.org, or call (954) 792-2328.',
   'volunteering',
   NULL, NULL, '{}', '{food service,kitchen operations,teamwork}',
   TRUE, 26.1213, -80.1907,
   '{"street": "1 NW 33rd Ter", "city": "Fort Lauderdale", "state": "FL", "zip": "33311"}'::jsonb),

  -- ── Jubilee Center of South Broward (Hollywood) ───────────────
  ('e2ccb2d7-ffc6-555e-b5ba-a37e85e34255', 'c0f17bdc-6c5b-5548-91fc-dc582132a703',
   'Soup Kitchen Volunteer — Jubilee Center, Hollywood',
   'Help cook, plate, and serve the free lunch that the Jubilee Center provides to roughly 150 people every day, and help sort donations for the clothing closet and hygiene-kit program. Shifts run around the late-morning meal service. Call (954) 920-0106 to arrange a day — small operation, so it helps to call ahead.',
   'volunteering',
   NULL, NULL, '{}', '{food service,community service}',
   TRUE, 26.0298, -80.1479,
   '{"street": "2020 Scott St", "city": "Hollywood", "state": "FL", "zip": "33020"}'::jsonb),

  -- ── Hispanic Unity of Florida (Hollywood) ─────────────────────
  ('7aaf287a-130a-53c2-9db3-803514c8c564', '5e22755c-e57a-5d85-871b-d198b0b0c7cd',
   'Free Tax Preparation Volunteer (VITA) — Broward Tax Pro',
   'Prepare free tax returns for Broward households through the IRS Volunteer Income Tax Assistance program, coordinated by Hispanic Unity of Florida as Broward Tax Pro. Volunteers are trained and IRS-certified before the season starts — no accounting background required, and bilingual volunteers are especially useful. Seasonal role, roughly January through April. Ask about training at (954) 342-0428 or hispanicunity.org.',
   'volunteering',
   NULL, NULL, '{}', '{tax preparation,IRS certification,financial counseling}',
   TRUE, 26.0177, -80.2047,
   '{"street": "5840 Johnson St", "city": "Hollywood", "state": "FL", "zip": "33021"}'::jsonb)

ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- Verification (run after applying)
-- ════════════════════════════════════════════════════════════════
-- Expect 31 / 35 / 12, and 34 rows visible to the public map query.
--
--   SELECT count(*) FROM providers      WHERE id IN (...) ;
--   SELECT count(*) FROM resources      WHERE import_batch_id = 'south_florida_batch_1';
--   SELECT count(*) FROM work_exchanges WHERE id IN (...) ;
--
--   SELECT count(*) FROM resources
--    WHERE import_batch_id = 'south_florida_batch_1'
--      AND is_active AND verification_status IN ('verified','pending')
--      AND is_map_ready AND lat IS NOT NULL AND lng IS NOT NULL;
--   -- → 34 (all but the Women In Distress confidential-address row)
-- ================================================================
