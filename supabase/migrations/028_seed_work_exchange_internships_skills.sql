-- ================================================================
-- StreetRise — Migration 028: Work Exchange Seed — Internships & Skills Trade
-- Fills the two thin/empty filters on the /work page: at launch
-- `skills_trade` had zero listings and `internship` had only one
-- (Talbot House). These are real, publicly documented programs at
-- providers already seeded as verified in migration 020, so each /work
-- card renders the org name and a working "Apply on Website" CTA.
--
-- Sourced from public "get involved / careers" pages:
--   Habitat Orlando — Crew Leader volunteers   (skills_trade)
--   Feeding Tampa Bay — Neighbor Services intern (internship)
--   Feeding Tampa Bay — Youth Ambassador / No Kid Hungry (internship)
-- ================================================================

INSERT INTO work_exchanges (
  id, provider_id, title, description, exchange_type,
  hours_per_week, compensation, skills_required, skills_gained,
  is_active, lat, lng, address
) VALUES

  -- ── Habitat for Humanity Greater Orlando & Osceola — Crew Leader ──
  ('a69371d0-b4a4-464c-b35d-5b8d4a382503', '2bef4558-5482-4724-a5e5-a1adbabde185',
   'Construction Crew Leader (Skilled Volunteer)',
   'Crew leaders are experienced volunteers who come to the build site regularly to guide and train less-experienced volunteers through framing, siding, drywall, painting, and finish work. Professional construction experience is not required, but familiarity with tools and building materials is strongly preferred. Habitat runs virtual Crew Leader info sessions and provides on-site training. Listing sourced from public information — sign up and find an info session at habitatorlando.org/volunteer/.',
   'skills_trade',
   NULL, NULL, '{tool familiarity,carpentry basics,reliability}', '{construction leadership,jobsite coordination,mentoring}',
   TRUE, 28.5786, -81.4476,
   '{"street": "4116 Silver Star Rd", "city": "Orlando", "state": "FL", "zip": "32808"}'::jsonb),

  -- ── Feeding Tampa Bay — Neighbor Services Internship ─────────────
  ('f61a66a9-c6c1-4b3c-ae02-496d062cb3fe', '71d1eb89-d485-b42f-7031-b39e79c214c0',
   'Neighbor Services Internship',
   'A hands-on internship for students in social work, human services, or counseling, working alongside nonprofit professionals to support neighbors facing food insecurity. Responsibilities vary by experience level; associate, bachelor, master, and PhD students are eligible and can earn college credit. Listing sourced from public information — review eligibility and apply on the Feeding Tampa Bay careers page at feedingtampabay.org/careers/.',
   'internship',
   NULL, 'Unpaid; eligible for college credit', '{social work coursework,communication}', '{case support,social services,nonprofit operations}',
   TRUE, 27.9748, -82.3867,
   '{"street": "4702 Transport Dr, Bldg 6", "city": "Tampa", "state": "FL", "zip": "33605"}'::jsonb),

  -- ── Feeding Tampa Bay — Youth Ambassador (No Kid Hungry) ─────────
  ('335ad411-3173-4164-8782-4f5a1cf73cba', '71d1eb89-d485-b42f-7031-b39e79c214c0',
   'Youth Ambassador Internship (No Kid Hungry)',
   'A paid summer internship for undergraduates working to end childhood hunger with a local No Kid Hungry partner. Ambassadors complete roughly 360 hours over a ten-week term and receive a stipend. A great fit for students who want real campaign, outreach, and program experience. Listing sourced from public information — check current openings on the Feeding Tampa Bay careers page at feedingtampabay.org/careers/.',
   'internship',
   40, 'Summer stipend (up to ~$6,000 for the 10-week term)', '{undergraduate enrollment,communication}', '{community outreach,campaign work,program development}',
   TRUE, 27.9748, -82.3867,
   '{"street": "4702 Transport Dr, Bldg 6", "city": "Tampa", "state": "FL", "zip": "33605"}'::jsonb)

ON CONFLICT (id) DO NOTHING;
