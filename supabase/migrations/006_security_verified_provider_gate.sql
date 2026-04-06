-- Migration 006: Gate all provider write operations on verified status
-- Closes the hole where any signed-up user could insert/modify listings

-- 1. Helper: returns true only for verified providers (used in WITH CHECK clauses)
CREATE OR REPLACE FUNCTION is_verified_provider()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM providers
    WHERE user_id = auth.uid()
    AND verification_status = 'verified'
  );
$$;

-- 2. Tighten providers INSERT:
--    - user_id must be the caller
--    - role must be 'provider' (no self-promotion to admin)
--    - verification_status must start as 'pending' (no self-verification)
DROP POLICY IF EXISTS providers_insert_self ON providers;
CREATE POLICY providers_insert_self ON providers
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'provider'
    AND verification_status = 'pending'
  );

-- 3. Tighten resources INSERT: only verified providers, and they must own the row
DROP POLICY IF EXISTS resources_provider_insert ON resources;
CREATE POLICY resources_provider_insert ON resources
  FOR INSERT
  WITH CHECK (
    is_verified_provider()
    AND provider_id = my_provider_id()
  );

-- 4. Tighten work_exchanges INSERT: same rule
DROP POLICY IF EXISTS work_exchanges_provider_insert ON work_exchanges;
CREATE POLICY work_exchanges_provider_insert ON work_exchanges
  FOR INSERT
  WITH CHECK (
    is_verified_provider()
    AND provider_id = my_provider_id()
  );

-- 5. Tighten resources UPDATE/DELETE: must be verified to modify
DROP POLICY IF EXISTS resources_provider_update ON resources;
CREATE POLICY resources_provider_update ON resources
  FOR UPDATE
  USING (provider_id = my_provider_id() AND is_verified_provider());

DROP POLICY IF EXISTS resources_provider_delete ON resources;
CREATE POLICY resources_provider_delete ON resources
  FOR DELETE
  USING (provider_id = my_provider_id() AND is_verified_provider());

-- 6. Tighten work_exchanges UPDATE: must be verified
DROP POLICY IF EXISTS work_exchanges_provider_update ON work_exchanges;
CREATE POLICY work_exchanges_provider_update ON work_exchanges
  FOR UPDATE
  USING (provider_id = my_provider_id() AND is_verified_provider());
