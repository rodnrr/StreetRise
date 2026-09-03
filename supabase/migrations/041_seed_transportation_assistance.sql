-- ================================================================
-- StreetRise — Migration 041: Transportation Assistance Seed
--
-- NOT APPLIED TO LIVE. Read docs/apply-migration-041.md first — several
-- facts below could not be verified from the session that wrote this file
-- and MUST be checked against each agency's own site before anyone flips a
-- row to 'verified'. See "Sourcing" below.
--
-- Adds the platform's FIRST `transportation` listings. Before this migration
-- `SELECT count(*) FROM resources WHERE category = 'transportation'` returns
-- ZERO on live (verified 2026-09-03) — the `transportation` need chip has
-- existed in NEED_DEFS the whole time and matched nothing, so
-- `isUsefulOption()` hid it. Same situation migration 036 fixed for clothing.
--
--    2 providers  (PSTA, HART — verified, user_id NULL, unclaimed/seeded)
--    6 resources  (4 PSTA programmes, 2 HART programmes)
--
-- Re-running is safe: both INSERTs are ON CONFLICT (id) DO NOTHING over
-- stable uuid5 ids. A second run is a no-op.
--
-- ids are uuid5(NAMESPACE_URL, 'https://streetrise.org/seed/041/<external_id>'),
-- so they are reproducible from the external_id alone.
--
-- ── Why these rows are NOT on the map ────────────────────────
-- All six carry lat = NULL, lng = NULL, is_map_ready = FALSE and
-- access_type = 'phone_intake'. That is deliberate on two counts.
--
-- 1. It is what these services actually are. A countywide paratransit
--    service or a bus-fare programme has a SERVICE AREA, not a doorway.
--    PSTA's and HART's addresses are agency headquarters: real places, but
--    not where the service is delivered, and dropping a "transportation
--    help" pin on a bus depot sends someone across a county to a building
--    that will tell them to phone. This is the same call migration 036 made
--    for Caring for Miami's mobile closet, applied to a whole category.
--
-- 2. Nothing here was geocoded. The session that wrote this migration had no
--    network route to the Census geocoder (or any other), and inventing
--    coordinates for an address is exactly the manufactured precision the
--    rest of this schema is careful to avoid. `geocode_quality` is therefore
--    NULL rather than a claim.
--
-- The consequence is worth stating plainly: applying this migration does
-- NOT make the `transportation` need chip appear on /map, because the map's
-- public query requires lat/lng and is_map_ready. These listings surface
-- through /transportation (the directory and the Ride Assistance Finder),
-- through the "Get There" panel on every listing, and through the homepage
-- and footer links. If the map is wanted too, that is a follow-up: geocode
-- the agencies' public service centres, set is_map_ready = TRUE, and decide
-- whether a pin on a headquarters actually helps anyone.
--
-- ── The `ride:` tag vocabulary ───────────────────────────────
-- Matching in the Ride Assistance Finder runs off `ride:`-prefixed entries
-- in `resources.tags`, using the same internal key:value convention the
-- import pipeline already uses for `subcategory:` / `access_src:`. That
-- means this needs NO DDL and no new column — `tags` is an unconstrained
-- TEXT[] on live.
--
--   ride:kind:<fare_assistance|paratransit|subsidized_rideshare|travel_training>
--   ride:mode:<bus|rideshare|paratransit|wheelchair>
--   ride:elig:<low_income|disability|medicaid|veteran>
--   ride:area:<county slug>
--   ride:notice:<same_day|next_day|advance|enrollment>
--
-- `ride` is registered in INTERNAL_TAG_PREFIXES (src/lib/mapFilters.ts), so
-- none of it renders as a public badge on /resources/:id. The app side is
-- src/lib/rideOptions.ts; adding a programme means adding a row here, not
-- changing code.
--
-- `ride:notice:enrollment` is the load-bearing one. Every programme below
-- except Direct Connect and Travel Training requires being approved BEFORE
-- a first trip, which for HARTPlus is documented as taking at least 21 days.
-- Someone who needs a ride in the next hour is not going to get it from an
-- enrollment programme, and the finder says so instead of listing it as an
-- answer.
--
-- ── Sourcing, and what is NOT verified ───────────────────────
-- Compiled from a maintainer-supplied brief (Sept 2026) naming these six
-- programmes, cross-checked against public search results for PSTA and HART.
-- The following were corroborated: the TD programme's 200%-of-federal-
-- poverty-level income test and Pinellas residency requirement; PSTA Access
-- being ADA paratransit for people who cannot independently use fixed-route
-- service; MOD being open to active Access users after their first two
-- months, through Uber, Lyft, zTrip and wheelchair providers; HARTPlus at
-- $4 each way with an application-plus-interview process.
--
-- One correction to the brief was applied: HARTPlus reservations are
-- documented as one to three days in advance, not specifically "the day
-- before". The description says one to three days.
--
-- NOT verified, and flagged in docs/apply-migration-041.md:
--   • Direct Connect operating through "eight designated transit locations"
--     as of 2026-09-01. This is the maintainer's figure; it is dated in the
--     description rather than stated as a standing fact, because a count
--     like this changes.
--   • Every phone number and postal address below.
--   • Whether the TD fare prices quoted in public sources still hold — so
--     no price is stated in any description.
--
-- The agencies' program pages could not be fetched from the authoring
-- session (network egress to psta.net and gohart.org was blocked), so every
-- `website` below is the ORGANISATION ROOT rather than a deep link that
-- might already be stale. Replace with the real programme pages during the
-- apply if you can reach them.
--
-- Because of all of the above, all six rows are seeded
-- verification_status = 'pending' → the amber "Community Listed" badge, and
-- every description ends by telling the reader to confirm with the agency.
-- Staff flips a row to 'verified' only after an actual check.
--
-- `confidence_score` 35 below is DOCUMENTATION, not control — the column is
-- trigger-managed, so this literal is discarded on insert. See migration
-- 036's header and migration 037 for why live stores 35 for 'pending' rows
-- and a repo-rebuilt database may not.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. PROVIDERS
-- ════════════════════════════════════════════════════════════════
-- Seeded 'verified' because public RLS only exposes verified (or claiming /
-- unclaimed) providers and the resource detail page joins the provider to
-- render the org name. Mirrors migrations 008 / 020 / 032 / 036.
--
-- `claim_status` and `source_type` are set EXPLICITLY and must stay that
-- way. Their live column defaults are 'claimed' / 'self_registered', chosen
-- to satisfy the `providers_insert_self` WITH CHECK on the provider SIGNUP
-- path — not for seeding. Relying on them here would mark a public transit
-- authority as though someone had registered and claimed it, which is false
-- provenance AND a dead end: a 'claimed' org can never be claimed at /claim,
-- so PSTA or HART could never take ownership of their own listings.
-- Migration 027 exists because this went wrong once.
--
-- `contact_email` is NOT NULL and neither agency publishes a general inbox
-- we could confirm, so both use the `*.placeholder` convention migration 020
-- established rather than an invented address.

INSERT INTO providers (
  id, user_id, organization_name, contact_name, contact_email,
  contact_phone, website, external_id, verification_status, role,
  claim_status, source_type
) VALUES

  ('11709abb-23f8-5cc0-ad48-e0487b1284f5', NULL,
   'Pinellas Suncoast Transit Authority (PSTA)', 'Customer Service',
   'contact@psta.placeholder', '(727) 540-1900',
   'https://psta.net/', 'PSTA-001', 'verified', 'provider', 'unclaimed', 'seeded'),

  ('967088ee-272e-57ce-8c50-32e2e71b5c8d', NULL,
   'Hillsborough Transit Authority (HART)', 'Customer Service',
   'contact@gohart.placeholder', '(813) 254-4278',
   'https://www.gohart.org/', 'HART-001', 'verified', 'provider', 'unclaimed', 'seeded')

ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- 2. RESOURCES
-- ════════════════════════════════════════════════════════════════
-- `hours_of_operation` carries a `summary` and nothing else — no per-day
-- windows. That is the house rule being followed, not an omission: "Open
-- right now" is the one map filter that fails CLOSED because it makes a
-- positive claim, and for a countywide programme with a phone line and an
-- application process, "open" is not a claim we can make. `basis` records
-- where the sentence came from.

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

  -- ── PSTA: Transportation Disadvantaged (TD) bus fare ──
  ('527966ba-d1ec-58de-b12e-16126f281c4d', '11709abb-23f8-5cc0-ad48-e0487b1284f5',
   'PSTA Transportation Disadvantaged (TD) Bus Fare Program',
   'Reduced-cost bus fare for Pinellas County residents who have no other way to make life-sustaining trips — medical appointments, work, groceries, school. As PSTA publishes it, eligibility rests on gross household income at or below 200% of the federal poverty level and on not being able to get the trip covered another way, including by someone in your household or by an existing free-ride pass. You apply once, and approved riders then buy heavily discounted monthly bus fare. Ask about local top-ups as well: some Pinellas cities cover the cost of the pass outright for their own residents. Listing built from public information — call PSTA to confirm current eligibility rules, prices, and how to apply before you rely on it.',
   'transportation', 'fare_assistance', 'transportation_assistance',
   '{"street": "3201 Scherer Dr", "city": "St Petersburg", "state": "FL", "zip": "33716"}'::jsonb,
   NULL, NULL, NULL, 'phone_intake', FALSE,
   '(727) 540-1900', NULL, 'https://psta.net/',
   'unknown',
   FALSE, TRUE, FALSE, TRUE,
   'gender_inclusive', '{}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, FALSE, NULL,
   '{"summary": "Call PSTA customer service for current hours, eligibility and how to apply", "source_url": "https://psta.net/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"bus fare","reduced fare","low income","transportation","ride:kind:fare_assistance","ride:mode:bus","ride:elig:low_income","ride:area:pinellas","ride:notice:enrollment"}',
   'PSTA-001-td-fare', 'transportation_batch_1', 'migration_041', NOW(),
   35, 'pending', TRUE),

  -- ── PSTA Access: ADA paratransit ──
  ('d4e7131a-0768-5d72-a3b2-d4ba36b6b646', '11709abb-23f8-5cc0-ad48-e0487b1284f5',
   'PSTA Access — ADA Paratransit',
   'Pre-scheduled, door-to-door shared rides in Pinellas County for people who cannot independently use the regular fixed-route bus for all of their trips. Eligibility is decided on what your disability means for getting to a stop, boarding, and navigating the system — not on a diagnosis or a medical history. You have to be certified before your first trip, and trips are booked ahead rather than on demand, so this is not a same-day answer for someone who needs a ride now. Wheelchair-accessible vehicles are part of the service. Listing built from public information — call PSTA to confirm how to apply, current fares, and how far ahead to book.',
   'transportation', 'paratransit', 'transportation_assistance',
   '{"street": "3201 Scherer Dr", "city": "St Petersburg", "state": "FL", "zip": "33716"}'::jsonb,
   NULL, NULL, NULL, 'phone_intake', FALSE,
   '(727) 540-1900', NULL, 'https://psta.net/',
   'unknown',
   FALSE, TRUE, FALSE, TRUE,
   'gender_inclusive', '{}',
   FALSE, FALSE, FALSE, FALSE,
   TRUE, FALSE, NULL,
   '{"summary": "Call PSTA customer service for eligibility, booking windows and current fares", "source_url": "https://psta.net/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"paratransit","ADA","wheelchair accessible","door to door","ride:kind:paratransit","ride:mode:paratransit","ride:mode:wheelchair","ride:elig:disability","ride:area:pinellas","ride:notice:enrollment","ride:notice:next_day"}',
   'PSTA-001-access', 'transportation_batch_1', 'migration_041', NOW(),
   35, 'pending', TRUE),

  -- ── PSTA Mobility on Demand ──
  ('2a6efd49-1bbc-5085-9869-1ef37f08a5af', '11709abb-23f8-5cc0-ad48-e0487b1284f5',
   'PSTA Mobility on Demand (MOD)',
   'On-demand, curb-to-curb rides for people already approved for PSTA Access, booked through providers including Uber, Lyft, zTrip and a wheelchair-accessible service rather than a shared paratransit van. As PSTA publishes it, MOD opens up after the first two months of Access eligibility — new Access riders are not eligible straight away. This is the closest thing PSTA offers to an on-demand ride, but it still starts with being certified for Access, which takes time. Listing built from public information — call PSTA to confirm eligibility, current trip limits and what each ride costs.',
   'transportation', 'subsidized_rideshare', 'transportation_assistance',
   '{"street": "3201 Scherer Dr", "city": "St Petersburg", "state": "FL", "zip": "33716"}'::jsonb,
   NULL, NULL, NULL, 'phone_intake', FALSE,
   '(727) 540-1900', NULL, 'https://psta.net/',
   'unknown',
   FALSE, TRUE, FALSE, TRUE,
   'gender_inclusive', '{}',
   FALSE, FALSE, FALSE, FALSE,
   TRUE, FALSE, NULL,
   '{"summary": "Call PSTA customer service — MOD is arranged through PSTA Access", "source_url": "https://psta.net/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"rideshare","wheelchair accessible","on demand","ride:kind:subsidized_rideshare","ride:mode:rideshare","ride:mode:wheelchair","ride:elig:disability","ride:area:pinellas","ride:notice:enrollment"}',
   'PSTA-001-mod', 'transportation_batch_1', 'migration_041', NOW(),
   35, 'pending', TRUE),

  -- ── PSTA Direct Connect ──
  -- The only Pinellas programme here that a person can realistically use on
  -- the day they need it, which is why it carries ride:notice:same_day and no
  -- enrollment notice. That makes it the one this batch will most often rank
  -- first for "right now", so its description has to be honest about the
  -- limit: it covers the leg to or from a transit location, not the whole trip.
  ('19b367dd-cef1-5aaf-be9f-a4dfdba7174e', '11709abb-23f8-5cc0-ad48-e0487b1284f5',
   'PSTA Direct Connect — Subsidized First/Last-Mile Rides',
   'Subsidizes the short rideshare leg between a designated PSTA transit location and where you actually need to be, through providers including Uber, Lyft, zTrip and a wheelchair-accessible service. It is a first-and-last-mile programme, not a whole-trip ride: the bus still covers the middle. As of September 2026 the maintainer records the programme operating through eight designated transit locations, so which stop you start or finish at decides whether it applies. No disability or income certification is involved, which makes this the Pinellas option most likely to work on the day you need it. Listing built from public information — call PSTA to confirm which locations are covered and what your share of the fare is.',
   'transportation', 'subsidized_rideshare', 'transportation_assistance',
   '{"street": "3201 Scherer Dr", "city": "St Petersburg", "state": "FL", "zip": "33716"}'::jsonb,
   NULL, NULL, NULL, 'phone_intake', FALSE,
   '(727) 540-1900', NULL, 'https://psta.net/',
   'unknown',
   FALSE, FALSE, FALSE, FALSE,
   'gender_inclusive', '{}',
   FALSE, FALSE, FALSE, FALSE,
   TRUE, TRUE, NULL,
   '{"summary": "Rides are booked through the rideshare app at a designated transit location — call PSTA for the current list", "source_url": "https://psta.net/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"rideshare","first mile","last mile","subsidized","ride:kind:subsidized_rideshare","ride:mode:rideshare","ride:mode:wheelchair","ride:area:pinellas","ride:notice:same_day"}',
   'PSTA-001-direct-connect', 'transportation_batch_1', 'migration_041', NOW(),
   35, 'pending', TRUE),

  -- ── HARTPlus paratransit ──
  ('bf6af31a-3742-5fb3-88d6-f885776a7ea8', '967088ee-272e-57ce-8c50-32e2e71b5c8d',
   'HARTPlus Paratransit',
   'Door-to-door shared van rides in Hillsborough County for people whose disability prevents them from using the regular bus, in ADA-compliant vehicles. The published fare is $4 each way, paid in cash or by pre-purchased voucher, and once you are enrolled trips are booked one to three days in advance. Getting enrolled is the slow part: an application plus an in-person interview and, where needed, a functional evaluation, which HART documents as taking at least 21 days. Worth starting before you need it rather than on the day. Listing built from public information — call HART to confirm the current fare, the booking window and how to apply.',
   'transportation', 'paratransit', 'transportation_assistance',
   '{"street": "1201 E 7th Ave", "city": "Tampa", "state": "FL", "zip": "33605"}'::jsonb,
   NULL, NULL, NULL, 'phone_intake', FALSE,
   '(813) 254-4278', NULL, 'https://www.gohart.org/',
   'unknown',
   FALSE, TRUE, FALSE, TRUE,
   'gender_inclusive', '{}',
   FALSE, FALSE, FALSE, FALSE,
   TRUE, FALSE, NULL,
   '{"summary": "Call HART customer service for eligibility, booking and current fares", "source_url": "https://www.gohart.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"paratransit","ADA","wheelchair accessible","door to door","ride:kind:paratransit","ride:mode:paratransit","ride:mode:wheelchair","ride:elig:disability","ride:area:hillsborough","ride:notice:enrollment","ride:notice:next_day"}',
   'HART-001-hartplus', 'transportation_batch_1', 'migration_041', NOW(),
   35, 'pending', TRUE),

  -- ── HART Travel Training ──
  -- Not a ride, and deliberately in the list anyway: for someone who could
  -- use the bus but has never worked out how, one free session is a better
  -- answer than a paratransit application that takes three weeks.
  ('0553abc4-07bd-55cf-ba34-9419cea1b2f9', '967088ee-272e-57ce-8c50-32e2e71b5c8d',
   'HART Travel Training',
   'Free one-on-one training in how to use the bus in Hillsborough County — planning a trip, reading the schedule, paying the fare, changing routes, and doing a practice run of the journey you actually need to make. Offered in English and Spanish. This is not a ride, and it does not cost anything: it is for people who could use the regular bus but have never had anyone show them how, which is a far quicker route to independence than a paratransit application. Listing built from public information — call HART to arrange a session and confirm what is currently offered.',
   'transportation', 'travel_training', 'transportation_assistance',
   '{"street": "1201 E 7th Ave", "city": "Tampa", "state": "FL", "zip": "33605"}'::jsonb,
   NULL, NULL, NULL, 'phone_intake', FALSE,
   '(813) 254-4278', NULL, 'https://www.gohart.org/',
   'unknown',
   FALSE, FALSE, FALSE, TRUE,
   'gender_inclusive', '{}',
   FALSE, FALSE, FALSE, FALSE,
   FALSE, TRUE, NULL,
   '{"summary": "Call HART customer service to arrange a training session", "source_url": "https://www.gohart.org/", "basis": "org_website"}'::jsonb,
   '{"English","Spanish"}',
   '{"travel training","bus","free","English","Spanish","ride:kind:travel_training","ride:mode:bus","ride:area:hillsborough"}',
   'HART-001-travel-training', 'transportation_batch_1', 'migration_041', NOW(),
   35, 'pending', TRUE)

ON CONFLICT (id) DO NOTHING;
