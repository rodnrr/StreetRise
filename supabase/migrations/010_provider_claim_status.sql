-- ================================================================
-- StreetRise — Migration 010: Provider Claim Status + Source Type
-- Enables seeded org records to exist before a provider claims them.
-- ================================================================

-- ── Enums ────────────────────────────────────────────────────────

CREATE TYPE provider_claim_status AS ENUM (
  'unclaimed',      -- seeded row, no owner yet
  'pending_claim',  -- a user submitted a claim, awaiting admin review
  'claimed'         -- claim approved; user_id is the canonical owner
);

CREATE TYPE provider_source_type AS ENUM (
  'self_registered', -- org created via /portal/onboarding
  'seeded',          -- pre-loaded by StreetRise staff
  'imported'         -- bulk-imported via script
);

-- ── Columns ──────────────────────────────────────────────────────
-- Defaults of 'claimed' / 'self_registered' cover all existing
-- self-registered rows without requiring a backfill for them.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS claim_status provider_claim_status NOT NULL DEFAULT 'claimed',
  ADD COLUMN IF NOT EXISTS source_type  provider_source_type  NOT NULL DEFAULT 'self_registered';

-- ── Backfill ─────────────────────────────────────────────────────
-- Any row with user_id IS NULL was seeded by StreetRise staff.

UPDATE providers
  SET claim_status = 'unclaimed',
      source_type  = 'seeded'
  WHERE user_id IS NULL;

-- ── Indexes ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_providers_claim_status ON providers(claim_status);
CREATE INDEX IF NOT EXISTS idx_providers_source_type  ON providers(source_type);

-- ── RLS: read unclaimed stubs ─────────────────────────────────────
-- Allow any visitor to read unclaimed provider stubs so they appear
-- in a "claim your organization" directory. These rows have no
-- sensitive user data (user_id IS NULL).

CREATE POLICY "providers_unclaimed_read"
  ON providers FOR SELECT
  USING (claim_status = 'unclaimed');

-- ── RLS: submit a claim ──────────────────────────────────────────
-- An authenticated user may claim an unclaimed provider row by
-- setting user_id and flipping claim_status to 'pending_claim'.
-- USING matches the row *before* the update (must be unclaimed).
-- WITH CHECK matches the row *after* the update (caller owns it,
-- status is pending, role/verification start at safe defaults).
-- Admin approval then sets claim_status = 'claimed' via the
-- existing providers_admin_update policy.

CREATE POLICY "providers_claim_submit"
  ON providers FOR UPDATE
  USING  (claim_status = 'unclaimed' AND auth.uid() IS NOT NULL)
  WITH CHECK (
    user_id             = auth.uid()
    AND claim_status    = 'pending_claim'
    AND role            = 'provider'
    AND verification_status = 'pending'
  );

-- ── RLS: tighten providers_insert_self ───────────────────────────
-- Self-registered providers must start as claimed + self_registered.
-- This prevents a rogue INSERT from masquerading as a seeded record.

DROP POLICY IF EXISTS providers_insert_self ON providers;
CREATE POLICY providers_insert_self ON providers
  FOR INSERT
  WITH CHECK (
    user_id             = auth.uid()
    AND role            = 'provider'
    AND verification_status = 'pending'
    AND claim_status    = 'claimed'
    AND source_type     = 'self_registered'
  );
