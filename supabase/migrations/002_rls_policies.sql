-- ================================================================
-- StreetRise — Migration 002: Row Level Security Policies
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE providers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_exchanges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq               ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;

-- ── Helper: check if current user is admin ───────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM providers
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND verification_status = 'verified'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Helper: get provider_id for current user ─────────────────────

CREATE OR REPLACE FUNCTION my_provider_id()
RETURNS UUID AS $$
  SELECT id FROM providers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ================================================================
-- providers
-- ================================================================

-- Anyone can read verified providers (for public directory)
CREATE POLICY "providers_public_read"
  ON providers FOR SELECT
  USING (verification_status = 'verified');

-- Providers can read their own record (even if pending)
CREATE POLICY "providers_own_read"
  ON providers FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all providers
CREATE POLICY "providers_admin_read"
  ON providers FOR SELECT
  USING (is_admin());

-- Users can create their own provider profile
CREATE POLICY "providers_insert_self"
  ON providers FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Providers can update their own record
CREATE POLICY "providers_update_self"
  ON providers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    -- Providers cannot change their own role or verification status
    role = (SELECT role FROM providers WHERE user_id = auth.uid())
    AND verification_status = (SELECT verification_status FROM providers WHERE user_id = auth.uid())
  );

-- Admins can update any provider (including role/verification)
CREATE POLICY "providers_admin_update"
  ON providers FOR UPDATE
  USING (is_admin());

-- ================================================================
-- resources
-- ================================================================

-- Public can read active + verified resources
CREATE POLICY "resources_public_read"
  ON resources FOR SELECT
  USING (is_active = TRUE AND verification_status = 'verified');

-- Providers can read their own resources regardless of status
CREATE POLICY "resources_provider_read"
  ON resources FOR SELECT
  USING (provider_id = my_provider_id());

-- Admins can read all resources
CREATE POLICY "resources_admin_read"
  ON resources FOR SELECT
  USING (is_admin());

-- Providers can create resources for their org
CREATE POLICY "resources_provider_insert"
  ON resources FOR INSERT
  WITH CHECK (provider_id = my_provider_id());

-- Providers can update their own resources (but not verification_status)
CREATE POLICY "resources_provider_update"
  ON resources FOR UPDATE
  USING (provider_id = my_provider_id())
  WITH CHECK (
    verification_status = (SELECT verification_status FROM resources WHERE id = resources.id)
  );

-- Admins can update any resource
CREATE POLICY "resources_admin_update"
  ON resources FOR UPDATE
  USING (is_admin());

-- Providers can delete (deactivate) their own resources
CREATE POLICY "resources_provider_delete"
  ON resources FOR DELETE
  USING (provider_id = my_provider_id());

-- ================================================================
-- bookings
-- ================================================================

-- Authenticated users can read their own bookings
CREATE POLICY "bookings_user_read"
  ON bookings FOR SELECT
  USING (user_id = auth.uid());

-- Providers can read bookings for their resources
CREATE POLICY "bookings_provider_read"
  ON bookings FOR SELECT
  USING (
    resource_id IN (SELECT id FROM resources WHERE provider_id = my_provider_id())
  );

-- Admins can read all bookings
CREATE POLICY "bookings_admin_read"
  ON bookings FOR SELECT
  USING (is_admin());

-- Anyone (even anon) can create a booking
CREATE POLICY "bookings_public_insert"
  ON bookings FOR INSERT
  WITH CHECK (TRUE);

-- Users can update their own bookings (e.g., cancel)
CREATE POLICY "bookings_user_update"
  ON bookings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (status = 'cancelled');  -- users can only cancel

-- Providers can update booking status for their resources
CREATE POLICY "bookings_provider_update"
  ON bookings FOR UPDATE
  USING (
    resource_id IN (SELECT id FROM resources WHERE provider_id = my_provider_id())
  );

-- Admins can update any booking
CREATE POLICY "bookings_admin_update"
  ON bookings FOR UPDATE
  USING (is_admin());

-- ================================================================
-- work_exchanges
-- ================================================================

CREATE POLICY "work_exchanges_public_read"
  ON work_exchanges FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "work_exchanges_provider_read"
  ON work_exchanges FOR SELECT
  USING (provider_id = my_provider_id());

CREATE POLICY "work_exchanges_admin_read"
  ON work_exchanges FOR SELECT
  USING (is_admin());

CREATE POLICY "work_exchanges_provider_insert"
  ON work_exchanges FOR INSERT
  WITH CHECK (provider_id = my_provider_id());

CREATE POLICY "work_exchanges_provider_update"
  ON work_exchanges FOR UPDATE
  USING (provider_id = my_provider_id());

CREATE POLICY "work_exchanges_admin_update"
  ON work_exchanges FOR UPDATE
  USING (is_admin());

-- ================================================================
-- faq
-- ================================================================

-- Public can read active FAQs
CREATE POLICY "faq_public_read"
  ON faq FOR SELECT
  USING (is_active = TRUE);

-- Admins can do everything
CREATE POLICY "faq_admin_all"
  ON faq FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================================================
-- moderation_logs
-- ================================================================

-- Only admins can read moderation logs
CREATE POLICY "moderation_logs_admin_read"
  ON moderation_logs FOR SELECT
  USING (is_admin());

-- Only admins can create moderation logs
CREATE POLICY "moderation_logs_admin_insert"
  ON moderation_logs FOR INSERT
  WITH CHECK (is_admin() AND admin_id = auth.uid());

-- ================================================================
-- donation_campaigns
-- ================================================================

-- Public can read active campaigns
CREATE POLICY "donation_campaigns_public_read"
  ON donation_campaigns FOR SELECT
  USING (is_active = TRUE);

-- Admins can manage all campaigns
CREATE POLICY "donation_campaigns_admin_all"
  ON donation_campaigns FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Providers can manage their own campaigns
CREATE POLICY "donation_campaigns_provider_manage"
  ON donation_campaigns FOR ALL
  USING (provider_id = my_provider_id())
  WITH CHECK (provider_id = my_provider_id());
