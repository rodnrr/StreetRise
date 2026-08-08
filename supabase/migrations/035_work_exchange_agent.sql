-- ================================================================
-- StreetRise — Migration 035: Work Exchange agent support
--
-- Two problems this fixes:
--
-- 1. `work_exchanges` rows have no provenance. Migrations 020 and 028
--    seeded 17 listings transcribed from public "get involved / careers"
--    pages, but the row does not record which page it came from or when
--    anyone last confirmed it was still real. A listing whose source page
--    rotated months ago looks exactly like one posted yesterday.
--
-- 2. There is nowhere to stage a proposed change. An agent that reads a
--    provider's volunteer page must not write to `work_exchanges` — that
--    table is what /work renders to people looking for work. Proposals
--    land in `work_exchange_candidates` and an admin decides.
--
-- The agent (scripts/work-exchange-agent.ts) writes exactly one field on
-- `work_exchanges` directly: `last_verified_at` / `last_verify_status`,
-- which record that a check happened. Every content change goes through
-- the review queue.
-- ================================================================

-- ── 1. Provenance on work_exchanges ─────────────────────────────

ALTER TABLE work_exchanges
  ADD COLUMN IF NOT EXISTS external_id        TEXT,
  ADD COLUMN IF NOT EXISTS source_url         TEXT,
  ADD COLUMN IF NOT EXISTS source_type        TEXT NOT NULL DEFAULT 'provider_posted',
  ADD COLUMN IF NOT EXISTS last_verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verify_status TEXT;

-- Stable, human-readable id so an importer or agent can find the same
-- listing again across runs. Same convention as resources.external_id
-- (migration 016). Partial index so the many NULLs don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_work_exchanges_external_id
  ON work_exchanges (external_id)
  WHERE external_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_exchanges_source_type_check'
  ) THEN
    ALTER TABLE work_exchanges
      ADD CONSTRAINT work_exchanges_source_type_check
      CHECK (source_type IN ('provider_posted', 'seeded', 'agent_assisted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_exchanges_last_verify_status_check'
  ) THEN
    ALTER TABLE work_exchanges
      ADD CONSTRAINT work_exchanges_last_verify_status_check
      CHECK (last_verify_status IS NULL
             OR last_verify_status IN ('confirmed', 'changed', 'gone', 'unreachable'));
  END IF;
END $$;

-- Drives the "check the least recently verified first" ordering in the agent.
CREATE INDEX IF NOT EXISTS idx_work_exchanges_last_verified_at
  ON work_exchanges (last_verified_at NULLS FIRST)
  WHERE is_active = TRUE;

-- ── 2. Backfill the seeded listings (migrations 020 and 028) ─────
-- Source URLs are the ones already quoted in each listing's description,
-- which is where the "Apply on Website" CTA sends people.

UPDATE work_exchanges SET
  source_type = 'seeded',
  external_id = v.external_id,
  source_url  = v.source_url
FROM (VALUES
  -- Migration 020
  ('6625cdb5-6aeb-49f8-9fc8-b1d33b518ce7', 'WX-METROMIN-001', 'https://metromin.org/get-involved/volunteer/individual/'),
  ('442b29fc-913a-4189-badd-52aca365bdc3', 'WX-METROMIN-002', 'https://metromin.org/volunteer-leader-program/'),
  ('eb5f7d6b-ea34-4e88-be0c-a9ce8554f9ec', 'WX-METROMIN-003', 'https://metromin.org/americorps/'),
  ('c2e101e0-e3cc-45fd-95b4-1f4203f470ce', 'WX-FTB-001',      'https://volunteer.ftb.org/'),
  ('499153b6-4e72-4fee-929a-265108280090', 'WX-FTB-002',      'https://volunteer.ftb.org/'),
  ('76ea85cd-5656-48cf-b8ad-528d82ff55ff', 'WX-FTB-003',      'https://volunteer.ftb.org/'),
  ('13a6f9c3-e6c4-4cdf-823d-fac9360c12b8', 'WX-FTBPIN-001',   'https://volunteer.ftb.org/'),
  ('8d726cbb-c6d1-4875-975d-ca5cc778236d', 'WX-TALBOT-001',   'https://talbothouse.org/volunteer/'),
  ('c17b5aad-961d-4750-83ff-c2797878a560', 'WX-TALBOT-002',   'https://talbothouse.org/volunteer/'),
  ('cca4e7ac-30d0-4cb9-9f5d-a71858cf1c40', 'WX-SHFBCF-001',   'https://feedhopenow.org/get-involved/volunteer/'),
  ('6c1ae117-05d6-4b90-ad48-0b73e9a5afb2', 'WX-SHFBCF-002',   'https://feedhopenow.org/get-involved/volunteer/'),
  ('477d0354-615e-410d-bc2e-6319574fb028', 'WX-CFHOME-001',   'https://www.centralfloridahomeless.org/take-action'),
  ('ccd9a5a9-fb4a-438d-bd82-0e47ee4e6278', 'WX-CFHOME-002',   'https://www.centralfloridahomeless.org/take-action'),
  ('78175fb9-a5be-4216-92cf-785670b874f4', 'WX-HABORL-001',   'https://habitatorlando.org/volunteer/'),
  -- Migration 028
  ('a69371d0-b4a4-464c-b35d-5b8d4a382503', 'WX-HABORL-002',   'https://habitatorlando.org/volunteer/'),
  ('f61a66a9-c6c1-4b3c-ae02-496d062cb3fe', 'WX-FTB-004',      'https://feedingtampabay.org/careers/'),
  ('335ad411-3173-4164-8782-4f5a1cf73cba', 'WX-FTB-005',      'https://feedingtampabay.org/careers/')
) AS v(id, external_id, source_url)
WHERE work_exchanges.id = v.id::uuid
  AND work_exchanges.external_id IS NULL;

-- ── 3. The review queue ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_exchange_candidates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What the agent is proposing.
  --   new     — a listing it found that we do not have
  --   update   — an existing listing whose source page now says something else
  --   delist   — an existing listing the source page no longer advertises
  kind             TEXT NOT NULL CHECK (kind IN ('new', 'update', 'delist')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),

  -- NULL for `new`; set for `update` / `delist`.
  work_exchange_id UUID REFERENCES work_exchanges(id) ON DELETE CASCADE,
  -- Required for `new` (the listing needs an owner); carried for the others
  -- so the queue can be grouped by organization without a join.
  provider_id      UUID REFERENCES providers(id) ON DELETE CASCADE,

  external_id      TEXT,
  source_url       TEXT NOT NULL,

  -- The proposed work_exchanges payload: title, description, exchange_type,
  -- hours_per_week, compensation, skills_required, skills_gained, address.
  -- JSONB rather than 10 mirrored columns because nothing queries inside it —
  -- the admin screen reads it whole and writes the approved keys across.
  proposed         JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Why the agent thinks this. `evidence` is a verbatim quote from the source
  -- page; without it a reviewer cannot tell a real finding from a fabrication.
  agent_run_id     TEXT NOT NULL,
  agent_model      TEXT,
  agent_note       TEXT,
  evidence         TEXT,
  confidence       SMALLINT CHECK (confidence BETWEEN 0 AND 100),

  reviewed_by      UUID REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  review_note      TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wx_candidates_status     ON work_exchange_candidates (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wx_candidates_work_ex    ON work_exchange_candidates (work_exchange_id);
CREATE INDEX IF NOT EXISTS idx_wx_candidates_provider   ON work_exchange_candidates (provider_id);
CREATE INDEX IF NOT EXISTS idx_wx_candidates_run        ON work_exchange_candidates (agent_run_id);

-- One open proposal per (listing, kind), so re-running the agent nightly
-- tops up the queue instead of duplicating it.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wx_candidate_open_existing
  ON work_exchange_candidates (work_exchange_id, kind)
  WHERE status = 'pending' AND work_exchange_id IS NOT NULL;

-- Same idea for `new`, which has no listing to key on yet.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wx_candidate_open_new
  ON work_exchange_candidates (source_url, lower(proposed ->> 'title'))
  WHERE status = 'pending' AND work_exchange_id IS NULL;

DROP TRIGGER IF EXISTS work_exchange_candidates_updated_at ON work_exchange_candidates;
CREATE TRIGGER work_exchange_candidates_updated_at
  BEFORE UPDATE ON work_exchange_candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. RLS — admins only ────────────────────────────────────────
-- Not public (unreviewed machine output about real organizations) and not
-- provider-readable (a provider should not see a draft about their org
-- before a human has looked at it). The agent itself runs with the service
-- role key, which bypasses RLS.

ALTER TABLE work_exchange_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wx_candidates_admin_all ON work_exchange_candidates;
CREATE POLICY wx_candidates_admin_all ON work_exchange_candidates
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
