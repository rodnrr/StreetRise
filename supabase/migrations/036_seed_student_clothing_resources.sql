-- ================================================================
-- StreetRise — Migration 036: Student Clothing & School-Support Seed
--
-- APPLIED TO LIVE 2026-08-18 (project mldatfcwnmvrmxumzxyb).
-- Runbook + verification queries: docs/apply-migration-036.md
--
-- Verified after apply: 15 providers, 20 resources, all 20 publicly
-- visible, all 20 tagged population_focus ∋ 'students', 19 clothing +
-- 1 outreach, 4 requires_referral, 2 carrying per-day hours, and all 20
-- readable by the anon role through RLS. Public map total 146 → 166.
-- Every stored field was diffed back against this file after the apply.
--
-- Re-running is safe. Every INSERT is ON CONFLICT (id) DO NOTHING and
-- the IDs are stable uuid5 values, so a second run is a no-op.
--
-- Adds the platform's FIRST clothing listings. Before this migration
-- `SELECT count(*) FROM resources WHERE category = 'clothing'` returned
-- ZERO on live — the `clothing` need chip existed in the UI and matched
-- nothing, so `isUsefulOption()` hid it. This is the data that turns it on.
--
--   15 providers  (verified, user_id NULL — same pattern as 008/020/032)
--   20 resources  (19 clothing closets + 1 outreach program)
--    1 provider backfill (see section 1b)
--
-- Two resources hang off providers that ALREADY EXIST on live and are
-- therefore not duplicated:
--   • Mattie Williams Neighborhood Family Center  c41e73f2-… (MATTIE-001)
--     — seeded by migration 008, so a rebuilt DB has it.
--   • Christian Service Center for Central FL     28e81d11-… (OB3-CSC-001)
--     — NOT in any migration; it arrived via the OB3 import script. Section
--     1b upserts it so this migration does not depend on a database that
--     happens to have had that import run. See 1b for the full reasoning.
--
-- Coverage:
--   Tampa Bay — Clearwater, St. Petersburg, Tampa, Safety Harbor,
--               Brandon, Progress Village
--   Orlando   — downtown, Pine Hills/Vineland, College Park,
--               east Orlando, Bithlo
--   Miami     — Overtown, downtown/district, south Miami-Dade
--
-- ── The 'students' population_focus tag ───────────────────────
-- Every row carries the NEW tag `students` in population_focus.
--
-- This is deliberately a population_focus tag and NOT a new category
-- value. `category` says what a service IS (clothing, food, medical);
-- population_focus says who it SERVES. A school clothing closet is a
-- clothing resource whose distinguishing feature is that it serves
-- students — exactly the shape of the existing `veterans` and
-- `families` tags. It also means the next student-facing resource that
-- is NOT clothing (a school-based pantry, a homeless-liaison program —
-- Project UP-START below is already one) tags in without an either/or
-- fight with its real category.
--
-- population_focus is an unconstrained TEXT[] on live, so this needs no
-- DDL. The app side is src/types (PopulationFocus), the POPULATION_FOCUS_LABEL
-- map, the `students` NEED_DEFS entry, and the /students page.
--
-- ── Sourcing ─────────────────────────────────────────────────
-- Compiled from a maintainer-supplied directory of student clothing
-- assistance programs (Aug 2026), cross-checked against each org's own
-- published address, phone, and program page. Nothing here was
-- confirmed by phone, so every resource is seeded
-- verification_status = 'pending' → the amber "Community Listed"
-- badge, confidence_score 35 (same as the 032 South Florida batch).
-- Staff flips a row to 'verified' in AdminResources only after an
-- actual phone check.
--
-- Four organisations from the source directory are deliberately NOT
-- seeded as public resources, because they are partnership / donation-
-- drive leads rather than services a family can walk into:
-- Goodwill Industries-Suncoast, Project Ready for School, School Ready,
-- and Big Brothers Big Sisters of Miami (Big Closet). Putting a
-- "clothing help" pin on a retail store, a mailing address, or a
-- corporate fund-development contact would send a parent somewhere that
-- cannot help them. They are recorded, with the ask and the reasoning,
-- in docs/student-resources-outreach.md.
--
-- ── Referral-only listings ───────────────────────────────────
-- Four rows are marked requires_referral = TRUE and
-- walk_ins_accepted = FALSE, because access genuinely runs through a
-- school counsellor, social worker or administrator:
--   OASIS Opportunities, OCPS Kids' Closet,
--   M-DCPS Foundation "The Shop", Project UP-START.
-- Their addresses are district or program offices, NOT walk-in stores,
-- and every one of those descriptions says so in its first two
-- sentences. The map already renders a "Referral needed" badge for
-- these; this migration is what finally makes that badge carry weight.
--
-- ── Hours: why only ONE row publishes any ────────────────────
-- Exactly ONE row (ECHO of Brandon) carries per-day windows, so it is
-- the only listing in this batch that can ever satisfy "Open right
-- now". Every other row stores a `summary` (and sometimes `notes`) with
-- no day windows, on purpose. That filter is the one place that fails
-- CLOSED (mapFilters.ts) precisely because it makes a positive claim,
-- and for these listings the honest position is that we do not know:
--   • the source says "verify hours" or publishes none at all, or
--   • the published hours are the ORG OFFICE, not the clothing room
--     (Mattie Williams, Mercy Keepers, Overtown Youth Center), or
--   • access is by referral, so "open" would be meaningless to a
--     family who has not been referred yet.
-- ECHO of Brandon runs Mon-Fri 9-1 AND Tue 5-7 PM; the Tuesday window
-- stores only 09:00-13:00, under-claiming per the house rule, with the
-- evening session carried in `notes` and `summary`. Its posted hours
-- are its actual client-service hours, which is what earns it windows.
--
-- Mattie Williams originally stored its office hours as day windows
-- with a note saying clothing might not be available during them. That
-- was the rule above being stated and then broken in the same row:
-- "Open right now" would have asserted the clothing service was open
-- on the strength of office hours. Windows removed (Codex review, PR #79).
--
-- ── Walk-ins vs appointments ─────────────────────────────────
-- `walk_ins_accepted` is NOT NULL DEFAULT TRUE, and ResourceCard turns
-- it into a public "Walk-ins OK" line, so leaving it at the default is
-- an affirmative claim rather than a silence. The three Clothes To Kids
-- rows shipped with TRUE while their own descriptions said to book an
-- appointment — the card contradicted the listing it belonged to. All
-- three are now FALSE, matching Cornerstone Connections and The Shop,
-- which are also appointment-based (Codex review, PR #79).
--
-- ── Caring for Miami: a base, not a storefront ───────────────
-- The Mobile Closet travels; 8900 SW 168th St is the ministry base. It
-- carries access_type = 'phone_intake' rather than 'onsite' so
-- ResourceSheet suppresses the Directions action and ResourceCard shows
-- "Call for location". The address still renders for context — only
-- turn-by-turn routing to a non-storefront is withheld. Same reasoning
-- as the existing rule against offering directions to call-only
-- listings (Codex review, PR #79).
--
-- ── Geocoding ────────────────────────────────────────────────
-- All coordinates from the US Census Bureau geocoder (Public_AR_Current
-- benchmark), street-range interpolated, carried in geocode_quality:
--   • 'street_interpolated' — matched inside a TIGER address range
--   • 'street_block'        — matched at a range edge or on a
--                             normalised street name; block-accurate
--                             (~100 m), not rooftop:
--       – First Baptist Progress Village (TIGER normalises
--         "Progress Village Blvd" to "Progress Blvd")
--       – Lighthouse Resource Center (18606 sits at the range edge)
--       – Caring for Miami (8900 is the first address in its range)
--   • 'rooftop'             — the two reused-provider rows, whose
--                             coordinates come from existing verified
--                             live rows at the same address.
-- ECHO of Brandon: the Census geocoder places 507 N Parsons Ave in ZIP
-- 33510, not the 33511 the source listed. The stored address uses 33510.
--
-- ── Public map query requires ────────────────────────────────
--   is_active = true
--   AND verification_status IN ('verified','pending')
--   AND is_map_ready = true
--   AND lat IS NOT NULL AND lng IS NOT NULL
-- All 20 rows satisfy this.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. PROVIDERS
-- ════════════════════════════════════════════════════════════════
-- Seeded 'verified' because public RLS only exposes verified providers and
-- the resource detail page joins the provider to render the org name. This
-- mirrors migrations 008 / 020 / 032.
--
-- `claim_status` and `source_type` are set EXPLICITLY, and must stay that way.
-- Their live column defaults are 'claimed' / 'self_registered' — chosen to
-- satisfy the `providers_insert_self` WITH CHECK on the provider *signup*
-- path (see CLAUDE.md), not for seeding. Relying on the defaults here marks
-- a seeded org as though a real person had registered and claimed it, which
-- is both false provenance and a dead end: a `claimed` org can never be
-- claimed at /claim, so the actual organisation could never take ownership
-- of its own listing. Migration 027 exists because this went wrong once
-- before. All 122 pre-existing seeded providers are 'unclaimed' / 'seeded'.
--
-- `contact_email` is NOT NULL. Where the org publishes no general inbox we use
-- the `*.placeholder` convention migration 020 established rather than
-- inventing an address. We deliberately do NOT seed the named-individual work
-- addresses that appeared in the source spreadsheet — a public directory row
-- is not the place for one person's inbox. Those stay in
-- docs/student-resources-outreach.md as outreach leads.

INSERT INTO providers (
  id, user_id, organization_name, contact_name, contact_email,
  contact_phone, website, external_id, verification_status, role,
  claim_status, source_type
) VALUES

  ('db59428d-d65d-5cf0-80c6-9ba17ad5133c', NULL, 'Clothes To Kids', 'Client Services',
   'inspire@clothestokids.org', '(727) 441-5050',
   'https://clothestokids.org/', 'CTK-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('bdff8458-a8e7-58cc-a92f-0baa74dcb913', NULL, 'OASIS Opportunities', 'School Partnerships',
   'info@oasisopportunities.org', '(813) 699-9131',
   'https://www.oasisopportunities.org/our-programs', 'OASISOPP-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('10bba6eb-2dff-50fd-a7eb-528de1f3f02a', NULL, 'Hands Across the Bay', 'Client Services',
   'contact@hands_across_the_bay.placeholder', '(727) 573-7720',
   'https://handsacrossthebay.org/', 'HATB-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('2e5eaa04-5320-5408-a28d-398c750c42bc', NULL, 'Mercy Keepers', 'Clothing Bank',
   'contact@mercy_keepers.placeholder', '(727) 823-8795',
   'https://mercykeepers.org/', 'MERCYK-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('0fcc2bb3-4ce1-5d95-99ba-c3bb8ff98b22', NULL, 'ECHO of Brandon', 'Client Services',
   'contact@echo_of_brandon.placeholder', '(813) 685-0935',
   'https://echofl.org/', 'ECHOBR-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('fe82820f-6e0e-5e14-9aff-a43d2a9cddac', NULL, 'First Baptist Church of Progress Village', 'Clothes & More Ministry',
   'church@fbcopv.org', '(813) 677-1948',
   'https://www.fbcopv.org/clothes-more-ministry', 'FBCPV-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('660d2bab-b169-5b60-8a51-d3dfc752ff1f', NULL, 'Orange County Public Schools — Student Services', 'Homeless Education Services',
   'helphomeless@ocps.net', '(407) 317-3394',
   'https://www.ocps.net/89175_3', 'OCPS-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('d02cad5f-8602-5ec9-ad6b-4aa7f70816ef', NULL, 'The Bridges of Light Foundation', 'Closet of Care',
   'contact@bridges_of_light.placeholder', '(407) 490-3290',
   'https://www.thebridgesoflightfoundation.org/', 'BOLF-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('fd21257c-d789-5b43-ab27-a24c4fd8ebd5', NULL, 'Cornerstone Connections', 'Clothing Closet',
   'contact@cornerstone_connections.placeholder', '(888) 306-4477',
   'https://cornerstoneconnections.org/', 'CORNSTN-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('67ebb992-0961-5901-85a7-9118d156cb55', NULL, 'One Heart for Women & Children', 'Family Services',
   'contact@one_heart_orlando.placeholder', '(407) 233-4718',
   'https://oneheartforwomen.org/', 'ONEHEART-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('18f0b84c-54bd-59fe-8412-447a2e9400a4', NULL, 'Samaritan Resource Center', 'Client Services',
   'contact@samaritan_resource.placeholder', '(407) 482-0600',
   'https://www.samaritanresourcecenter.org/', 'SAMARES-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('9cc50ff8-f618-5a6a-bdd4-f428431a4bed', NULL, 'Lighthouse Resource Center', 'Threads of Light',
   'contact@lighthouse_resource_center.placeholder', '(321) 804-4352',
   'https://lighthouseresourcecenter.org/', 'LRCORL-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('d9b411a8-4ee4-51f9-9af7-8a171548251b', NULL, 'Overtown Youth Center', 'Family Services',
   'info@oycmiami.org', '(305) 349-1204',
   'https://oycmiami.org/programs/family-services/neat-stuff/', 'OYCMIA-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('97a6e84f-5781-52c6-a21d-d722d91f37ab', NULL, 'The Foundation for New Education Initiatives (M-DCPS Foundation)', 'Student & Family Services',
   'info@mdcpsfoundation.org', '(305) 995-7312',
   'https://mdcpsfoundation.org/', 'MDCPSF-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('39f3d646-b6db-579c-a645-69f0361be891', NULL, 'Caring for Miami', 'Mobile Closet',
   'contact@caring_for_miami.placeholder', '(786) 430-1051',
   'https://caringformiami.org/closet/', 'CFMIA-001', 'verified', 'provider', 'unclaimed', 'seeded')
ON CONFLICT (id) DO NOTHING;


-- ── 1b. Backfill for a reused provider that no migration creates ──
--
-- Section 2 hangs two resources off providers that already exist rather than
-- duplicating them. Only ONE of the two is reproducible from this repo:
--
--   • Mattie Williams Neighborhood Family Center (c41e73f2-…) is seeded by
--     migration 008, so it exists on any DB rebuilt from migrations. Fine.
--   • Christian Service Center for Central Florida (28e81d11-…) is NOT. It
--     entered live through scripts/import-seed-candidates.ts (the OB3- =
--     "Orlando batch 3" import), which no migration replays, and its id is a
--     random gen_random_uuid() rather than a derivable uuid5.
--
-- `resources.provider_id` is `NOT NULL REFERENCES providers(id)`
-- (001_initial_schema.sql), so on a freshly rebuilt database — CI, staging, a
-- review app, a disaster-recovery restore — section 2 would abort on that
-- foreign key and NOT ONE of the 20 student rows would land. Live already has
-- the provider, which is exactly why the original apply succeeded and hid this.
--
-- The row below reproduces live's record verbatim (verified 2026-08-18) so a
-- rebuilt database and live agree. It is a no-op on live: ON CONFLICT (id)
-- leaves the existing row untouched, including any edits an admin has made.
--
-- Reviewers: any future migration that references an imported provider needs
-- the same treatment. Migration-seeded ids are safe; import-script ids are not.

INSERT INTO providers (
  id, user_id, organization_name, contact_name, contact_email,
  contact_phone, website, external_id, verification_status, role,
  claim_status, source_type
) VALUES
  ('28e81d11-d82a-49c1-8e5b-19879d204d2a', NULL,
   'Christian Service Center for Central Florida',
   'Christian Service Center for Central Florida',
   'ob3-csc-001@placeholder.streetrise.org', NULL,
   'https://www.christianservicecenter.org/', 'OB3-CSC-001',
   'verified', 'provider', 'unclaimed', 'seeded')
ON CONFLICT (id) DO NOTHING;



-- ════════════════════════════════════════════════════════════════
-- 2. RESOURCES
-- ════════════════════════════════════════════════════════════════
-- `resource_type` is constrained by the LIVE `resources_resource_type_check`.
-- 'clothing_closet' and 'outreach_program' are both in it (verified 2026-08-18).
--
-- population_focus carries the NEW 'students' tag on every row. The column is
-- an unconstrained TEXT[], so no schema change is needed — the tag is what the
-- app's new "Students" need chip and /students page filter on.

INSERT INTO resources (
  id, provider_id, name, description, category, subcategory, resource_type,
  address, lat, lng, geocode_quality, access_type, is_map_ready,
  phone, email, website,
  availability_status,
  walk_ins_accepted, requires_id, requires_referral, phone_required_before_arrival,
  gender_policy, population_focus,
  serves_meals, has_showers, has_restrooms, has_laundry,
  wheelchair_accessible, public_transit_accessible, overnight_allowed,
  hours_of_operation, languages_spoken, tags,
  external_id, import_batch_id, source_file, last_imported_at,
  confidence_score, verification_status, is_active
) VALUES

  ('50c1f8fd-5826-57e4-99c7-f9d425ced3c0', 'db59428d-d65d-5cf0-80c6-9ba17ad5133c',
   'Clothes To Kids — Clearwater',
   'Free school clothing for students in PreK-4 through 12th grade who live in Pinellas or Hillsborough County. Each eligible student picks out a wardrobe — shirts, pants, shoes, underwear, socks and a jacket — at no cost. Families book an appointment and bring proof the child is enrolled in school plus proof of need; a school counsellor or social worker can also refer a student directly in a crisis. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "1059 N Hercules Ave", "city": "Clearwater", "state": "FL", "zip": "33765"}'::jsonb,
   27.975495, -82.754533, 'street_interpolated', 'onsite', TRUE,
   '(727) 441-5050', 'inspire@clothestokids.org', 'https://clothestokids.org/',
   'unknown',
   FALSE, TRUE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Store hours vary by location — call to book an appointment", "source_url": "https://clothestokids.org/contact", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"school clothing","school uniforms","shoes","students","appointment"}',
   'CTK-001-clearwater-clothing', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('8597ad89-15d4-535c-8fcd-0654f0e89fa0', 'db59428d-d65d-5cf0-80c6-9ba17ad5133c',
   'Clothes To Kids — St. Petersburg',
   'Free school clothing for students in PreK-4 through 12th grade who live in Pinellas or Hillsborough County. Each eligible student picks out a full wardrobe at no cost. Families book an appointment and bring proof of school enrolment plus proof of need; school staff can also refer a student directly in a crisis. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "2168 34th St S", "city": "St Petersburg", "state": "FL", "zip": "33711"}'::jsonb,
   27.748747, -82.679261, 'street_interpolated', 'onsite', TRUE,
   '(727) 441-5050', 'inspire@clothestokids.org', 'https://clothestokids.org/',
   'unknown',
   FALSE, TRUE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Store hours vary by location — call to book an appointment", "source_url": "https://clothestokids.org/contact", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"school clothing","school uniforms","shoes","students","appointment"}',
   'CTK-001-stpete-clothing', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('0afd4520-9e5d-520b-af98-affcbd0484f5', 'db59428d-d65d-5cf0-80c6-9ba17ad5133c',
   'Clothes To Kids — Tampa',
   'Free school clothing for students in PreK-4 through 12th grade who live in Hillsborough or Pinellas County. Each eligible student picks out a full wardrobe at no cost. Families book an appointment and bring proof of school enrolment plus proof of need; school staff can also refer a student directly in a crisis. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "5011-H W Hillsborough Ave", "city": "Tampa", "state": "FL", "zip": "33634"}'::jsonb,
   27.996219, -82.527485, 'street_interpolated', 'onsite', TRUE,
   '(813) 616-6430', 'inspire@clothestokids.org', 'https://clothestokids.org/',
   'unknown',
   FALSE, TRUE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Store hours vary by location — call to book an appointment", "source_url": "https://clothestokids.org/contact", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"school clothing","school uniforms","shoes","students","appointment"}',
   'CTK-001-tampa-clothing', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('1e618137-81a4-5525-8d46-937f2c58e16f', 'bdff8458-a8e7-58cc-a92f-0baa74dcb913',
   'OASIS Opportunities — Student Clothing & Uniforms',
   'Works through Hillsborough County school social workers to get clothing, school uniforms, shoes and hygiene supplies to students, including delivery to schools and a teen pop-up shop. Access is arranged by school staff — ask your school’s social worker or counsellor to make the request rather than coming to the site. The phone number reaches the office. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "5101 N 40th St", "city": "Tampa", "state": "FL", "zip": "33610"}'::jsonb,
   27.991609, -82.41403, 'street_interpolated', 'onsite', TRUE,
   '(813) 699-9131', 'info@oasisopportunities.org', 'https://www.oasisopportunities.org/our-programs',
   'unknown',
   FALSE, TRUE, TRUE, TRUE,
   'gender_inclusive', '{"students","families","young_adults"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Office Mon-Fri 9 AM-4 PM; clothing access is arranged through a school social worker", "source_url": "https://www.oasisopportunities.org/our-programs", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"school uniforms","shoes","hygiene supplies","students","school referral"}',
   'OASISOPP-001-student-clothing', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('b58a43fe-32bd-5b97-ac9f-f33106eb2369', 'c41e73f2-ed5f-399b-8c98-a6da61f8491b',
   'Mattie Williams Neighborhood Family Center — Clothing Assistance',
   'Neighborhood family centre in Safety Harbor offering clothing assistance alongside its food pantry and family support programs — a useful North Pinellas option for a family that needs school clothes. Call ahead: clothing stock and distribution days are separate from the centre’s general office hours. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "1003 Dr Martin Luther King Jr St N", "city": "Safety Harbor", "state": "FL", "zip": "34695"}'::jsonb,
   28.013464, -82.692276, 'rooftop', 'onsite', TRUE,
   '(727) 791-8255', NULL, 'https://mattiecenter.org/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Family centre office Mon-Wed 8:30 AM-5 PM, Thu to 6 PM, Fri to 12 PM; clothing distribution days differ — call first", "notes": "The published schedule is the family centre OFFICE, not the clothing room. No per-day windows are stored, so this listing never satisfies \"Open right now\" — asserting the clothing service is open on office hours would be a claim we cannot support. Add real distribution hours once confirmed by phone.", "source_url": "https://mattiecenter.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","family support","students","north pinellas"}',
   'MATTIE-001-clothing-assistance', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('55f9982d-7315-58ff-ab47-197d9d421afa', '10bba6eb-2dff-50fd-a7eb-528de1f3f02a',
   'Hands Across the Bay — Clothing & Basic Needs',
   'Pinellas County nonprofit providing clothing and basic-needs assistance to families in crisis, including school clothes and shoes for children. Hours are not published, so call before making the trip. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "3800 Ulmerton Rd", "city": "Clearwater", "state": "FL", "zip": "33762"}'::jsonb,
   27.893782, -82.684381, 'street_interpolated', 'onsite', TRUE,
   '(727) 573-7720', NULL, 'https://handsacrossthebay.org/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Hours not published — call before visiting", "source_url": "https://handsacrossthebay.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","basic needs","students","families"}',
   'HATB-001-clothing-basic-needs', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('0197891e-8420-5c7e-8fb6-86aed027963b', '2e5eaa04-5320-5408-a28d-398c750c42bc',
   'Mercy Keepers — Clothing Bank',
   'Clothing bank in south St. Petersburg. Public listings indicate no income restriction for clothing, which makes it a straightforward option for a family that needs school clothes quickly. The office is listed as open Mon, Tue and Thu mornings, but the clothing distribution schedule is separate and is not published — call to confirm when the clothing room is open. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "2021 9th Ave S", "city": "St Petersburg", "state": "FL", "zip": "33712"}'::jsonb,
   27.76115, -82.660369, 'street_interpolated', 'onsite', TRUE,
   '(727) 823-8795', NULL, 'https://mercykeepers.org/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Office listed Mon/Tue/Thu 10 AM-1 PM; clothing distribution schedule differs — call first", "source_url": "https://mercykeepers.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","clothing bank","students","no income requirement"}',
   'MERCYK-001-clothing-bank', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('2ba5987a-6c19-573a-a0b1-5d7363bd9f12', '0fcc2bb3-4ce1-5d95-99ba-c3bb8ff98b22',
   'ECHO of Brandon — Free Clothing',
   'Emergency Care Help Organization in Brandon provides free clothing alongside food and emergency assistance for eligible residents of eastern Hillsborough County — including school clothes and shoes for children. Bring ID and proof of address; eligibility is by service area. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "507 N Parsons Ave", "city": "Brandon", "state": "FL", "zip": "33510"}'::jsonb,
   27.945485, -82.285763, 'street_interpolated', 'onsite', TRUE,
   '(813) 685-0935', NULL, 'https://echofl.org/',
   'unknown',
   TRUE, TRUE, FALSE, FALSE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"monday": {"open": "09:00", "close": "13:00", "closed": false}, "tuesday": {"open": "09:00", "close": "13:00", "closed": false}, "wednesday": {"open": "09:00", "close": "13:00", "closed": false}, "thursday": {"open": "09:00", "close": "13:00", "closed": false}, "friday": {"open": "09:00", "close": "13:00", "closed": false}, "saturday": {"closed": true}, "sunday": {"closed": true}, "summary": "Mon-Fri 9 AM-1 PM, plus Tue 5-7 PM — call to confirm", "notes": "Also open Tuesday evenings 5-7 PM. The Tuesday window above shows only the daytime hours so \"open right now\" never over-claims; the evening session is real.", "source_url": "https://echofl.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","school clothes","students","east hillsborough"}',
   'ECHOBR-001-free-clothing', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('924088fe-d4d6-5b62-b279-0102cabc37f4', 'fe82820f-6e0e-5e14-9aff-a43d2a9cddac',
   'First Baptist Progress Village — Clothes & More Ministry',
   'Church clothing ministry in Progress Village that distributes donated clothing and has run school-uniform drives. Ministry hours are not published — call the church office before going. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "8722 Progress Village Blvd", "city": "Tampa", "state": "FL", "zip": "33619"}'::jsonb,
   27.899227, -82.360059, 'street_block', 'onsite', TRUE,
   '(813) 677-1948', 'church@fbcopv.org', 'https://www.fbcopv.org/clothes-more-ministry',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Ministry hours not published — call the church office first", "source_url": "https://www.fbcopv.org/clothes-more-ministry", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","school uniforms","students","church ministry"}',
   'FBCPV-001-clothes-and-more', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('67386678-5d42-5d9e-a67e-bebd9bf74930', '660d2bab-b169-5b60-8a51-d3dfc752ff1f',
   'OCPS Kids’ Closet',
   'Orange County Public Schools runs a central clothing closet and food pantry for eligible school-age students and their families. Access is coordinated by school staff — ask your child’s school counsellor, social worker or the district homeless-education office to set it up. The address below is district Student Services, not a walk-in store. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "445 W Amelia St", "city": "Orlando", "state": "FL", "zip": "32801"}'::jsonb,
   28.549474, -81.384842, 'street_interpolated', 'onsite', TRUE,
   '(407) 317-3394', 'helphomeless@ocps.net', 'https://www.ocps.net/89175_3',
   'unknown',
   FALSE, TRUE, TRUE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Access is arranged through your school counsellor or social worker — not a walk-in store", "source_url": "https://www.ocps.net/89175_3", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"school clothing","students","school referral","food pantry"}',
   'OCPS-001-kids-closet', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('680a1e7b-7fee-53ed-9124-c95c85d8e98d', 'd02cad5f-8602-5ec9-ad6b-4aa7f70816ef',
   'The Bridges of Light Foundation — Closet of Care',
   'Provides clothing, school supplies, toiletries and other essentials to families in the Orlando area. Hours are not published — call before visiting. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "4203 Vineland Rd, Suite K", "city": "Orlando", "state": "FL", "zip": "32811"}'::jsonb,
   28.50365, -81.428812, 'street_interpolated', 'onsite', TRUE,
   '(407) 490-3290', NULL, 'https://www.thebridgesoflightfoundation.org/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Hours not published — call before visiting", "source_url": "https://www.thebridgesoflightfoundation.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","school supplies","toiletries","students"}',
   'BOLF-001-closet-of-care', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('4370f3aa-331d-5e53-a18b-962f7fe86a15', 'fd21257c-d789-5b43-ab27-a24c4fd8ebd5',
   'Cornerstone Connections — Community Clothing Closet',
   'Free community clothing closet in downtown Orlando serving men, women and children, including school clothes. Visits are by appointment — call to book. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "519 N Magnolia Ave", "city": "Orlando", "state": "FL", "zip": "32801"}'::jsonb,
   28.54972, -81.376744, 'street_interpolated', 'onsite', TRUE,
   '(888) 306-4477', NULL, 'https://cornerstoneconnections.org/',
   'unknown',
   FALSE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Appointment-based — call to book", "source_url": "https://cornerstoneconnections.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","clothing closet","students","appointment"}',
   'CORNSTN-001-clothing-closet', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('fcb974c8-540e-53c6-81a5-3cd365deb7cd', '67ebb992-0961-5901-85a7-9118d156cb55',
   'One Heart for Women & Children — Family Assistance',
   'Orlando nonprofit providing practical assistance to families, including clothing and basic needs for children. Clothing-service hours are not published — call to confirm what is available before going. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "2040 N Rio Grande Ave", "city": "Orlando", "state": "FL", "zip": "32804"}'::jsonb,
   28.569546, -81.401797, 'street_interpolated', 'onsite', TRUE,
   '(407) 233-4718', NULL, 'https://oneheartforwomen.org/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Clothing-service hours not published — call to confirm", "source_url": "https://oneheartforwomen.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","family assistance","students"}',
   'ONEHEART-001-family-assistance', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('b6e7d89d-2c97-5eaa-8c0a-e952107b7c81', '28e81d11-d82a-49c1-8e5b-19879d204d2a',
   'Christian Service Center — Clothing Assistance',
   'Basic-needs assistance in downtown Orlando that includes clothing for adults and children. Program availability changes — call to confirm the clothing program is running and what a family needs to bring. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "808 W Central Blvd", "city": "Orlando", "state": "FL", "zip": "32805"}'::jsonb,
   28.5414, -81.3935, 'rooftop', 'onsite', TRUE,
   '(407) 425-2523', NULL, 'https://christianservicecenter.org/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Service hours not published for the clothing program — call to confirm", "source_url": "https://christianservicecenter.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","basic needs","students"}',
   'OB3-CSC-001-clothing-assistance', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('70fb6239-d15a-5594-882e-1e0d68c67002', '18f0b84c-54bd-59fe-8412-447a2e9400a4',
   'Samaritan Resource Center — Clothing Boutique',
   'Basic-needs resource centre in east Orlando with a clothing boutique, especially geared to people facing housing instability — including families with school-age children. Hours should be confirmed before visiting. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "9837 E Colonial Dr", "city": "Orlando", "state": "FL", "zip": "32817"}'::jsonb,
   28.569128, -81.246946, 'street_interpolated', 'onsite', TRUE,
   '(407) 482-0600', NULL, 'https://www.samaritanresourcecenter.org/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Hours should be confirmed — call before visiting", "source_url": "https://www.samaritanresourcecenter.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","boutique","students","housing instability"}',
   'SAMARES-001-clothing-boutique', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('5689a3c7-3c4a-5916-bc6c-3173af6d634a', '9cc50ff8-f618-5a6a-bdd4-f428431a4bed',
   'Lighthouse Resource Center — Threads of Light',
   'Clothing and hygiene resources for families in the east Orlando / Bithlo area. Listed hours vary — call before visiting. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "18606 Hollister Rd", "city": "Orlando", "state": "FL", "zip": "32820"}'::jsonb,
   28.571652, -81.101478, 'street_block', 'onsite', TRUE,
   '(321) 804-4352', NULL, 'https://lighthouseresourcecenter.org/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Listed hours vary — call before visiting", "source_url": "https://lighthouseresourcecenter.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"clothing","hygiene supplies","students","bithlo"}',
   'LRCORL-001-threads-of-light', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('0fbfa033-9368-5293-858d-7c7107844a2c', 'd9b411a8-4ee4-51f9-9af7-8a171548251b',
   'Overtown Youth Center — Neat Stuff',
   'Neat Stuff provides clothing, school uniforms, shoes, school supplies and hygiene items to children and families, and has set up Neat Stuff closets inside partner schools. The centre itself is generally open weekdays, but the Neat Stuff program runs on its own schedule — call or email to confirm before going. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "450 NW 14th St", "city": "Miami", "state": "FL", "zip": "33136"}'::jsonb,
   25.787976, -80.201452, 'street_interpolated', 'onsite', TRUE,
   '(305) 349-1204', 'info@oycmiami.org', 'https://oycmiami.org/programs/family-services/neat-stuff/',
   'unknown',
   TRUE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families","young_adults"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, TRUE, FALSE,
   '{"summary": "Centre generally Mon-Fri 8 AM-7 PM; the Neat Stuff program runs its own schedule — call first", "source_url": "https://oycmiami.org/programs/family-services/neat-stuff/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish","Haitian Creole"}',
   '{"school uniforms","clothing","shoes","school supplies","students"}',
   'OYCMIA-001-neat-stuff', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('863136bb-8d9c-5057-b8b2-19ad3fa2d96d', '97a6e84f-5781-52c6-a21d-d722d91f37ab',
   'M-DCPS Foundation — The Shop',
   'The Shop provides clothing, shoes, backpacks, school supplies, toiletries and food to Miami-Dade students and families in need. Appointments are coordinated by a school employee or administrator — ask your child’s school counsellor or principal to make the referral rather than going to the district office. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "1450 NE 2nd Ave, Suite 750", "city": "Miami", "state": "FL", "zip": "33132"}'::jsonb,
   25.788882, -80.190728, 'street_interpolated', 'onsite', TRUE,
   '(305) 995-7312', 'info@mdcpsfoundation.org', 'https://mdcpsfoundation.org/community/students-families-and-schools-in-need/',
   'unknown',
   FALSE, TRUE, TRUE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, TRUE, FALSE,
   '{"summary": "Appointments are arranged by a school employee — not a walk-in store", "source_url": "https://mdcpsfoundation.org/community/students-families-and-schools-in-need/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish","Haitian Creole"}',
   '{"school uniforms","clothing","shoes","school supplies","students","school referral"}',
   'MDCPSF-001-the-shop', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('644923a9-f5f9-5378-9451-2d12930de7d8', '97a6e84f-5781-52c6-a21d-d722d91f37ab',
   'Project UP-START — Support for Students in Housing Instability',
   'Supports Miami-Dade students whose families are experiencing housing instability, and may provide school uniforms and gift cards alongside enrolment and school-stability help. Start with your child’s school counsellor or the district homeless-education contact. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'outreach', 'student_support', 'outreach_program',
   '{"street": "1450 NE 2nd Ave, Suite 750", "city": "Miami", "state": "FL", "zip": "33132"}'::jsonb,
   25.788882, -80.190728, 'street_interpolated', 'onsite', TRUE,
   '(305) 995-7312', 'info@mdcpsfoundation.org', 'https://mdcpsfoundation.org/community/project-upstart/',
   'unknown',
   FALSE, TRUE, TRUE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, TRUE, FALSE,
   '{"summary": "Program hours not published — start with your school counsellor", "source_url": "https://mdcpsfoundation.org/community/project-upstart/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish","Haitian Creole"}',
   '{"school uniforms","students","housing instability","school referral"}',
   'MDCPSF-001-project-upstart', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE),

  ('0bb4e03d-2d94-5cf6-81c7-e02921a70852', '39f3d646-b6db-579c-a645-69f0361be891',
   'Caring for Miami — Mobile Closet',
   'A mobile clothing program that brings clothing — including khaki uniform bottoms and plain uniform polos — out to south Miami-Dade neighbourhoods and school communities. Because it travels, the address below is the ministry base rather than a storefront: call or check the website for the current Mobile Closet schedule before setting out. Listing built from public information — call to confirm hours, eligibility, and what is in stock before you go.',
   'clothing', 'clothing_closet', 'clothing_closet',
   '{"street": "8900 SW 168th St", "city": "Miami", "state": "FL", "zip": "33157"}'::jsonb,
   25.614206, -80.336871, 'street_block', 'phone_intake', TRUE,
   '(786) 430-1051', NULL, 'https://caringformiami.org/closet/',
   'unknown',
   FALSE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{"students","families"}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, FALSE,
   '{"summary": "Mobile program — check the current schedule before setting out", "source_url": "https://caringformiami.org/closet/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish","Haitian Creole"}',
   '{"school uniforms","clothing","mobile","students","south dade"}',
   'CFMIA-001-mobile-closet', 'student_clothing_batch_1', 'migration_036', NOW(),
   35, 'pending', TRUE)
ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- 3. VERIFY
-- ════════════════════════════════════════════════════════════════
-- Run these after applying. Expected values are in the comments;
-- docs/apply-migration-036.md repeats them with more context.

-- Expect 1 — the reused imported provider must exist before section 2.
-- SELECT count(*) FROM providers WHERE id = '28e81d11-d82a-49c1-8e5b-19879d204d2a';

-- Expect 0 — no resource may reference a provider that does not exist.
-- SELECT count(*) FROM resources r
--  WHERE r.import_batch_id = 'student_clothing_batch_1'
--    AND NOT EXISTS (SELECT 1 FROM providers p WHERE p.id = r.provider_id);

-- Expect 15
-- SELECT count(*) FROM providers WHERE external_id IN (
--   'CTK-001','OASISOPP-001','HATB-001','MERCYK-001','ECHOBR-001','FBCPV-001',
--   'OCPS-001','BOLF-001','CORNSTN-001','ONEHEART-001','SAMARES-001','LRCORL-001',
--   'OYCMIA-001','MDCPSF-001','CFMIA-001');

-- Expect 20
-- SELECT count(*) FROM resources WHERE import_batch_id = 'student_clothing_batch_1';

-- Expect 20 — every seeded row must be publicly visible, or the
-- Students chip and /students page will under-report.
-- SELECT count(*) FROM resources
--  WHERE import_batch_id = 'student_clothing_batch_1'
--    AND is_active AND verification_status IN ('verified','pending')
--    AND is_map_ready AND lat IS NOT NULL AND lng IS NOT NULL;

-- Expect 20 (this is what the "Students" need chip counts)
-- SELECT count(*) FROM resources WHERE population_focus @> ARRAY['students'];

-- Expect 19 clothing + 1 outreach
-- SELECT category, count(*) FROM resources
--  WHERE import_batch_id = 'student_clothing_batch_1' GROUP BY 1;

-- Expect 4 (OASIS, OCPS, The Shop, UP-START)
-- SELECT name FROM resources
--  WHERE import_batch_id = 'student_clothing_batch_1' AND requires_referral
--  ORDER BY name;

-- Expect 2 (Mattie Williams, ECHO of Brandon) — the only rows that
-- may ever satisfy the "Open right now" filter.
-- SELECT name FROM resources
--  WHERE import_batch_id = 'student_clothing_batch_1'
--    AND hours_of_operation ? 'monday';

-- Expect 0 — the anon role must see all 20 through RLS.
-- SET ROLE anon;
-- SELECT 20 - count(*) FROM resources WHERE import_batch_id = 'student_clothing_batch_1';
-- RESET ROLE;
