-- ================================================================
-- StreetRise — Migration 057: Seed the 50 states + DC
--
-- Reference rows only. Every `record_lookback_summary` and
-- `has_housing_ban_the_box` ships NULL.
--
-- That is deliberate, not laziness. These two columns make legal
-- claims, and a wrong one here is worse than an absent one in both
-- directions: telling somebody their state caps lookback at seven years
-- when it does not sends them into an application unprepared, and
-- telling them they have no protection when they do costs them a home
-- they were entitled to apply for. So a state's row says nothing until
-- a human has read that state's actual statute or ordinance and written
-- the summary against it.
--
-- The state page renders the summary block only when the text is
-- present, and otherwise says plainly that we have not researched this
-- state yet and points at the national resources. Populating a state is
-- a content task — an UPDATE on one row — not a schema change.
--
-- Florida is populated separately in migration 058, as Phase 1's
-- reference state.
-- ================================================================

INSERT INTO housing_states (code, name) VALUES
  ('AL', 'Alabama'),
  ('AK', 'Alaska'),
  ('AZ', 'Arizona'),
  ('AR', 'Arkansas'),
  ('CA', 'California'),
  ('CO', 'Colorado'),
  ('CT', 'Connecticut'),
  ('DE', 'Delaware'),
  ('DC', 'District of Columbia'),
  ('FL', 'Florida'),
  ('GA', 'Georgia'),
  ('HI', 'Hawaii'),
  ('ID', 'Idaho'),
  ('IL', 'Illinois'),
  ('IN', 'Indiana'),
  ('IA', 'Iowa'),
  ('KS', 'Kansas'),
  ('KY', 'Kentucky'),
  ('LA', 'Louisiana'),
  ('ME', 'Maine'),
  ('MD', 'Maryland'),
  ('MA', 'Massachusetts'),
  ('MI', 'Michigan'),
  ('MN', 'Minnesota'),
  ('MS', 'Mississippi'),
  ('MO', 'Missouri'),
  ('MT', 'Montana'),
  ('NE', 'Nebraska'),
  ('NV', 'Nevada'),
  ('NH', 'New Hampshire'),
  ('NJ', 'New Jersey'),
  ('NM', 'New Mexico'),
  ('NY', 'New York'),
  ('NC', 'North Carolina'),
  ('ND', 'North Dakota'),
  ('OH', 'Ohio'),
  ('OK', 'Oklahoma'),
  ('OR', 'Oregon'),
  ('PA', 'Pennsylvania'),
  ('RI', 'Rhode Island'),
  ('SC', 'South Carolina'),
  ('SD', 'South Dakota'),
  ('TN', 'Tennessee'),
  ('TX', 'Texas'),
  ('UT', 'Utah'),
  ('VT', 'Vermont'),
  ('VA', 'Virginia'),
  ('WA', 'Washington'),
  ('WV', 'West Virginia'),
  ('WI', 'Wisconsin'),
  ('WY', 'Wyoming')
ON CONFLICT (code) DO NOTHING;

-- ON CONFLICT DO NOTHING, not DO UPDATE: re-running this must never
-- wipe a researched summary back to NULL.
