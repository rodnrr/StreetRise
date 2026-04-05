-- ================================================================
-- StreetRise — Migration 004: Public Pending Resources + Access Types
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'resource_access_type'
  ) THEN
    CREATE TYPE resource_access_type AS ENUM (
      'onsite',
      'phone_intake',
      'web_intake',
      'confidential_address',
      'not_map_ready'
    );
  END IF;
END $$;
ALTER TABLE resources
  ALTER COLUMN lat DROP NOT NULL,
  ALTER COLUMN lng DROP NOT NULL;
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS access_type resource_access_type NOT NULL DEFAULT 'onsite',
  ADD COLUMN IF NOT EXISTS is_map_ready BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE resources
SET is_map_ready = FALSE
WHERE (lat IS NULL OR lng IS NULL)
  AND is_map_ready IS DISTINCT FROM FALSE;
DROP POLICY IF EXISTS "resources_public_read" ON resources;
CREATE POLICY "resources_public_read"
  ON resources FOR SELECT
  USING (
    is_active = TRUE
    AND verification_status IN ('verified', 'pending')
  );
