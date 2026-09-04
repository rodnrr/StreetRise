-- ================================================================
-- StreetRise — Migration 057: housing details, plus generalized
--                             corrections and provenance
--
-- Three things, all additive, all create-only except one CHECK
-- constraint widening:
--
--   1. Housing resource types on the existing resources_resource_type_check
--   2. resource_housing_details — 1:1 extension of `resources`
--   3. resource_reports + resource_evidence — generalized, NOT housing-only
--
-- Design note recorded in docs/housing-architecture.md. The short version:
-- housing is a category of `resources`, not a second directory. There is no
-- housing organization table because that is `providers`, and no housing
-- program table because that is `resources`.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. Housing resource types
-- ════════════════════════════════════════════════════════════════
-- `resource_type` is TEXT + CHECK (migration 011), not an enum, so this
-- is a constraint swap rather than an enum migration.
--
-- Only genuinely new values are added. `transitional_housing`,
-- `emergency_shelter`, `veteran_housing`, `youth_shelter` and
-- `domestic_violence_shelter` already exist and are reused as-is —
-- duplicating them under housing-ish names would split the same real
-- world thing across two values and break every existing filter.
--
-- `voucher_program` is the load-bearing addition. Housing Choice Voucher
-- assistance is a SERVICE somebody applies to, usually run by a housing
-- authority with no walk-in door. It is not a building. Modelling it as a
-- resource type — rather than as a flag on housing stock — is what lets
-- "help me get a voucher" and "who takes my voucher" be two different
-- searches, which they are.
--
-- Widening a CHECK cannot reject an existing row, so this is safe against
-- live data by construction.

ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_resource_type_check;
ALTER TABLE resources ADD CONSTRAINT resources_resource_type_check
  CHECK (resource_type IS NULL OR resource_type IN (
    -- ── existing, unchanged ──
    'emergency_shelter', 'transitional_housing', 'food_pantry', 'hot_meal',
    'shower_facility', 'restroom_access', 'day_use_park', 'warming_cooling_center',
    'domestic_violence_shelter', 'veteran_housing', 'youth_shelter',
    'work_exchange', 'crisis_hotline', 'job_training', 'legal_services',
    'medical_clinic', 'mental_health_clinic', 'substance_recovery_program',
    'clothing_closet', 'hygiene_supplies', 'laundry_facility',
    'childcare_services', 'transportation_assistance', 'outreach_program', 'other',
    -- ── new: housing ──
    'affordable_housing',            -- income-restricted rental stock
    'public_housing',                -- housing-authority owned and operated
    'subsidized_housing',            -- project-based subsidy attached to the unit
    'permanent_supportive_housing',  -- housing plus ongoing services, no time limit
    'recovery_residence',            -- sober living / recovery housing
    'shared_housing',                -- rooms, co-living, host homes
    'housing_navigation',            -- help applying, not housing itself
    'voucher_program'                -- HCV/Section 8 assistance — a service, not a building
  ));


-- ════════════════════════════════════════════════════════════════
-- 2. resource_housing_details
-- ════════════════════════════════════════════════════════════════
-- 1:1 extension. `resource_id` is both PK and FK, which is what makes it
-- one-to-one and what lets PostgREST embed it as an object rather than a
-- list.
--
-- These fields are NOT on `resources` because fetchMapResources() reads
-- the whole public set on every map visit; sixteen housing columns would
-- be fetched for every food pantry to serve the handful of housing rows.
-- A non-housing resource simply has no row here.
--
-- ── The tri-state rule ──────────────────────────────────────────
-- accepts_vouchers, accepts_felony, accepts_violent_offense,
-- accepts_sex_offense, requires_sobriety, has_curfew, income_restricted,
-- is_subsidized and is_public_housing are ALL nullable with NO DEFAULT.
--
-- NULL means nobody has told us. It is not "no".
--
-- This is the single most important line in the file. Rendering an
-- unknown as a negative turns a missing data point into a closed door,
-- and somebody gets turned away at an intake desk over a field nobody
-- ever asked about. A DEFAULT FALSE here would silently convert every
-- unasked question into a published "no" — so there is none, and there
-- must never be one.

CREATE TABLE IF NOT EXISTS resource_housing_details (
  resource_id uuid PRIMARY KEY REFERENCES resources(id) ON DELETE CASCADE,

  -- ── Criminal-record eligibility ───────────────────────────────
  -- Tri-state. NULL = not stated. Never default these.
  accepts_felony           boolean,
  accepts_violent_offense  boolean,
  accepts_sex_offense      boolean,

  -- ── Vouchers ──────────────────────────────────────────────────
  -- ACCEPTANCE, not assistance. "This place takes a Housing Choice
  -- Voucher." The program that ISSUES vouchers is its own resource with
  -- resource_type = 'voucher_program' — see section 1. Keeping the two
  -- apart is what lets someone search for help getting a voucher and
  -- separately search for somewhere that takes one.
  accepts_vouchers         boolean,

  -- ── House rules ───────────────────────────────────────────────
  requires_sobriety        boolean,
  has_curfew               boolean,

  -- ── Programme character ───────────────────────────────────────
  income_restricted        boolean,
  is_subsidized            boolean,
  is_public_housing        boolean,

  -- ── Cost ──────────────────────────────────────────────────────
  -- A range, because affordable housing is usually quoted as one, and
  -- because "rent is 30% of income" has no single number — that case
  -- leaves both NULL and explains itself in eligibility_notes.
  -- NULL is unknown, never free: 0 is a real and different answer.
  minimum_monthly_cost_cents integer CHECK (minimum_monthly_cost_cents IS NULL OR minimum_monthly_cost_cents >= 0),
  maximum_monthly_cost_cents integer CHECK (maximum_monthly_cost_cents IS NULL OR maximum_monthly_cost_cents >= 0),
  deposit_cents              integer CHECK (deposit_cents IS NULL OR deposit_cents >= 0),

  -- Time-limited programmes only. NULL on permanent housing is correct,
  -- not missing.
  max_stay_days              integer CHECK (max_stay_days IS NULL OR max_stay_days > 0),

  -- ── Intake ────────────────────────────────────────────────────
  application_url    text,
  intake_phone       text,
  eligibility_notes  text,

  -- ── Waitlist ──────────────────────────────────────────────────
  -- Housing availability moves faster than anything else StreetRise
  -- lists, and a stale "open" is the failure that costs somebody a day.
  -- So the status is never rendered without its check date, and 'unknown'
  -- is the default rather than 'open'.
  --
  -- NULL waitlist_status means waitlists do not apply to this resource
  -- (a navigation service, a voucher helpline) — different from
  -- 'unknown', which means they do apply and we have not checked.
  waitlist_status         text CHECK (waitlist_status IS NULL OR waitlist_status IN (
                            'open', 'closed', 'temporarily_closed', 'unknown'
                          )),
  waitlist_last_checked_at timestamptz,

  -- When the housing-specific fields above were last looked at, as
  -- distinct from resources.last_verified_at, which covers the listing as
  -- a whole. A phone number can be right while the rent is a year old.
  housing_details_last_checked_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT housing_cost_range_ordered CHECK (
    minimum_monthly_cost_cents IS NULL
    OR maximum_monthly_cost_cents IS NULL
    OR minimum_monthly_cost_cents <= maximum_monthly_cost_cents
  )
);

CREATE INDEX IF NOT EXISTS idx_housing_details_vouchers ON resource_housing_details(accepts_vouchers);
CREATE INDEX IF NOT EXISTS idx_housing_details_felony   ON resource_housing_details(accepts_felony);
CREATE INDEX IF NOT EXISTS idx_housing_details_waitlist ON resource_housing_details(waitlist_status);

DROP TRIGGER IF EXISTS resource_housing_details_updated_at ON resource_housing_details;
CREATE TRIGGER resource_housing_details_updated_at
  BEFORE UPDATE ON resource_housing_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════════════════════════════
-- 3. resource_evidence — generalized provenance
-- ════════════════════════════════════════════════════════════════
-- Deliberately NOT housing-only, and deliberately not a second
-- verification system.
--
-- StreetRise already decides *how fresh* a listing is
-- (resources.confidence_score / last_verified_at / stale_after_days).
-- What it has never been able to record is *where a specific claim came
-- from*. That gap is tolerable for "this pantry opens at 9" and not
-- tolerable for "this landlord considers felony convictions", which is a
-- claim someone will act on and which the provider may later dispute.
--
-- So this table answers one question the trust system does not: what is
-- the basis for this? It supplements resources.last_verified_at rather
-- than replacing it, and any category can use it — a transit fare, a
-- clinic's sliding scale, a shelter's intake rule.
--
-- Admin-read only. `notes` can carry the name of whoever answered the
-- phone, and raw_payload can hold more of an upstream record than we
-- publish. The public gets the freshness date it already got.

CREATE TABLE IF NOT EXISTS resource_evidence (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,

  -- Which claim this is evidence for. Free text rather than an enum
  -- because the interesting fields differ per category and a rigid list
  -- would go stale faster than the evidence does. e.g.
  -- 'accepts_vouchers', 'waitlist_status', 'hours_of_operation'.
  claim_field  text,

  method       text NOT NULL CHECK (method IN (
                 'provider_portal',   -- the provider updated it themselves
                 'official_website',  -- read off the org's own site
                 'phone',
                 'email',
                 'government_source', -- HUD, a housing authority, a county list
                 'admin_research'
               )),
  outcome      text NOT NULL CHECK (outcome IN (
                 'confirmed',    -- checked, still true
                 'changed',      -- checked, was different
                 'closed',       -- the service has ended
                 'unreachable'   -- could not confirm
               )),

  source_url   text,
  source_name  text,
  checked_at   timestamptz NOT NULL DEFAULT now(),
  checked_by   text,
  notes        text,
  raw_payload  jsonb,

  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_evidence_resource ON resource_evidence(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_evidence_checked  ON resource_evidence(checked_at DESC);


-- ════════════════════════════════════════════════════════════════
-- 4. resource_reports — generalized public corrections
-- ════════════════════════════════════════════════════════════════
-- Also NOT housing-only. StreetRise has no corrections mechanism at all
-- today, so rather than build a housing-shaped one and generalize it
-- later, it gets built once for every category. A closed food pantry and
-- a closed transitional house are the same report.
--
-- resource_id is nullable because report_type 'new_listing' is about
-- something that does not exist yet.

CREATE TABLE IF NOT EXISTS resource_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id   uuid REFERENCES resources(id) ON DELETE SET NULL,
  report_type   text NOT NULL CHECK (report_type IN (
                  'closed', 'wrong_info', 'scam', 'unsafe', 'new_listing'
                )),
  message       text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 4000),

  -- Optional by design. Requiring a way to be contacted back in order to
  -- report a scam would suppress exactly the reports that matter most.
  contact_email text CHECK (contact_email IS NULL OR length(contact_email) <= 320),

  status        text NOT NULL DEFAULT 'new' CHECK (status IN (
                  'new', 'reviewed', 'actioned', 'dismissed'
                )),
  admin_notes   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_reports_status   ON resource_reports(status);
CREATE INDEX IF NOT EXISTS idx_resource_reports_resource ON resource_reports(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_reports_created  ON resource_reports(created_at DESC);


-- ── Abuse guard ─────────────────────────────────────────────────
-- Honest scope, stated up front: Postgres cannot rate-limit per client
-- here. Every anonymous submission arrives as the same `anon` role with
-- no IP and no session, so there is nothing to key a per-user bucket on.
-- Real per-IP limiting belongs at the Cloudflare edge in front of
-- /rest/v1/resource_reports.
--
-- What IS enforceable is duplicate suppression and a per-target ceiling.
-- Two details this gets right that a naive version does not:
--
-- 1. created_at is stamped from the server clock. A DEFAULT only applies
--    when the column is omitted, and a REST caller can name it — without
--    this, rows dated far in the future sit inside both windows below
--    until that date arrives, blocking real corrections permanently. A
--    guard whose window the caller controls is not a guard.
--
-- 2. The counting is serialized per target with a transaction-scoped
--    advisory lock. Without it, concurrent inserts each run their count
--    before any peer commits, all see fewer than the ceiling, and all
--    succeed — so a parallel script sails past both limits in one burst,
--    which is precisely the case the guard exists for. The lock is taken
--    before the counts and released at commit.
--
-- Reports with no resource_id share one lock key, which is correct: they
-- are all competing for the same "new listing" queue.

CREATE OR REPLACE FUNCTION resource_reports_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_identical integer;
  recent_on_target integer;
BEGIN
  NEW.created_at := now();

  -- Serialize per target so the counts below cannot be raced.
  PERFORM pg_advisory_xact_lock(
    hashtext('resource_reports:' || COALESCE(NEW.resource_id::text, 'unattached'))
  );

  SELECT count(*) INTO recent_identical
    FROM resource_reports
   WHERE report_type = NEW.report_type
     AND message     = NEW.message
     AND resource_id IS NOT DISTINCT FROM NEW.resource_id
     AND created_at > now() - interval '24 hours';

  IF recent_identical > 0 THEN
    RAISE EXCEPTION 'duplicate report already received'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO recent_on_target
    FROM resource_reports
   WHERE resource_id IS NOT DISTINCT FROM NEW.resource_id
     AND created_at > now() - interval '1 hour';

  IF recent_on_target >= 20 THEN
    RAISE EXCEPTION 'too many reports on this listing right now'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resource_reports_guard_trigger ON resource_reports;
CREATE TRIGGER resource_reports_guard_trigger
  BEFORE INSERT ON resource_reports
  FOR EACH ROW EXECUTE FUNCTION resource_reports_guard();


-- ════════════════════════════════════════════════════════════════
-- 5. Row Level Security
-- ════════════════════════════════════════════════════════════════
-- Every new table gets RLS AND at least one policy. RLS-on-with-no-
-- policies is a silent full lockout — `resource_import_staging` is
-- already an example of that going unnoticed in this database, so it is
-- worth stating that none of these three is in that state.

ALTER TABLE resource_housing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_evidence        ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_reports         ENABLE ROW LEVEL SECURITY;


-- ── resource_housing_details ────────────────────────────────────
-- Exactly as public as its parent listing, and no more. The predicate
-- mirrors `resources_public_read` (migration 004) rather than inventing
-- a second definition of "published" — if that policy is ever tightened,
-- this must be tightened with it, which is why it is written as a
-- lookup against the parent instead of a copy of its conditions.

DROP POLICY IF EXISTS housing_details_public_read ON resource_housing_details;
CREATE POLICY housing_details_public_read ON resource_housing_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM resources r
       WHERE r.id = resource_housing_details.resource_id
         AND r.is_active = TRUE
         AND r.verification_status IN ('verified', 'pending')
    )
  );

-- A verified provider maintains housing details on their own listings,
-- through the portal they already use. Same gate as their listings:
-- is_verified_provider() plus ownership of the parent resource.
DROP POLICY IF EXISTS housing_details_provider_write ON resource_housing_details;
CREATE POLICY housing_details_provider_write ON resource_housing_details
  FOR ALL
  USING (
    is_verified_provider()
    AND EXISTS (
      SELECT 1 FROM resources r
       WHERE r.id = resource_housing_details.resource_id
         AND r.provider_id = my_provider_id()
    )
  )
  WITH CHECK (
    is_verified_provider()
    AND EXISTS (
      SELECT 1 FROM resources r
       WHERE r.id = resource_housing_details.resource_id
         AND r.provider_id = my_provider_id()
    )
  );

DROP POLICY IF EXISTS housing_details_admin_all ON resource_housing_details;
CREATE POLICY housing_details_admin_all ON resource_housing_details
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ── resource_evidence ───────────────────────────────────────────
-- Admin-only, read and write. `notes` can name whoever answered the
-- phone and `raw_payload` can hold more of an upstream record than we
-- publish, so there is no public read and no provider read: a provider
-- should not see an admin's research note about their own org.
--
-- The public already gets the one fact it needs — how fresh the listing
-- is — from resources.last_verified_at.

DROP POLICY IF EXISTS resource_evidence_admin_all ON resource_evidence;
CREATE POLICY resource_evidence_admin_all ON resource_evidence
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ── resource_reports ────────────────────────────────────────────
-- Anyone may file one. Nobody but an admin may read one back.
--
-- The missing public SELECT policy is deliberate and load-bearing: a
-- report can name a scam landlord and carries the reporter's email, so a
-- public read would turn this table into a way to look up who reported
-- whom. Providers cannot read them either — a report about an org must
-- not be visible to that org before a human has triaged it, which is the
-- same reasoning as conversation_admin_notes and work_exchange_candidates.
--
-- Consequence for the client: PostgREST returns an empty body on INSERT
-- when the caller cannot SELECT the row back, so the client must NOT
-- call .select() on the insert or a successful write surfaces as an
-- error. submitResourceReport() in src/lib/reports.ts is written
-- correctly; copy it rather than rolling a new one.
--
-- The WITH CHECK pins status and admin_notes: a submitter must not be
-- able to file a report pre-marked as handled, or to write into the
-- admin's own triage field.

DROP POLICY IF EXISTS resource_reports_public_insert ON resource_reports;
CREATE POLICY resource_reports_public_insert ON resource_reports
  FOR INSERT WITH CHECK (status = 'new' AND admin_notes IS NULL);

DROP POLICY IF EXISTS resource_reports_admin_read ON resource_reports;
CREATE POLICY resource_reports_admin_read ON resource_reports
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS resource_reports_admin_update ON resource_reports;
CREATE POLICY resource_reports_admin_update ON resource_reports
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS resource_reports_admin_delete ON resource_reports;
CREATE POLICY resource_reports_admin_delete ON resource_reports
  FOR DELETE USING (is_admin());


-- ════════════════════════════════════════════════════════════════
-- 6. Column documentation
-- ════════════════════════════════════════════════════════════════

COMMENT ON TABLE resource_housing_details IS
  'Housing-specific 1:1 extension of resources. Present only for category = housing.';

COMMENT ON COLUMN resource_housing_details.accepts_felony IS
  'Tri-state. NULL = not stated, NOT "no". Renders as "Not stated — call to ask". Never add a DEFAULT.';
COMMENT ON COLUMN resource_housing_details.accepts_violent_offense IS
  'Tri-state. NULL = not stated, NOT "no". Never add a DEFAULT.';
COMMENT ON COLUMN resource_housing_details.accepts_sex_offense IS
  'Tri-state. NULL = not stated, NOT "no". Never add a DEFAULT.';
COMMENT ON COLUMN resource_housing_details.accepts_vouchers IS
  'Voucher ACCEPTANCE by this housing. Voucher ASSISTANCE is a separate resource with resource_type = voucher_program. Tri-state; never add a DEFAULT.';
COMMENT ON COLUMN resource_housing_details.waitlist_status IS
  'NULL = waitlists do not apply to this resource. ''unknown'' = they do and we have not checked. Never render without waitlist_last_checked_at.';
