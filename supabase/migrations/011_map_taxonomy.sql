-- ================================================================
-- StreetRise — Migration 011: Map Taxonomy & Facility Schema
-- Adds structured resource_type, gender_policy, population_focus,
-- overnight_allowed, and facility boolean fields for crisis-
-- navigation filtering.
--
-- Design rules:
--   • outdoor_space/day_space resources must NEVER appear as
--     "Shelter tonight" — overnight_allowed guards this.
--   • gender_policy and sensitive population_focus tags are
--     admin-controlled; providers may fill non-sensitive amenities.
--   • All new columns are nullable or have safe defaults so
--     existing data is never invalidated.
--
-- Rollback (in order):
--   ALTER TABLE resources DROP COLUMN IF EXISTS resource_type,
--     DROP COLUMN IF EXISTS gender_policy, ... (list all below columns);
--   DROP INDEX IF EXISTS idx_resources_resource_type, etc.;
-- ================================================================

-- ── 1. Extend resource_category enum ─────────────────────────────
-- Additive only — existing enum values are never removed.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumlabel = 'day_space' AND enumtypid = 'resource_category'::regtype)
  THEN ALTER TYPE resource_category ADD VALUE 'day_space'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumlabel = 'substance_recovery' AND enumtypid = 'resource_category'::regtype)
  THEN ALTER TYPE resource_category ADD VALUE 'substance_recovery'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumlabel = 'legal_aid' AND enumtypid = 'resource_category'::regtype)
  THEN ALTER TYPE resource_category ADD VALUE 'legal_aid'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumlabel = 'employment' AND enumtypid = 'resource_category'::regtype)
  THEN ALTER TYPE resource_category ADD VALUE 'employment'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumlabel = 'outreach' AND enumtypid = 'resource_category'::regtype)
  THEN ALTER TYPE resource_category ADD VALUE 'outreach'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumlabel = 'hotline' AND enumtypid = 'resource_category'::regtype)
  THEN ALTER TYPE resource_category ADD VALUE 'hotline'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumlabel = 'healthcare' AND enumtypid = 'resource_category'::regtype)
  THEN ALTER TYPE resource_category ADD VALUE 'healthcare'; END IF;
END $$;

-- ── 2. Add taxonomy and facility columns ─────────────────────────

ALTER TABLE resources
  -- Structured sub-type (replaces free-text subcategory for new resources;
  -- subcategory is kept for backwards compatibility)
  ADD COLUMN IF NOT EXISTS resource_type   TEXT,

  -- Who the resource serves (admin-controlled for sensitive values)
  ADD COLUMN IF NOT EXISTS gender_policy   TEXT NOT NULL DEFAULT 'unknown',

  -- Population-specific tags — admin-controlled for sensitive tags
  -- (domestic_violence, lgbtq, veterans, etc.)
  ADD COLUMN IF NOT EXISTS population_focus TEXT[] NOT NULL DEFAULT '{}',

  -- Whether this resource allows overnight stays.
  -- NULL = unconfirmed. TRUE = overnight OK. FALSE = day-use only.
  -- CRITICAL: outdoor_space/day_space resources must never have overnight_allowed = TRUE
  -- unless explicitly confirmed by an admin.
  ADD COLUMN IF NOT EXISTS overnight_allowed BOOLEAN,

  -- Access conditions
  ADD COLUMN IF NOT EXISTS phone_required_before_arrival BOOLEAN NOT NULL DEFAULT FALSE,

  -- Facility amenities (provider-editable; admin can override)
  ADD COLUMN IF NOT EXISTS has_showers              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_restrooms            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS serves_meals             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_laundry              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pet_friendly             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wheelchair_accessible    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_transit_accessible BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 3. Constraints ────────────────────────────────────────────────

ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_gender_policy_check;
ALTER TABLE resources ADD CONSTRAINT resources_gender_policy_check
  CHECK (gender_policy IN (
    'gender_inclusive', 'men_only', 'women_only', 'family_only',
    'couples_only', 'youth_only', 'unknown'
  ));

ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_resource_type_check;
ALTER TABLE resources ADD CONSTRAINT resources_resource_type_check
  CHECK (resource_type IS NULL OR resource_type IN (
    'emergency_shelter', 'transitional_housing', 'food_pantry', 'hot_meal',
    'shower_facility', 'restroom_access', 'day_use_park', 'warming_cooling_center',
    'domestic_violence_shelter', 'veteran_housing', 'youth_shelter',
    'work_exchange', 'crisis_hotline', 'job_training', 'legal_services',
    'medical_clinic', 'mental_health_clinic', 'substance_recovery_program',
    'clothing_closet', 'hygiene_supplies', 'laundry_facility',
    'childcare_services', 'transportation_assistance', 'outreach_program', 'other'
  ));

-- Guard: outdoor/day-use resources must not be marked as overnight without admin intent.
-- This is informational; enforcement is at the application layer.
COMMENT ON COLUMN resources.overnight_allowed IS
  'NULL = unconfirmed. Must not be TRUE for category IN (outdoor_space, day_space) unless admin-confirmed.';

COMMENT ON COLUMN resources.gender_policy IS
  'Admin-controlled for sensitive values (domestic_violence_shelter, etc.). Providers may set gender_inclusive or unknown.';

COMMENT ON COLUMN resources.population_focus IS
  'Admin-controlled for sensitive tags: domestic_violence, lgbtq, veterans, youth. Providers may add non-sensitive tags.';

-- ── 4. Backfill safe defaults from existing data ─────────────────

-- Map known subcategory values to resource_type where unambiguous
UPDATE resources
SET resource_type = subcategory
WHERE resource_type IS NULL
  AND subcategory IS NOT NULL
  AND subcategory IN (
    'emergency_shelter', 'transitional_housing', 'food_pantry', 'hot_meal',
    'shower_facility', 'restroom_access', 'day_use_park', 'warming_cooling_center',
    'domestic_violence_shelter', 'veteran_housing', 'youth_shelter',
    'work_exchange', 'crisis_hotline', 'job_training', 'legal_services',
    'medical_clinic', 'mental_health_clinic', 'substance_recovery_program',
    'clothing_closet', 'hygiene_supplies', 'laundry_facility',
    'childcare_services', 'transportation_assistance', 'outreach_program'
  );

-- Shelters default to overnight_allowed = TRUE (admin can override)
UPDATE resources
SET overnight_allowed = TRUE
WHERE category = 'shelter'
  AND overnight_allowed IS NULL;

-- Confirmed day-use outdoor spaces: overnight_allowed = FALSE
-- These subcategory values are from the seed data and are known day-use only.
UPDATE resources
SET overnight_allowed = FALSE
WHERE category = 'outdoor_space'
  AND subcategory IN (
    'day_use_park_with_showers',
    'day_use_park_with_restrooms',
    'day_use_park'
  )
  AND overnight_allowed IS NULL;

-- Campgrounds: overnight_allowed = TRUE (camping is overnight by definition)
UPDATE resources
SET overnight_allowed = TRUE
WHERE category = 'outdoor_space'
  AND subcategory IN ('campground', 'primitive_campground')
  AND overnight_allowed IS NULL;

-- Set has_showers from subcategory naming
UPDATE resources
SET has_showers = TRUE
WHERE subcategory ILIKE '%shower%'
  AND has_showers = FALSE;

-- Set has_restrooms from subcategory naming
UPDATE resources
SET has_restrooms = TRUE
WHERE subcategory ILIKE '%restroom%'
  AND has_restrooms = FALSE;

-- Showers typically include restrooms
UPDATE resources
SET has_restrooms = TRUE
WHERE has_showers = TRUE
  AND has_restrooms = FALSE;

-- Food resources serve meals by definition
UPDATE resources
SET serves_meals = TRUE
WHERE category = 'food'
  AND subcategory = 'hot_meal'
  AND serves_meals = FALSE;

-- ── 5. Indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resources_resource_type
  ON resources(resource_type);

CREATE INDEX IF NOT EXISTS idx_resources_gender_policy
  ON resources(gender_policy);

CREATE INDEX IF NOT EXISTS idx_resources_overnight_allowed
  ON resources(overnight_allowed);

-- Partial indexes for facility booleans (only index true rows — saves space)
CREATE INDEX IF NOT EXISTS idx_resources_has_showers
  ON resources(has_showers) WHERE has_showers = TRUE;

CREATE INDEX IF NOT EXISTS idx_resources_has_restrooms
  ON resources(has_restrooms) WHERE has_restrooms = TRUE;

CREATE INDEX IF NOT EXISTS idx_resources_serves_meals
  ON resources(serves_meals) WHERE serves_meals = TRUE;

CREATE INDEX IF NOT EXISTS idx_resources_overnight_true
  ON resources(category) WHERE overnight_allowed = TRUE;

-- GIN index for population_focus array overlap queries ( @> / && )
CREATE INDEX IF NOT EXISTS idx_resources_population_focus
  ON resources USING GIN(population_focus);
