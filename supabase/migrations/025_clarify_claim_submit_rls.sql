-- ================================================================
-- StreetRise — Migration 025: Clarify providers_claim_submit RLS
-- Replaces 9 correlated subqueries with a single EXISTS that uses
-- an explicit alias (cur) for the current-row read.
-- In WITH CHECK, the unaliased table name refers to the NEW row;
-- `cur` unambiguously refers to the CURRENT (pre-update) row.
-- ================================================================

DROP POLICY IF EXISTS "providers_claim_submit" ON providers;

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
    -- all org metadata must be unchanged: single scan, unambiguous alias
    AND EXISTS (
      SELECT 1 FROM providers AS cur
      WHERE cur.id                = providers.id
        AND cur.organization_name = providers.organization_name
        AND cur.contact_name      = providers.contact_name
        AND cur.contact_email     = providers.contact_email
        AND cur.contact_phone     IS NOT DISTINCT FROM providers.contact_phone
        AND cur.website           IS NOT DISTINCT FROM providers.website
        AND cur.ein               IS NOT DISTINCT FROM providers.ein
        AND cur.logo_url          IS NOT DISTINCT FROM providers.logo_url
        AND cur.bio               IS NOT DISTINCT FROM providers.bio
        AND cur.source_type       = providers.source_type
    )
  );
