-- ================================================================
-- StreetRise — Migration 022: Map Listings for Central Florida Orgs
-- Adds public map `resources` for the three Orlando providers seeded
-- in migration 020, so they appear on the map (not just on /work).
--
-- Seeded as verification_status='pending' → they render with the
-- amber "Community Listed" badge. A staff member verifies the
-- resource in AdminResources after a phone check, flipping it to the
-- green "Staff Verified" badge.
--
-- Public map query requires: is_active = true AND verification_status
-- IN ('verified','pending') AND is_map_ready = true AND lat/lng NOT NULL.
-- ================================================================

INSERT INTO resources (
  id, provider_id, name, description, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website,
  availability_status, beds_total, beds_available,
  walk_ins_accepted, requires_id, requires_referral,
  hours_of_operation,
  verification_status, is_active
) VALUES

  -- ── Second Harvest Food Bank of Central Florida ───────────────
  ('1e5a5d28-fb8b-4bb0-a8c2-b493d1ff07ee', '79889638-4146-4e8d-b077-a9535e4f4cce',
   'Second Harvest Food Bank of Central Florida',
   'Regional food bank serving Central Florida through a network of partner agencies and direct-service programs, including a community kitchen and mobile pantries. To find food near you, use the agency locator on the website. Listing sourced from public information — call to confirm distribution times and eligibility.',
   'food', 'food_bank',
   '{"street": "411 Mercy Dr", "city": "Orlando", "state": "FL", "zip": "32805"}'::jsonb, 28.5660, -81.4282, 'onsite', TRUE,
   '407-295-1066', NULL, 'https://feedhopenow.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}'::jsonb,
   'pending', TRUE),

  -- ── Coalition for the Homeless of Central Florida ─────────────
  ('7e4903e4-fc9c-485d-9181-367f6b6a27f0', '17923725-b344-4529-9fa0-ccf206914682',
   'Coalition for the Homeless of Central Florida',
   'Downtown Orlando''s largest provider of homeless services — emergency shelter and supportive programs for men, women, and children, including the Center for Women and Families. Listing sourced from public information — call to confirm intake hours and availability.',
   'shelter', 'emergency_shelter',
   '{"street": "18 N Terry Ave", "city": "Orlando", "state": "FL", "zip": "32801"}'::jsonb, 28.5436, -81.3853, 'onsite', TRUE,
   '(407) 426-1250', NULL, 'https://www.centralfloridahomeless.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}'::jsonb,
   'pending', TRUE),

  -- ── Habitat for Humanity Greater Orlando & Osceola ────────────
  ('be97afa6-58aa-4f1b-9e6e-0c26cdf689cf', '2bef4558-5482-4724-a5e5-a1adbabde185',
   'Habitat for Humanity Greater Orlando & Osceola County',
   'Affordable homeownership program serving qualified families through volunteer-built homes, plus a ReStore and year-round volunteer opportunities. Call or visit the website for homeownership eligibility and to get involved. Listing sourced from public information — call to confirm program details.',
   'other', 'affordable_housing',
   '{"street": "4116 Silver Star Rd", "city": "Orlando", "state": "FL", "zip": "32808"}'::jsonb, 28.5786, -81.4476, 'onsite', TRUE,
   '(407) 648-4567', NULL, 'https://habitatorlando.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}'::jsonb,
   'pending', TRUE)

ON CONFLICT (id) DO NOTHING;
