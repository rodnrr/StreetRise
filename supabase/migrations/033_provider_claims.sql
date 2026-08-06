-- ================================================================
-- StreetRise — Migration 033: Provider claim submissions
--
-- Migrations 023–027 shipped the claim *mechanism* (claim_status,
-- source_type, and the RLS that lets a signed-in user move a seeded
-- row from 'unclaimed' → 'pending_claim'). This migration adds the two
-- things the claim *UI* needs on top of it.
--
-- ── 1. Somewhere to put the claim evidence ───────────────────────
-- providers_claim_submit (025) locks every column on `providers`
-- except user_id and claim_status. That is the right call — a
-- claimant must not be able to rewrite a seeded org's name, contact
-- details, or source_type on the way in — but it leaves nowhere to
-- record WHO is claiming and WHY.
--
-- Without that, admin approval is blind: the reviewer sees a bare
-- user_id UUID and has no way to judge whether this person actually
-- works for the organization. Approving a claim hands over control of
-- that org's listings, so the reviewer needs something to go on.
--
-- The evidence therefore lives in its own admin-readable table, for
-- the same reason `conversation_admin_notes` exists (migration 018):
-- the parent row is publicly readable, so anything sensitive has to
-- sit beside it under stricter RLS, not on it.
--
-- ── 2. Keep orgs visible while a claim is in review ──────────────
-- Before this migration, submitting a claim made an org vanish from
-- /work and from every public provider read: a 'pending_claim' row
-- matches neither providers_unclaimed_read (unclaimed only) nor
-- providers_public_read (verified only, and the claim forces the row
-- to 'pending'). An organization dropping off the public site because
-- someone claimed it is a bug, so a read policy covers that state.
--
-- This is safe precisely because of (1): the providers row itself
-- carries no claimant PII — the email and note are in provider_claims,
-- which the public cannot read.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. provider_claims
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS provider_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,

  -- Captured from the claimant's JWT, not from form input — the RLS
  -- policy below pins it to auth.jwt()->>'email' so a claimant cannot
  -- submit under somebody else's address.
  claim_email   text NOT NULL,

  -- Free text from the claimant: their role at the org, how to reach
  -- them, anything that helps a reviewer decide.
  claim_note    text,

  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','denied')),
  decided_at    timestamptz,
  decided_by    uuid,
  decision_note text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_claims_provider ON provider_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_claims_user     ON provider_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_claims_status   ON provider_claims(status);

-- One live claim per person per org. Re-claiming after a denial is
-- allowed; spamming the queue with duplicates is not.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_claims_open
  ON provider_claims(provider_id, user_id)
  WHERE status = 'pending';

ALTER TABLE provider_claims ENABLE ROW LEVEL SECURITY;

-- The claimant may file a claim as themselves, with their own email.
CREATE POLICY provider_claims_insert_self ON provider_claims
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND claim_email = (auth.jwt() ->> 'email')
    AND status = 'pending'
  );

-- The claimant may read their own claims (to see review state) …
CREATE POLICY provider_claims_own_read ON provider_claims
  FOR SELECT
  USING (user_id = auth.uid());

-- … and withdraw one that has not been decided yet. This also lets the
-- UI clean up after itself when the follow-up providers UPDATE fails.
CREATE POLICY provider_claims_delete_own_pending ON provider_claims
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

-- Admins see and decide everything.
CREATE POLICY provider_claims_admin_read ON provider_claims
  FOR SELECT USING (is_admin());
CREATE POLICY provider_claims_admin_update ON provider_claims
  FOR UPDATE USING (is_admin());
CREATE POLICY provider_claims_admin_delete ON provider_claims
  FOR DELETE USING (is_admin());


-- ════════════════════════════════════════════════════════════════
-- 2. Keep an org publicly visible while its claim is in review
-- ════════════════════════════════════════════════════════════════
-- Additive: SELECT policies are OR'd, so this widens visibility to the
-- one state that previously fell through the gap. providers_public_read
-- (verified) and providers_unclaimed_read (unclaimed) are untouched.

CREATE POLICY providers_pending_claim_read ON providers
  FOR SELECT
  USING (claim_status = 'pending_claim');


-- ================================================================
-- Verification (run after applying)
-- ================================================================
--   -- 4 SELECT policies on providers: public / own / admin / unclaimed
--   -- + the new pending_claim one = 5
--   SELECT polname FROM pg_policy WHERE polrelid = 'providers'::regclass;
--
--   -- 6 policies on provider_claims
--   SELECT polname FROM pg_policy WHERE polrelid = 'provider_claims'::regclass;
--
--   -- anon must NOT be able to read claim evidence
--   SET LOCAL ROLE anon;
--   SELECT count(*) FROM provider_claims;   -- → 0 rows visible
-- ================================================================
