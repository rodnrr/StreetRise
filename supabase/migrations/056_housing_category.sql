-- ================================================================
-- StreetRise — Migration 056: `housing` resource category
--
-- Alone in its own file on purpose. `ALTER TYPE ... ADD VALUE` commits a
-- new enum label, but that label cannot be USED by any statement in the
-- same transaction. Migration 057 adds the housing detail table and
-- migration 058-onward may insert housing rows; both need this value to
-- already be committed, so this runs first and by itself.
--
-- Same precedent as migrations 007 (`outdoor_space`) and 011
-- (`day_space`, `substance_recovery`, `legal_aid`, `employment`,
-- `outreach`, `hotline`, `healthcare`), which added their values in
-- files that did not also seed rows using them.
--
-- Why a category rather than leaning on the existing shelter types:
-- `emergency_shelter` answers "where do I sleep tonight". Housing
-- answers "where do I live" — an application, a lease, a waitlist, a
-- voucher. Someone searching for an apartment they can afford and
-- someone searching for a bed tonight are not the same search, and
-- collapsing them would bury one under the other.
--
-- Additive and idempotent. No existing row changes category.
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'resource_category'
       AND e.enumlabel = 'housing'
  )
  THEN ALTER TYPE resource_category ADD VALUE 'housing';
  END IF;
END $$;
