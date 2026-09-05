-- ================================================================
-- StreetRise — Migration 059: restrict report guard execution
--
-- resource_reports_guard() is a trigger function, not a public RPC.
-- Migration 057 created it as SECURITY DEFINER with a fixed search_path,
-- but PostgreSQL's default function privileges left EXECUTE available to
-- PUBLIC, which also exposed it to anon/authenticated through PostgREST.
-- The trigger itself continues to invoke the function normally.
-- ================================================================

REVOKE EXECUTE ON FUNCTION public.resource_reports_guard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resource_reports_guard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.resource_reports_guard() FROM authenticated;
