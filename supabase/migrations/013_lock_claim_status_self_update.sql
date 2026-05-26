-- ================================================================
-- StreetRise — Migration 013: Lock claim_status from self-update
-- Closes the self-approval gap in providers_update_self.
--
-- Without this fix:
--   1. User claims an unclaimed row → user_id = auth.uid(),
--      claim_status = 'pending_claim'
--   2. providers_update_self (migration 002) then allowed that same
--      user to UPDATE their own row freely, including setting
--      claim_status = 'claimed', bypassing admin review.
--
-- The fix adds claim_status to the locked fields in providers_update_self,
-- matching the same pattern already used for role and verification_status.
-- Only admins (providers_admin_update) can transition claim_status.
-- ================================================================

DROP POLICY IF EXISTS "providers_update_self" ON providers;

CREATE POLICY "providers_update_self"
  ON providers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    -- providers cannot change their own role, verification_status, or claim_status
    role = (
      SELECT role FROM providers WHERE user_id = auth.uid()
    )
    AND verification_status = (
      SELECT verification_status FROM providers WHERE user_id = auth.uid()
    )
    AND claim_status = (
      SELECT claim_status FROM providers WHERE user_id = auth.uid()
    )
  );
