-- Migration 005: Make work_exchanges lat/lng nullable
-- Providers may not have exact coordinates at time of posting

ALTER TABLE work_exchanges
  ALTER COLUMN lat DROP NOT NULL,
  ALTER COLUMN lng DROP NOT NULL;
