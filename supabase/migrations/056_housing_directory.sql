-- ================================================================
-- StreetRise — Migration 056: Second-chance housing directory
--
-- A searchable directory of housing that will consider people with
-- criminal records. Phase 1 of a separate product surface at /housing.
--
-- ── Why these are standalone tables ──────────────────────────────
-- `organizations`/`programs` deliberately do NOT reuse the existing
-- `providers`/`resources` pair, even though the shapes rhyme. Three
-- reasons:
--
--   1. Scope. `resources` is Florida-only, point-located, and gated on
--      is_map_ready + non-null lat/lng. This directory is national and
--      its primary surface is a state page, not a map — a statewide
--      reentry nonprofit with no walk-in address is a first-class row
--      here and an invisible one there.
--   2. Record-related fields have no home on `resources`. accepts_felony,
--      accepts_violent_offense and accepts_sex_offense are the whole
--      point of this directory and mean nothing to a food pantry.
--   3. Blast radius. `resources` serves live traffic. Adding a dozen
--      columns and a national row population to it to support a new
--      product is a migration against production data that real people
--      are using right now.
--
-- The duplication this creates (an org that is both a StreetRise
-- provider and a housing organization) is a known, accepted cost —
-- see docs/housing-directory.md for the reconciliation path.
--
-- ── Why so many booleans are nullable ────────────────────────────
-- accepts_felony et al. are three-state on purpose: TRUE / FALSE /
-- NULL-meaning-unknown. Rendering an unknown as "no" turns a missing
-- data point into a closed door, and someone gets turned away at an
-- intake desk because of it. The UI must render NULL as
-- "Not stated — call to ask", never as a negative.
--
-- Postgres gives this to us for free; the discipline is in the
-- application layer and in never adding a DEFAULT FALSE to any of them.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. Enums
-- ════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE housing_org_type AS ENUM (
    'transitional_housing',
    'sober_living',
    'reentry_nonprofit',
    'housing_authority',
    'landlord',
    'legal_aid',
    'shelter'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE housing_type AS ENUM (
    'transitional',
    'recovery_residence',
    'permanent_supportive',
    'rental_unit',
    'shared_housing',
    'emergency_shelter'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE housing_gender_served AS ENUM ('any', 'men', 'women', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE housing_verification_method AS ENUM ('phone', 'email', 'website', 'partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE housing_verification_outcome AS ENUM ('confirmed', 'changed', 'closed', 'unreachable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE housing_report_type AS ENUM ('closed', 'wrong_info', 'scam', 'new_listing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE housing_report_status AS ENUM ('new', 'reviewed', 'actioned', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ════════════════════════════════════════════════════════════════
-- 2. housing_states
-- ════════════════════════════════════════════════════════════════
-- One row per US state + DC. `record_lookback_summary` is the
-- plain-language "how far back can a landlord look" text shown at the
-- top of each state page — the single most-asked question this
-- directory exists to answer.
--
-- has_housing_ban_the_box is NULLABLE, departing from the build spec's
-- plain `bool`, for the same reason the program booleans are: a state
-- we have not researched must read as "we don't know yet", not as
-- "your state has no protection". Telling someone they have no rights
-- when they do is the more harmful of the two failure modes.

CREATE TABLE IF NOT EXISTS housing_states (
  code                    char(2) PRIMARY KEY,
  name                    text NOT NULL,

  -- NULL = not yet researched. The state page hides the section
  -- entirely rather than printing an empty promise.
  record_lookback_summary text,

  -- NULL = unknown. See note above.
  has_housing_ban_the_box boolean,

  notes                   text,
  updated_at              timestamptz NOT NULL DEFAULT now()
);


-- ════════════════════════════════════════════════════════════════
-- 3. housing_organizations
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS housing_organizations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  org_type     housing_org_type NOT NULL,
  website      text,
  phone        text,
  email        text,
  description  text,

  -- Nothing is public until a human says so. Ingest (Phase 2) and hand
  -- entry alike land here as FALSE.
  is_published boolean NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housing_orgs_published ON housing_organizations(is_published);
CREATE INDEX IF NOT EXISTS idx_housing_orgs_type      ON housing_organizations(org_type);


-- ════════════════════════════════════════════════════════════════
-- 4. housing_locations
-- ════════════════════════════════════════════════════════════════
-- lat/lng are recorded when known but nothing in Phase 1 renders a map.
-- They exist so a later map view is a UI change, not a re-import.

CREATE TABLE IF NOT EXISTS housing_locations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES housing_organizations(id) ON DELETE CASCADE,
  address_line1   text,
  address_line2   text,
  city            text,
  state_code      char(2) REFERENCES housing_states(code),
  postal_code     text,
  lat             double precision,
  lng             double precision,
  is_primary      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housing_locations_org   ON housing_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_housing_locations_state ON housing_locations(state_code);
-- The state page groups by city, so it reads on (state, city) together.
CREATE INDEX IF NOT EXISTS idx_housing_locations_state_city ON housing_locations(state_code, city);

-- At most one primary address per organization.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_housing_locations_primary
  ON housing_locations(organization_id)
  WHERE is_primary;


-- ════════════════════════════════════════════════════════════════
-- 5. housing_programs
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS housing_programs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES housing_organizations(id) ON DELETE CASCADE,
  name                    text NOT NULL,
  housing_type            housing_type NOT NULL,
  gender_served           housing_gender_served,

  -- ── Tri-state: TRUE / FALSE / NULL = unknown ──────────────────
  -- NO DEFAULT. A default of false here would silently convert every
  -- record we simply have not asked about into a published "no".
  accepts_felony          boolean,
  accepts_violent_offense boolean,
  accepts_sex_offense     boolean,
  accepts_vouchers        boolean,
  requires_sobriety       boolean,
  has_curfew              boolean,

  -- Money in cents, nullable — "we don't know the rent" is not "$0".
  monthly_cost_cents      integer CHECK (monthly_cost_cents IS NULL OR monthly_cost_cents >= 0),
  deposit_cents           integer CHECK (deposit_cents      IS NULL OR deposit_cents      >= 0),
  max_stay_days           integer CHECK (max_stay_days      IS NULL OR max_stay_days      >  0),
  beds_total              integer CHECK (beds_total         IS NULL OR beds_total         >= 0),

  application_url         text,
  intake_phone            text,
  notes                   text,

  is_published            boolean NOT NULL DEFAULT false,

  -- NULL = never verified. The UI says so out loud rather than
  -- falling back to created_at, which would manufacture confidence.
  last_verified_at        timestamptz,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housing_programs_org       ON housing_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_housing_programs_published ON housing_programs(is_published);
CREATE INDEX IF NOT EXISTS idx_housing_programs_type      ON housing_programs(housing_type);


-- ════════════════════════════════════════════════════════════════
-- 6. housing_sources
-- ════════════════════════════════════════════════════════════════
-- Provenance. Every published row should be traceable to where the
-- claim came from, so a correction can be checked against the original
-- rather than argued about. raw_payload preserves the response as
-- retrieved, which is what makes a later re-normalization possible
-- without re-fetching (and re-hitting) the source.

CREATE TABLE IF NOT EXISTS housing_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES housing_organizations(id) ON DELETE CASCADE,
  source_name     text NOT NULL,
  source_url      text,
  retrieved_at    timestamptz NOT NULL DEFAULT now(),
  raw_payload     jsonb,
  license_note    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housing_sources_org ON housing_sources(organization_id);


-- ════════════════════════════════════════════════════════════════
-- 7. housing_verifications
-- ════════════════════════════════════════════════════════════════
-- An append-only log of every check. `housing_programs.last_verified_at`
-- is the denormalized latest, kept by the trigger below so the state
-- page can sort and filter on it without a per-row subquery.

CREATE TABLE IF NOT EXISTS housing_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid NOT NULL REFERENCES housing_programs(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  verified_by text,
  method      housing_verification_method NOT NULL,
  outcome     housing_verification_outcome NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housing_verifications_program ON housing_verifications(program_id);
CREATE INDEX IF NOT EXISTS idx_housing_verifications_at      ON housing_verifications(verified_at DESC);


-- ════════════════════════════════════════════════════════════════
-- 8. housing_reports
-- ════════════════════════════════════════════════════════════════
-- Public corrections. program_id is nullable because report_type
-- 'new_listing' is about a program that does not exist yet.
--
-- contact_email is optional by design: requiring a way to be contacted
-- back in order to report a scam would suppress exactly the reports
-- that matter most.

CREATE TABLE IF NOT EXISTS housing_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    uuid REFERENCES housing_programs(id) ON DELETE SET NULL,
  report_type   housing_report_type NOT NULL,
  message       text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 4000),
  contact_email text CHECK (contact_email IS NULL OR length(contact_email) <= 320),
  status        housing_report_status NOT NULL DEFAULT 'new',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housing_reports_status  ON housing_reports(status);
CREATE INDEX IF NOT EXISTS idx_housing_reports_program ON housing_reports(program_id);
CREATE INDEX IF NOT EXISTS idx_housing_reports_created ON housing_reports(created_at DESC);


-- ════════════════════════════════════════════════════════════════
-- 9. updated_at triggers
-- ════════════════════════════════════════════════════════════════
-- Reuses update_updated_at() from migration 001.

DROP TRIGGER IF EXISTS housing_states_updated_at        ON housing_states;
DROP TRIGGER IF EXISTS housing_organizations_updated_at ON housing_organizations;
DROP TRIGGER IF EXISTS housing_locations_updated_at     ON housing_locations;
DROP TRIGGER IF EXISTS housing_programs_updated_at      ON housing_programs;

CREATE TRIGGER housing_states_updated_at
  BEFORE UPDATE ON housing_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER housing_organizations_updated_at
  BEFORE UPDATE ON housing_organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER housing_locations_updated_at
  BEFORE UPDATE ON housing_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER housing_programs_updated_at
  BEFORE UPDATE ON housing_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════════════════════════════
-- 10. Keep housing_programs.last_verified_at in step with the log
-- ════════════════════════════════════════════════════════════════
-- The verification log is the record of truth; last_verified_at is a
-- denormalized copy so the state page can sort and warn on staleness
-- without a correlated subquery per row.
--
-- Only 'confirmed' advances the clock. A call that reached nobody
-- ('unreachable'), or found the program moved or shut ('changed',
-- 'closed'), is evidence we know LESS than we did, so treating it as a
-- fresh verification would be exactly backwards — the listing would
-- lose its staleness warning at the moment it most needed one.
--
-- GREATEST() guards against a backdated entry pulling the clock
-- backwards when someone logs an older check after a newer one.

CREATE OR REPLACE FUNCTION housing_sync_last_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.outcome = 'confirmed' THEN
    UPDATE housing_programs
       SET last_verified_at = GREATEST(COALESCE(last_verified_at, NEW.verified_at), NEW.verified_at)
     WHERE id = NEW.program_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS housing_verifications_sync ON housing_verifications;
CREATE TRIGGER housing_verifications_sync
  AFTER INSERT ON housing_verifications
  FOR EACH ROW EXECUTE FUNCTION housing_sync_last_verified();


-- ════════════════════════════════════════════════════════════════
-- 11. Abuse guard on public report submissions
-- ════════════════════════════════════════════════════════════════
-- Honest scoping note: Postgres cannot rate-limit per client here.
-- Anonymous submissions all arrive as the same `anon` role with no IP
-- and no session, so there is nothing to key a per-user bucket on. Real
-- per-IP limiting belongs at the Cloudflare edge in front of the API —
-- see docs/housing-directory.md.
--
-- What IS enforceable in the database is duplicate suppression and a
-- per-target ceiling, which covers the realistic failure mode (a script
-- or a stuck retry loop hammering one listing) without a global cap
-- that would let one abuser silence everybody else's reports.

CREATE OR REPLACE FUNCTION housing_reports_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_identical integer;
  recent_on_target integer;
BEGIN
  -- Stamp the server's clock over whatever the caller sent.
  --
  -- created_at has a DEFAULT, but a default only applies when the column
  -- is omitted, and an anonymous caller can name it explicitly over the
  -- REST API. Without this line, twenty reports inserted with a
  -- created_at far in the future stay inside both windows below until
  -- that date arrives — permanently blocking real corrections on that
  -- listing. A guard whose window the attacker controls is not a guard.
  NEW.created_at := now();

  SELECT count(*) INTO recent_identical
    FROM housing_reports
   WHERE report_type = NEW.report_type
     AND message     = NEW.message
     AND program_id IS NOT DISTINCT FROM NEW.program_id
     AND created_at > now() - interval '24 hours';

  IF recent_identical > 0 THEN
    RAISE EXCEPTION 'duplicate report already received'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.program_id IS NOT NULL THEN
    SELECT count(*) INTO recent_on_target
      FROM housing_reports
     WHERE program_id = NEW.program_id
       AND created_at > now() - interval '1 hour';

    IF recent_on_target >= 20 THEN
      RAISE EXCEPTION 'too many reports on this listing right now'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS housing_reports_guard_trigger ON housing_reports;
CREATE TRIGGER housing_reports_guard_trigger
  BEFORE INSERT ON housing_reports
  FOR EACH ROW EXECUTE FUNCTION housing_reports_guard();


-- ════════════════════════════════════════════════════════════════
-- 12. Row Level Security
-- ════════════════════════════════════════════════════════════════
-- Every table gets RLS. Every table gets at least one policy, or an
-- explicit note saying why it has none — RLS-on-with-no-policies is a
-- silent full lockout, and `resource_import_staging` is already an
-- example of that going unnoticed in this database.
--
-- Shape:
--   • public (anon + authenticated) reads published rows only
--   • public inserts reports, and cannot read any back
--   • admins do everything, via is_admin() from migration 002
--   • everything else goes through the service role, which bypasses RLS

ALTER TABLE housing_states        ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_programs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_sources       ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_reports       ENABLE ROW LEVEL SECURITY;


-- ── housing_states ──────────────────────────────────────────────
-- Reference data: the state list and its lookback summary are public.

DROP POLICY IF EXISTS housing_states_public_read ON housing_states;
CREATE POLICY housing_states_public_read ON housing_states
  FOR SELECT USING (true);

DROP POLICY IF EXISTS housing_states_admin_write ON housing_states;
CREATE POLICY housing_states_admin_write ON housing_states
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ── housing_organizations ───────────────────────────────────────

DROP POLICY IF EXISTS housing_orgs_public_read ON housing_organizations;
CREATE POLICY housing_orgs_public_read ON housing_organizations
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS housing_orgs_admin_write ON housing_organizations;
CREATE POLICY housing_orgs_admin_write ON housing_organizations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ── housing_locations ───────────────────────────────────────────
-- An address is only as public as the organization it belongs to.

DROP POLICY IF EXISTS housing_locations_public_read ON housing_locations;
CREATE POLICY housing_locations_public_read ON housing_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM housing_organizations o
       WHERE o.id = housing_locations.organization_id
         AND o.is_published = true
    )
  );

DROP POLICY IF EXISTS housing_locations_admin_write ON housing_locations;
CREATE POLICY housing_locations_admin_write ON housing_locations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ── housing_programs ────────────────────────────────────────────
-- Both gates must hold. A published program under an unpublished org
-- would otherwise leak that org's name through the join on the state
-- page, and un-publishing an organization has to be a single action
-- that actually takes everything under it off the public site.

DROP POLICY IF EXISTS housing_programs_public_read ON housing_programs;
CREATE POLICY housing_programs_public_read ON housing_programs
  FOR SELECT USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM housing_organizations o
       WHERE o.id = housing_programs.organization_id
         AND o.is_published = true
    )
  );

DROP POLICY IF EXISTS housing_programs_admin_write ON housing_programs;
CREATE POLICY housing_programs_admin_write ON housing_programs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ── housing_sources ─────────────────────────────────────────────
-- Attribution is shown on the org page, so the public reads it for
-- published orgs. But raw_payload can hold an entire upstream record,
-- including contact details we deliberately did not publish.
--
-- RLS alone does not protect that column. RLS filters ROWS, not columns,
-- and `/rest/v1/housing_sources?select=raw_payload` reaches the base
-- table directly — "the app queries the view instead" is a convention,
-- not an access control, and conventions do not survive contact with a
-- URL. So the column is closed with a column-level GRANT, which the
-- public role cannot route around.
--
-- Consequence worth knowing: raw_payload becomes readable only by the
-- service role. Admins are the `authenticated` role over the API, so
-- they cannot read it either. Nothing in the app surfaces it today
-- (it is provenance for a human debugging an import), and the safer
-- default is the right one here. If admin ever needs it, add a separate
-- admin-only view rather than widening this grant.

REVOKE SELECT ON housing_sources FROM anon, authenticated;
GRANT SELECT (id, organization_id, source_name, source_url, retrieved_at, license_note)
  ON housing_sources TO anon, authenticated;

DROP POLICY IF EXISTS housing_sources_public_read ON housing_sources;
CREATE POLICY housing_sources_public_read ON housing_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM housing_organizations o
       WHERE o.id = housing_sources.organization_id
         AND o.is_published = true
    )
  );

DROP POLICY IF EXISTS housing_sources_admin_write ON housing_sources;
CREATE POLICY housing_sources_admin_write ON housing_sources
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ── housing_verifications ───────────────────────────────────────
-- `notes` can carry an intake worker's name or an off-record remark
-- from a phone call, so the log itself is admin-only. The public gets
-- the one fact it needs — how fresh this listing is — from
-- housing_programs.last_verified_at, which the trigger above maintains.

DROP POLICY IF EXISTS housing_verifications_admin_all ON housing_verifications;
CREATE POLICY housing_verifications_admin_all ON housing_verifications
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ── housing_reports ─────────────────────────────────────────────
-- Anyone may file one. Nobody but an admin may read them back.
--
-- The missing SELECT policy is deliberate and load-bearing: reports can
-- name a scam landlord and carry the reporter's email, and a public
-- read would turn this table into a way to look up who reported whom.
-- Supabase returns an empty body on INSERT when the caller cannot
-- SELECT the row, so the client must not use .select() on the insert.

DROP POLICY IF EXISTS housing_reports_public_insert ON housing_reports;
CREATE POLICY housing_reports_public_insert ON housing_reports
  FOR INSERT WITH CHECK (status = 'new');

DROP POLICY IF EXISTS housing_reports_admin_read ON housing_reports;
CREATE POLICY housing_reports_admin_read ON housing_reports
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS housing_reports_admin_update ON housing_reports;
CREATE POLICY housing_reports_admin_update ON housing_reports
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS housing_reports_admin_delete ON housing_reports;
CREATE POLICY housing_reports_admin_delete ON housing_reports
  FOR DELETE USING (is_admin());


-- ════════════════════════════════════════════════════════════════
-- 13. Public source-attribution view
-- ════════════════════════════════════════════════════════════════
-- Column-limited projection of housing_sources for the org page's
-- "where this came from" block. Excludes raw_payload, which may hold
-- more of an upstream record than we publish.
--
-- security_invoker so the querying user's RLS still applies — without
-- it the view would run as its owner and quietly bypass the published
-- gate above.

CREATE OR REPLACE VIEW housing_source_attribution
WITH (security_invoker = true) AS
  SELECT id, organization_id, source_name, source_url, retrieved_at, license_note
    FROM housing_sources;

GRANT SELECT ON housing_source_attribution TO anon, authenticated;
