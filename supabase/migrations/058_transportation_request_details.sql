-- ================================================================
-- StreetRise — Migration 058: transportation request details
--
-- `bookings` remains the canonical request object. This 1:1 extension stores
-- trip-specific details for transportation requests and is intentionally
-- private: there is NO public/anonymous SELECT policy.
--
-- The RPC below writes the booking + extension in one transaction. It uses the
-- existing booking status `pending`; it does not rely on the repo/live drift
-- around `declined`.
-- ================================================================

CREATE TABLE IF NOT EXISTS booking_transportation_details (
  booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,

  destination_resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,

  origin_text TEXT NOT NULL CHECK (length(btrim(origin_text)) BETWEEN 2 AND 500),
  destination_text TEXT NOT NULL CHECK (length(btrim(destination_text)) BETWEEN 2 AND 500),

  requested_trip_at TIMESTAMPTZ,
  requested_time_window TEXT CHECK (requested_time_window IS NULL OR length(requested_time_window) <= 160),

  requested_kind TEXT NOT NULL DEFAULT 'not_sure'
    CHECK (requested_kind IN ('ride', 'accessible_ride', 'fare_assistance', 'not_sure')),

  requested_modes TEXT[] NOT NULL DEFAULT '{}',
  wheelchair_required BOOLEAN,
  mobility_notes TEXT CHECK (mobility_notes IS NULL OR length(mobility_notes) <= 1000),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_transportation_destination
  ON booking_transportation_details(destination_resource_id);

ALTER TABLE booking_transportation_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_transportation_user_read" ON booking_transportation_details;
CREATE POLICY "booking_transportation_user_read"
  ON booking_transportation_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.id = booking_transportation_details.booking_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "booking_transportation_provider_read" ON booking_transportation_details;
CREATE POLICY "booking_transportation_provider_read"
  ON booking_transportation_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = booking_transportation_details.booking_id
        AND r.provider_id = my_provider_id()
    )
  );

DROP POLICY IF EXISTS "booking_transportation_admin_read" ON booking_transportation_details;
CREATE POLICY "booking_transportation_admin_read"
  ON booking_transportation_details FOR SELECT
  USING (is_admin());

-- No direct INSERT/UPDATE/DELETE policy is granted to anon/authenticated users.
-- Public submissions go through the transaction-safe RPC below.

CREATE OR REPLACE FUNCTION submit_transportation_request(
  p_resource_id UUID,
  p_destination_resource_id UUID,
  p_origin_text TEXT,
  p_destination_text TEXT,
  p_requested_trip_at TIMESTAMPTZ DEFAULT NULL,
  p_requested_time_window TEXT DEFAULT NULL,
  p_requested_modes TEXT[] DEFAULT '{}',
  p_wheelchair_required BOOLEAN DEFAULT NULL,
  p_mobility_notes TEXT DEFAULT NULL,
  p_requested_kind TEXT DEFAULT 'not_sure',
  p_requester_name TEXT DEFAULT NULL,
  p_requester_phone TEXT DEFAULT NULL,
  p_requester_email TEXT DEFAULT NULL,
  p_contact_preference TEXT DEFAULT 'either',
  p_best_contact_time TEXT DEFAULT NULL,
  p_contact_consent BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_booking_id UUID := gen_random_uuid();
  program_category resource_category;
  summary TEXT;
BEGIN
  SELECT category
    INTO program_category
    FROM resources
   WHERE id = p_resource_id
     AND is_active = TRUE
     AND verification_status IN ('verified', 'pending');

  IF program_category IS DISTINCT FROM 'transportation' THEN
    RAISE EXCEPTION 'transportation program is not available'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_contact_consent IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'contact consent is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF length(btrim(COALESCE(p_requester_name, ''))) < 2 THEN
    RAISE EXCEPTION 'requester name is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NULLIF(btrim(COALESCE(p_requester_phone, '')), '') IS NULL
     AND NULLIF(btrim(COALESCE(p_requester_email, '')), '') IS NULL THEN
    RAISE EXCEPTION 'phone or email is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_contact_preference NOT IN ('phone', 'email', 'either') THEN
    RAISE EXCEPTION 'invalid contact preference'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_requested_kind NOT IN ('ride', 'accessible_ride', 'fare_assistance', 'not_sure') THEN
    RAISE EXCEPTION 'invalid transportation request type'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_requested_modes, '{}')) m
    WHERE m NOT IN ('bus', 'rideshare', 'wheelchair', 'paratransit')
  ) THEN
    RAISE EXCEPTION 'invalid transportation mode'
      USING ERRCODE = 'check_violation';
  END IF;

  summary := concat_ws(E'\n',
    '[Transportation request]',
    'From: ' || btrim(p_origin_text),
    'To: ' || btrim(p_destination_text),
    CASE WHEN p_requested_trip_at IS NOT NULL
      THEN 'When: ' || to_char(p_requested_trip_at AT TIME ZONE 'America/New_York', 'Mon DD, YYYY HH12:MI AM')
      WHEN NULLIF(btrim(COALESCE(p_requested_time_window, '')), '') IS NOT NULL
      THEN 'When: ' || btrim(p_requested_time_window)
      ELSE 'When: Not specified'
    END,
    'Request: ' || replace(p_requested_kind, '_', ' '),
    CASE WHEN cardinality(COALESCE(p_requested_modes, '{}')) > 0
      THEN 'Modes: ' || array_to_string(p_requested_modes, ', ')
      ELSE NULL
    END,
    CASE WHEN p_wheelchair_required IS TRUE THEN 'Wheelchair-accessible transportation requested' ELSE NULL END,
    CASE WHEN NULLIF(btrim(COALESCE(p_mobility_notes, '')), '') IS NOT NULL
      THEN 'Mobility notes: ' || btrim(p_mobility_notes)
      ELSE NULL
    END,
    CASE WHEN NULLIF(btrim(COALESCE(p_notes, '')), '') IS NOT NULL
      THEN E'\nAdditional notes: ' || btrim(p_notes)
      ELSE NULL
    END
  );

  INSERT INTO bookings (
    id,
    resource_id,
    user_id,
    requester_name,
    requester_phone,
    requester_email,
    contact_preference,
    best_contact_time,
    contact_consent,
    notes,
    status,
    adults,
    children
  ) VALUES (
    new_booking_id,
    p_resource_id,
    auth.uid(),
    btrim(p_requester_name),
    NULLIF(btrim(COALESCE(p_requester_phone, '')), ''),
    NULLIF(btrim(COALESCE(p_requester_email, '')), ''),
    p_contact_preference,
    NULLIF(btrim(COALESCE(p_best_contact_time, '')), ''),
    TRUE,
    summary,
    'pending',
    1,
    0
  );

  INSERT INTO booking_transportation_details (
    booking_id,
    destination_resource_id,
    origin_text,
    destination_text,
    requested_trip_at,
    requested_time_window,
    requested_kind,
    requested_modes,
    wheelchair_required,
    mobility_notes
  ) VALUES (
    new_booking_id,
    p_destination_resource_id,
    btrim(p_origin_text),
    btrim(p_destination_text),
    p_requested_trip_at,
    NULLIF(btrim(COALESCE(p_requested_time_window, '')), ''),
    p_requested_kind,
    COALESCE(p_requested_modes, '{}'),
    p_wheelchair_required,
    NULLIF(btrim(COALESCE(p_mobility_notes, '')), '')
  );

  RETURN new_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION submit_transportation_request(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT[], BOOLEAN, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION submit_transportation_request(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT[], BOOLEAN, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT
) TO anon, authenticated;
