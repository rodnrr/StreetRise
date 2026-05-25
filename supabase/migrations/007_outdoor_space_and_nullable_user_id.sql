-- ================================================================
-- StreetRise — Migration 007: Add outdoor_space category + nullable user_id
-- ================================================================

-- 1. Add outdoor_space to resource_category enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'resource_category'::regtype
      AND enumlabel = 'outdoor_space'
  ) THEN
    ALTER TYPE resource_category ADD VALUE 'outdoor_space';
  END IF;
END $$;

-- 2. Allow user_id to be NULL for system-seeded / unclaimed provider records.
--    NULL user_id means the org has not yet claimed their account.
--    RLS policies already handle this correctly: NULL != auth.uid() for all users.
ALTER TABLE providers
  ALTER COLUMN user_id DROP NOT NULL;
