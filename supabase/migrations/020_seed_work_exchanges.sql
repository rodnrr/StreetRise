-- ================================================================
-- StreetRise — Migration 020: Work Exchange Seed (Tampa → Orlando)
-- Populates the work_exchanges table (the /work page reads this table;
-- migration 008's "work_exchange" rows live in `resources` and never
-- appear here). Sourced from public "get involved / volunteer" pages.
--
-- All listings attach to providers that are verified, so the /work card
-- renders the org name and a working "Apply on Website" button (the page
-- joins providers, and public RLS only exposes verified providers).
--
-- Corridor coverage:
--   Tampa        — Metropolitan Ministries, Feeding Tampa Bay
--   St. Pete     — Feeding Tampa Bay - Pinellas
--   Lakeland     — Talbot House Ministries (existing verified provider)
--   Orlando      — Second Harvest Food Bank of Central FL,
--                  Coalition for the Homeless of Central FL,
--                  Habitat for Humanity Greater Orlando & Osceola
-- ================================================================

-- ── Fix broken provider link ──────────────────────────────────
-- Talbot House's stored website (talbothouseministries.com) is dead;
-- the live site is talbothouse.org. Point it at the volunteer page so
-- the "Apply on Website" CTA works.
UPDATE providers
   SET website = 'https://talbothouse.org/volunteer/'
 WHERE id = 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069'
   AND website = 'https://talbothouseministries.com/';

-- ── New verified Central Florida (Orlando) providers ──────────
-- Major, publicly documented orgs seeded the same way as the
-- migration 008 anchors (Metropolitan Ministries, Feeding Tampa Bay).
INSERT INTO providers (id, user_id, organization_name, contact_name, contact_email, contact_phone, website, verification_status, role)
VALUES
  ('79889638-4146-4e8d-b077-a9535e4f4cce', NULL, 'Second Harvest Food Bank of Central Florida', 'Volunteer Services', 'volunteers@feedhopenow.org', '407-295-1066', 'https://feedhopenow.org/get-involved/volunteer/', 'verified', 'provider'),
  ('17923725-b344-4529-9fa0-ccf206914682', NULL, 'Coalition for the Homeless of Central Florida', 'Volunteer Coordinator', 'volunteer@cflhomeless.org', '407-426-1263', 'https://www.centralfloridahomeless.org/take-action', 'verified', 'provider'),
  ('2bef4558-5482-4724-a5e5-a1adbabde185', NULL, 'Habitat for Humanity Greater Orlando & Osceola County', 'Volunteer Services', 'contact@habitat_greater_orlando.placeholder', '(407) 234-5555', 'https://habitatorlando.org/volunteer/', 'verified', 'provider')
ON CONFLICT (id) DO NOTHING;

-- ── Work exchange listings ────────────────────────────────────
INSERT INTO work_exchanges (
  id, provider_id, title, description, exchange_type,
  hours_per_week, compensation, skills_required, skills_gained,
  is_active, lat, lng, address
) VALUES

  -- ── Metropolitan Ministries (Tampa campus) ────────────────────
  ('6625cdb5-6aeb-49f8-9fc8-b1d33b518ce7', '9a2aeb8e-4f90-51b4-555b-fe31d9868a3f',
   'Individual Volunteer — Tampa Campus',
   'Help serve families facing homelessness and poverty at the Metropolitan Ministries main campus — sorting in the food warehouse, packing meals, and supporting community events. No experience needed; individuals age 16+ may sign up. Choose a shift on the volunteer portal at metromin.org/get-involved/volunteer/individual/.',
   'volunteering',
   NULL, NULL, '{}', '{teamwork,food handling,community service}',
   TRUE, 27.9614, -82.4597,
   '{"street": "2002 N Florida Ave", "city": "Tampa", "state": "FL", "zip": "33602"}'::jsonb),

  ('442b29fc-913a-4189-badd-52aca365bdc3', '9a2aeb8e-4f90-51b4-555b-fe31d9868a3f',
   'Volunteer Leader Program',
   'A hands-on leadership role for experienced volunteers, with in-person training, flexible scheduling, and mentorship. Volunteer Leaders help guide and support other volunteers across Metropolitan Ministries programs. Learn more and apply at metromin.org/volunteer-leader-program/.',
   'volunteering',
   NULL, NULL, '{}', '{leadership,mentorship,volunteer coordination}',
   TRUE, 27.9614, -82.4597,
   '{"street": "2002 N Florida Ave", "city": "Tampa", "state": "FL", "zip": "33602"}'::jsonb),

  ('eb5f7d6b-ea34-4e88-be0c-a9ce8554f9ec', '9a2aeb8e-4f90-51b4-555b-fe31d9868a3f',
   'AmeriCorps VISTA Member',
   'A full-time, one-year AmeriCorps VISTA term in capacity building — volunteer recruitment, fundraising, grant writing, process improvement, and partnership development that expands services across the community. Members receive a living stipend plus an end-of-service award. Details at metromin.org/americorps/.',
   'paid',
   40, 'Living stipend + $1,800 end-of-service cash award or $6,345 Segal Education Award',
   '{}', '{grant writing,fundraising,program development,nonprofit management}',
   TRUE, 27.9614, -82.4597,
   '{"street": "2002 N Florida Ave", "city": "Tampa", "state": "FL", "zip": "33602"}'::jsonb),

  -- ── Feeding Tampa Bay (main warehouse) ────────────────────────
  ('c2e101e0-e3cc-45fd-95b4-1f4203f470ce', '71d1eb89-d485-b42f-7031-b39e79c214c0',
   'Warehouse Sort & Pack Volunteer',
   'Inspect, sort, and pack donated food at the Feeding Tampa Bay warehouse so it can reach neighbors across the region. No training required; ages 5+ welcome with an adult, 16+ may volunteer independently. The volunteer calendar shows real-time availability at volunteer.ftb.org.',
   'volunteering',
   NULL, NULL, '{}', '{warehouse operations,teamwork}',
   TRUE, 27.9748, -82.3867,
   '{"street": "4702 Transport Dr, Bldg 6", "city": "Tampa", "state": "FL", "zip": "33605"}'::jsonb),

  ('499153b6-4e72-4fee-929a-265108280090', '71d1eb89-d485-b42f-7031-b39e79c214c0',
   'Mobile Pantry Distribution Volunteer',
   'Stage, pack, and distribute groceries directly to families at mobile pantry sites across Tampa Bay. A physical, rewarding shift that puts food in neighbors'' hands the same day. First-come, first-served sign-up on the volunteer calendar at volunteer.ftb.org.',
   'volunteering',
   NULL, NULL, '{}', '{food distribution,community outreach,teamwork}',
   TRUE, 27.9748, -82.3867,
   '{"street": "4702 Transport Dr, Bldg 6", "city": "Tampa", "state": "FL", "zip": "33605"}'::jsonb),

  ('76ea85cd-5656-48cf-b8ad-528d82ff55ff', '71d1eb89-d485-b42f-7031-b39e79c214c0',
   'Trinity Café Meal Service Volunteer',
   'Greet and serve restaurant-style hot meals with dignity to neighbors at Trinity Café. Shifts are for volunteers age 16+. Sign up on the Feeding Tampa Bay volunteer portal at volunteer.ftb.org.',
   'volunteering',
   NULL, NULL, '{}', '{hospitality,food service,customer service}',
   TRUE, 27.9614, -82.4597,
   '{"street": "2801 N Nebraska Ave", "city": "Tampa", "state": "FL", "zip": "33602"}'::jsonb),

  -- ── Feeding Tampa Bay – Pinellas (St. Petersburg) ─────────────
  ('13a6f9c3-e6c4-4cdf-823d-fac9360c12b8', '0a9cbb32-ba12-d451-8439-2465d21195b6',
   'Empowerment Center Volunteer — St. Petersburg',
   'Support food distribution and neighbor services at the Feeding Pinellas Empowerment Center in St. Petersburg. Help with sorting, packing, and welcoming neighbors seeking food assistance. Sign up via the Feeding Tampa Bay volunteer portal at volunteer.ftb.org.',
   'volunteering',
   NULL, NULL, '{}', '{food distribution,customer service,teamwork}',
   TRUE, 27.81721, -82.73075,
   '{"street": "6330 54th Ave N", "city": "St. Petersburg", "state": "FL", "zip": "33709"}'::jsonb),

  -- ── Talbot House Ministries (Lakeland / Polk County) ──────────
  ('8d726cbb-c6d1-4875-975d-ca5cc778236d', 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069',
   'Comprehensive Care Center Volunteer',
   'Talbot House Ministries serves people experiencing homelessness in the heart of Polk County — three meals a day, a twice-weekly food pantry, low-barrier shelter, and a free medical clinic. Volunteers help across daily operations year-round. Email assist@talbothouse.net or see talbothouse.org/volunteer/ to get started.',
   'volunteering',
   NULL, NULL, '{}', '{food service,community service,teamwork}',
   TRUE, 28.042681, -81.906626,
   '{"street": "814 N Kentucky Ave", "city": "Lakeland", "state": "FL", "zip": "33801"}'::jsonb),

  ('c17b5aad-961d-4750-83ff-c2797878a560', 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069',
   'Student Internship',
   'Talbot House offers volunteer and internship experience for students who need service hours for college applications or coursework. Gain hands-on experience supporting a comprehensive homeless-services center. Inquire about specialized placements at assist@talbothouse.net or talbothouse.org/volunteer/.',
   'internship',
   NULL, NULL, '{}', '{social services,case support,community service}',
   TRUE, 28.042681, -81.906626,
   '{"street": "814 N Kentucky Ave", "city": "Lakeland", "state": "FL", "zip": "33801"}'::jsonb),

  -- ── Second Harvest Food Bank of Central Florida (Orlando) ─────
  ('cca4e7ac-30d0-4cb9-9f5d-a71858cf1c40', '79889638-4146-4e8d-b077-a9535e4f4cce',
   'Warehouse Volunteer — Sort & Pack',
   'Sort and pack donated food at Second Harvest Food Bank of Central Florida so it can reach families across the six-county region. No experience needed; individuals and small groups welcome. Browse the volunteer calendar and sign up at feedhopenow.org/get-involved/volunteer/.',
   'volunteering',
   NULL, NULL, '{}', '{warehouse operations,teamwork,food handling}',
   TRUE, 28.5660, -81.4282,
   '{"street": "411 Mercy Dr", "city": "Orlando", "state": "FL", "zip": "32805"}'::jsonb),

  ('6c1ae117-05d6-4b90-ad48-0b73e9a5afb2', '79889638-4146-4e8d-b077-a9535e4f4cce',
   'Community Kitchen Volunteer',
   'Help prepare and pack meals in the Second Harvest community kitchen for distribution to children and families across Central Florida. Shifts are hands-on and beginner-friendly. Find a shift at feedhopenow.org/get-involved/volunteer/.',
   'volunteering',
   NULL, NULL, '{}', '{food preparation,kitchen operations,teamwork}',
   TRUE, 28.5660, -81.4282,
   '{"street": "411 Mercy Dr", "city": "Orlando", "state": "FL", "zip": "32805"}'::jsonb),

  -- ── Coalition for the Homeless of Central Florida (Orlando) ───
  ('477d0354-615e-410d-bc2e-6319574fb028', '17923725-b344-4529-9fa0-ccf206914682',
   'Meal Service Volunteer',
   'Serve meals to men, women, and children at the Coalition for the Homeless of Central Florida, downtown Orlando''s largest provider of homeless services. Individuals and groups are welcome. Sign up and view opportunities at centralfloridahomeless.org/take-action.',
   'volunteering',
   NULL, NULL, '{}', '{hospitality,food service,community service}',
   TRUE, 28.5436, -81.3853,
   '{"street": "18 N Terry Ave", "city": "Orlando", "state": "FL", "zip": "32801"}'::jsonb),

  ('ccd9a5a9-fb4a-438d-bd82-0e47ee4e6278', '17923725-b344-4529-9fa0-ccf206914682',
   'Children''s Program Volunteer',
   'Support children and families at the Coalition''s Center for Women and Families through tutoring, mentoring, and activities. Help families experiencing homelessness build stability. Learn more and apply at centralfloridahomeless.org/take-action.',
   'volunteering',
   NULL, NULL, '{}', '{mentoring,childcare,tutoring}',
   TRUE, 28.5436, -81.3853,
   '{"street": "18 N Terry Ave", "city": "Orlando", "state": "FL", "zip": "32801"}'::jsonb),

  -- ── Habitat for Humanity Greater Orlando & Osceola (Orlando) ──
  ('78175fb9-a5be-4216-92cf-785670b874f4', '2bef4558-5482-4724-a5e5-a1adbabde185',
   'Construction Site Volunteer',
   'Build alongside future homeowners on a Habitat for Humanity Greater Orlando & Osceola construction site — raising walls, painting, and more. No construction experience required; volunteers must be 16+. Individual and group builds available year-round. Sign up at habitatorlando.org/volunteer/.',
   'volunteering',
   NULL, NULL, '{}', '{construction,carpentry,teamwork}',
   TRUE, 28.5786, -81.4476,
   '{"street": "4116 Silver Star Rd", "city": "Orlando", "state": "FL", "zip": "32808"}'::jsonb)

ON CONFLICT (id) DO NOTHING;
