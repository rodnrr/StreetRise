-- ================================================================
-- StreetRise — Migration 048: Optimize transit RLS policies
--
-- Migration 042 created a public SELECT policy plus an admin FOR ALL policy
-- on each transit table. That is functionally correct, but Supabase's
-- performance advisor flags the overlapping SELECT paths as multiple
-- permissive policies. Transit data is public-read anyway, so admins do not
-- need a second SELECT policy. Keep one public SELECT policy and grant admins
-- only the write actions they actually need.
-- ================================================================

DROP POLICY IF EXISTS transit_routes_admin_all ON transit_routes;
DROP POLICY IF EXISTS transit_stops_admin_all ON transit_stops;

CREATE POLICY transit_routes_admin_insert
  ON transit_routes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY transit_routes_admin_update
  ON transit_routes
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY transit_routes_admin_delete
  ON transit_routes
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY transit_stops_admin_insert
  ON transit_stops
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY transit_stops_admin_update
  ON transit_stops
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY transit_stops_admin_delete
  ON transit_stops
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));
