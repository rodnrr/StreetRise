-- ================================================================
-- StreetRise — Migration 037: Capture the live confidence trigger
--
-- NOT YET APPLIED. It is a NO-OP on live, which already has both
-- objects below — that is precisely the problem this migration fixes.
-- Runbook: docs/apply-migration-037.md
--
-- ── What is wrong ─────────────────────────────────────────────
-- `resources.confidence_score` is trigger-managed, and live runs TWO
-- BEFORE INSERT OR UPDATE triggers against it. Postgres fires BEFORE
-- row triggers in alphabetical order by trigger name:
--
--   1. resources_confidence_score → compute_confidence_score()
--      Defined by migration 010. An additive formula (is_active,
--      description length, phone, website, hours, verification_status,
--      freshness, map-readiness) capped at 100.
--
--   2. trg_resource_confidence    → fn_update_resource_confidence()
--      Runs SECOND ('t' > 'r') and does not accumulate — it ASSIGNS,
--      so it overwrites whatever step 1 computed.
--
-- Object 2 exists on live and in NO migration in this repository. It
-- was created by hand and never written down. The consequence is a
-- silent divergence in stored data, not just in schema:
--
--   • live                      → a pending resource scores 35
--   • rebuilt from migrations   → the same row scores ~80
--
-- 80 on a listing nobody has phoned is an over-claim of confidence,
-- and it appears only in CI, staging, review apps and disaster-recovery
-- restores — never in the environment anyone checks.
--
-- Found by Codex review on PR #79 while reviewing migration 036. This
-- is the second finding on that PR of the same shape: live carries
-- state no migration reproduces, so verifying against live cannot
-- detect it. The first was an imported provider row (036 section 1b).
--
-- ── What this migration does ──────────────────────────────────
-- Reproduces both objects EXACTLY as live defines them (read back with
-- pg_get_functiondef / pg_get_triggerdef on 2026-08-18), so a rebuilt
-- database behaves like live. It deliberately does not change live's
-- behaviour, redesign the scoring, or touch existing rows.
--
-- Safe and idempotent: CREATE OR REPLACE on an identical body, and
-- DROP TRIGGER IF EXISTS before CREATE TRIGGER. Running it on live
-- leaves every stored confidence_score exactly as it is.
--
-- ── Known wart, deliberately NOT fixed here ───────────────────
-- Having two triggers where the second discards the first's work is
-- wasteful and confusing: compute_confidence_score() is dead weight on
-- every insert and update. Consolidating them is a real cleanup, but it
-- would change scores for verified and stale rows across the whole
-- table, which is a product decision and not this migration's job.
-- Recorded in docs/OPEN_ITEMS.md. This migration only makes the repo
-- tell the truth about what live already does.
-- ================================================================


-- ── The second, previously-undocumented trigger function ─────────
-- Verbatim from live. verification_status is an enum; the text literals
-- below are compared via the implicit cast, exactly as live does it.

CREATE OR REPLACE FUNCTION public.fn_update_resource_confidence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  days_since NUMERIC;
  threshold  INTEGER;
BEGIN
  threshold   := COALESCE(NEW.stale_after_days, 30);
  days_since  := EXTRACT(EPOCH FROM (
    NOW() - COALESCE(NEW.last_provider_update_at, NEW.last_verified_at, NEW.created_at)
  )) / 86400.0;

  IF NEW.verification_status IN ('rejected', 'suspended') THEN
    NEW.confidence_score := 0;
  ELSIF NEW.verification_status = 'pending' THEN
    NEW.confidence_score := 35;
  ELSIF days_since > threshold THEN
    NEW.confidence_score := 20;           -- stale
  ELSIF days_since > threshold * 0.7 THEN
    NEW.confidence_score := 50;           -- aging
  ELSIF days_since > threshold * 0.3 THEN
    NEW.confidence_score := 70;           -- fresh
  ELSE
    NEW.confidence_score := 90;           -- very fresh / just updated
  END IF;

  RETURN NEW;
END;
$function$;


-- The name matters. 'trg_resource_confidence' sorts after
-- 'resources_confidence_score', which is the only reason this function
-- gets the last word over migration 010's. Renaming either trigger
-- silently inverts the scoring for the whole table.

DROP TRIGGER IF EXISTS trg_resource_confidence ON public.resources;

CREATE TRIGGER trg_resource_confidence
  BEFORE INSERT OR UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION fn_update_resource_confidence();


-- ════════════════════════════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════════════════════════════

-- Expect exactly these two rows, in this order — the order is the
-- behaviour, not a detail:
--   resources_confidence_score
--   trg_resource_confidence
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid = 'resources'::regclass AND NOT tgisinternal
--    AND tgname LIKE '%confidence%'
--  ORDER BY tgname;

-- Expect 0 — every pending resource must score 35, on live and on a
-- rebuilt database alike. Before this migration a rebuilt database
-- returned every pending row here.
-- SELECT count(*) FROM resources
--  WHERE verification_status = 'pending' AND confidence_score <> 35;

-- Expect unchanged counts on live (no row is rewritten by this file):
-- SELECT confidence_score, count(*) FROM resources GROUP BY 1 ORDER BY 1;
