-- ================================================================
-- StreetRise — Migration 011: Tighten providers_claim_submit RLS
-- Prevents a claimant from modifying seeded org metadata during
-- the claim UPDATE. Only user_id and claim_status may change.
-- ================================================================

DROP POLICY IF EXISTS "providers_claim_submit" ON providers;

-- A claimant is permitted to change exactly two columns:
--   user_id      NULL  → auth.uid()
--   claim_status 'unclaimed' → 'pending_claim'
--
-- Every other field is locked to its current (seeded) value via
-- subqueries that read the OLD row. Because id is immutable,
-- `providers.id` inside WITH CHECK safely resolves to the same row.
-- Nullable fields use IS NOT DISTINCT FROM so NULL = NULL passes.

CREATE POLICY "providers_claim_submit"
  ON providers FOR UPDATE
  USING  (claim_status = 'unclaimed' AND auth.uid() IS NOT NULL)
  WITH CHECK (
    -- permitted changes
    user_id              = auth.uid()
    AND claim_status     = 'pending_claim'
    -- safe defaults (must not be escalated)
    AND role             = 'provider'
    AND verification_status = 'pending'
    -- org metadata locked to seeded values
    AND organization_name = (SELECT organization_name FROM providers WHERE id = providers.id)
    AND contact_name      = (SELECT contact_name      FROM providers WHERE id = providers.id)
    AND contact_email     = (SELECT contact_email     FROM providers WHERE id = providers.id)
    AND contact_phone     IS NOT DISTINCT FROM (SELECT contact_phone FROM providers WHERE id = providers.id)
    AND website           IS NOT DISTINCT FROM (SELECT website       FROM providers WHERE id = providers.id)
    AND ein               IS NOT DISTINCT FROM (SELECT ein           FROM providers WHERE id = providers.id)
    AND logo_url          IS NOT DISTINCT FROM (SELECT logo_url      FROM providers WHERE id = providers.id)
    AND bio               IS NOT DISTINCT FROM (SELECT bio           FROM providers WHERE id = providers.id)
    AND source_type       = (SELECT source_type       FROM providers WHERE id = providers.id)
  );
