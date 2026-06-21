-- ================================================================
-- StreetRise — Migration 020: Work Exchange Seed (Tampa Bay)
-- Populates the work_exchanges table (the /work page reads this table;
-- migration 008's "work_exchange" rows live in `resources` and never
-- appear here). Sourced from public "get involved / volunteer" pages.
--
-- All listings are attached to providers that are ALREADY verified, so
-- the /work card renders the org name and a working "Apply on Website"
-- button (the page joins providers and public RLS only exposes verified
-- providers). No new verification claims are made here.
--
-- Anchor providers (from migration 008, verified in production):
--   Metropolitan Ministries          9a2aeb8e-4f90-51b4-555b-fe31d9868a3f
--   Feeding Tampa Bay                 71d1eb89-d485-b42f-7031-b39e79c214c0
--   Feeding Tampa Bay - Pinellas      0a9cbb32-ba12-d451-8439-2465d21195b6
-- ================================================================

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
   '{"street": "6330 54th Ave N", "city": "St. Petersburg", "state": "FL", "zip": "33709"}'::jsonb)

ON CONFLICT (id) DO NOTHING;
