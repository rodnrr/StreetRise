-- ================================================================
-- StreetRise — Migration 001: Initial Schema
-- Run via: supabase db push  OR  paste into Supabase SQL editor
-- ================================================================

-- Enable PostGIS for geo queries (optional, used for radius search)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Enums ────────────────────────────────────────────────────────

CREATE TYPE resource_category AS ENUM (
  'shelter', 'food', 'work_exchange', 'mental_health', 'medical',
  'legal', 'hygiene', 'clothing', 'childcare', 'transportation', 'other'
);

CREATE TYPE availability_status AS ENUM (
  'available', 'limited', 'full', 'unknown', 'closed'
);

CREATE TYPE verification_status AS ENUM (
  'pending', 'verified', 'rejected', 'suspended'
);

CREATE TYPE provider_role AS ENUM (
  'provider', 'admin', 'super_admin'
);

CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'waitlisted', 'cancelled', 'completed', 'no_show'
);

CREATE TYPE work_exchange_type AS ENUM (
  'volunteering', 'paid', 'skills_trade', 'internship'
);

CREATE TYPE moderation_action AS ENUM (
  'approved', 'rejected', 'suspended', 'requested_info'
);

-- ── Table: providers ─────────────────────────────────────────────

CREATE TABLE providers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name   TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT,
  website             TEXT,
  ein                 TEXT,               -- Tax EIN for nonprofits
  logo_url            TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  role                provider_role       NOT NULL DEFAULT 'provider',
  bio                 TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_providers_user_id             ON providers(user_id);
CREATE INDEX idx_providers_verification_status ON providers(verification_status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Table: resources ─────────────────────────────────────────────

CREATE TABLE resources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  category            resource_category NOT NULL,
  subcategory         TEXT,

  -- Location
  address             JSONB NOT NULL DEFAULT '{}',
  lat                 DOUBLE PRECISION NOT NULL,
  lng                 DOUBLE PRECISION NOT NULL,

  -- Contact
  phone               TEXT,
  email               TEXT,
  website             TEXT,

  -- Availability
  availability_status availability_status NOT NULL DEFAULT 'unknown',
  beds_total          INTEGER CHECK (beds_total >= 0),
  beds_available      INTEGER CHECK (beds_available >= 0),
  beds_updated_at     TIMESTAMPTZ,

  -- Intake rules
  walk_ins_accepted   BOOLEAN NOT NULL DEFAULT TRUE,
  requires_id         BOOLEAN NOT NULL DEFAULT FALSE,
  requires_referral   BOOLEAN NOT NULL DEFAULT FALSE,
  age_min             INTEGER CHECK (age_min >= 0),
  age_max             INTEGER CHECK (age_max >= 0),
  gender_restriction  TEXT DEFAULT 'any',

  -- Hours
  hours_of_operation  JSONB NOT NULL DEFAULT '{}',

  -- Meta
  verification_status verification_status NOT NULL DEFAULT 'pending',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  languages_spoken    TEXT[]  NOT NULL DEFAULT '{}',
  tags                TEXT[]  NOT NULL DEFAULT '{}',
  photos              TEXT[]  NOT NULL DEFAULT '{}',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT beds_available_lte_total
    CHECK (beds_available IS NULL OR beds_total IS NULL OR beds_available <= beds_total)
);

-- Indexes
CREATE INDEX idx_resources_provider_id         ON resources(provider_id);
CREATE INDEX idx_resources_category            ON resources(category);
CREATE INDEX idx_resources_availability_status ON resources(availability_status);
CREATE INDEX idx_resources_verification_status ON resources(verification_status);
CREATE INDEX idx_resources_is_active           ON resources(is_active);
CREATE INDEX idx_resources_lat_lng             ON resources(lat, lng);  -- bounding box queries

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Table: bookings ──────────────────────────────────────────────

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id      UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable = anonymous
  requester_name   TEXT NOT NULL,
  requester_phone  TEXT,
  requester_email  TEXT,
  notes            TEXT,
  status           booking_status NOT NULL DEFAULT 'pending',
  check_in_date    DATE,
  check_out_date   DATE,
  adults           INTEGER NOT NULL DEFAULT 1 CHECK (adults >= 1),
  children         INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bookings_resource_id ON bookings(resource_id);
CREATE INDEX idx_bookings_user_id     ON bookings(user_id);
CREATE INDEX idx_bookings_status      ON bookings(status);
CREATE INDEX idx_bookings_created_at  ON bookings(created_at DESC);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Table: work_exchanges ────────────────────────────────────────

CREATE TABLE work_exchanges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  exchange_type    work_exchange_type NOT NULL DEFAULT 'volunteering',
  hours_per_week   INTEGER CHECK (hours_per_week > 0),
  compensation     TEXT,
  skills_required  TEXT[] NOT NULL DEFAULT '{}',
  skills_gained    TEXT[] NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  address          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_exchanges_provider_id ON work_exchanges(provider_id);
CREATE INDEX idx_work_exchanges_is_active   ON work_exchanges(is_active);
CREATE INDEX idx_work_exchanges_lat_lng     ON work_exchanges(lat, lng);

CREATE TRIGGER work_exchanges_updated_at
  BEFORE UPDATE ON work_exchanges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Table: faq ───────────────────────────────────────────────────

CREATE TABLE faq (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  question  TEXT    NOT NULL,
  answer    TEXT    NOT NULL,
  category  TEXT    NOT NULL DEFAULT 'general',
  "order"   INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_faq_category  ON faq(category);
CREATE INDEX idx_faq_is_active ON faq(is_active);
CREATE INDEX idx_faq_order     ON faq("order");

-- ── Table: moderation_logs ───────────────────────────────────────

CREATE TABLE moderation_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('provider','resource','booking','work_exchange')),
  target_id   UUID NOT NULL,
  action      moderation_action NOT NULL,
  reason      TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moderation_logs_admin_id    ON moderation_logs(admin_id);
CREATE INDEX idx_moderation_logs_target      ON moderation_logs(target_type, target_id);
CREATE INDEX idx_moderation_logs_created_at  ON moderation_logs(created_at DESC);

-- ── Table: donation_campaigns ────────────────────────────────────

CREATE TABLE donation_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID REFERENCES providers(id) ON DELETE CASCADE,  -- null = platform campaign
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  goal_amount     NUMERIC(10,2) CHECK (goal_amount > 0),
  raised_amount   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (raised_amount >= 0),
  stripe_price_id TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  ends_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_donation_campaigns_provider_id ON donation_campaigns(provider_id);
CREATE INDEX idx_donation_campaigns_is_active   ON donation_campaigns(is_active);
