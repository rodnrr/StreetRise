-- ================================================================
-- StreetRise — Migration 037: Capture the live confidence trigger
--
-- NOT YET APPLIED. Live already has both objects below — that is
-- precisely the problem this migration fixes. The DDL is a no-op there;
-- the backfill near the end is NOT, and re-scores 66 stale verified
-- rows to 20. Read the "What this backfill does to LIVE" section before
-- running this against production.
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
-- 1. Reproduces both objects EXACTLY as live defines them (read back
--    with pg_get_functiondef / pg_get_triggerdef on 2026-08-18), so a
--    rebuilt database applies the same rule live does.
-- 2. Recomputes existing rows, because a trigger only fires on writes
--    and every row written before this migration holds a score from the
--    old rule. Installing the rule without the recompute would leave the
--    data wrong and this file's own VERIFY query failing.
--
-- It does not redesign the scoring — the ladder is live's, unchanged.
--
-- The DDL is idempotent: CREATE OR REPLACE on an identical body, and
-- DROP TRIGGER IF EXISTS before CREATE TRIGGER. The backfill is
-- re-runnable too; it converges on the same values.
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


-- ── Backfill: the trigger only fires on WRITES ───────────────────
--
-- Creating the trigger does nothing to rows that already exist. On a
-- database rebuilt from migrations, every row inserted by 010–036 was
-- written while only compute_confidence_score() existed, so it holds an
-- additive score — including ~80 for migration 036's pending listings.
-- Without the recompute below, this migration installs the right rule
-- and leaves the wrong data behind, and the first VERIFY query would
-- not return zero on the very database this file exists to fix.
-- (Caught by Codex review on PR #79, reviewing 037 itself.)
--
-- Migration 010 established the idiom: a no-op UPDATE that changes no
-- column but fires BEFORE UPDATE. One addition here — `resources` also
-- carries `resources_updated_at`, which sets updated_at = now() on any
-- UPDATE. Firing that across the table would stamp all ~197 listings as
-- updated today, and getTrustInfo() reads updated_at to render "Updated
-- Xd ago" and the stale warnings. A confidence recompute must not
-- manufacture freshness, so that one trigger is disabled for the
-- duration and restored immediately.
--
-- Run as a single transaction. If anything fails, the DISABLE rolls
-- back with it and no trigger is left switched off.

BEGIN;

ALTER TABLE public.resources DISABLE TRIGGER resources_updated_at;

-- Touches no column; exists only to make both confidence triggers run.
UPDATE public.resources SET stale_after_days = stale_after_days;

ALTER TABLE public.resources ENABLE TRIGGER resources_updated_at;

COMMIT;


-- ── What this backfill does to LIVE, if applied there ────────────
--
-- Everything above is a no-op on live EXCEPT this recompute, so read
-- this before running 037 against production.
--
-- Measured on live 2026-08-18, before applying:
--   • pending rows        — no change. All already hold 35.
--   • verified rows       — 66 rows drop to 20:
--         31 rows now 70  → 20
--         20 rows now 50  → 20
--         15 rows now 90  → 20
--   • rejected/suspended  — none exist.
--
-- Those 66 are not being damaged; they are overdue a recompute. The
-- ladder in fn_update_resource_confidence() scores by staleness, and
-- their scores were frozen at whenever each row was last written, some
-- of them long enough ago that days_since now exceeds stale_after_days.
-- 20 is what the rule already says they are worth.
--
-- Nothing disappears from the map: mapFilters.ts uses
-- MIN_CONFIDENCE_SCORE = 20 with a >= test, so a score of exactly 20
-- still passes. The visible effect is on trust presentation, not
-- availability — and updated_at is untouched, so no listing starts
-- claiming it was refreshed today.
--
-- Applying 037 to live is therefore optional and unhurried. The parity
-- problem it fixes only bites a rebuilt database.


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

-- Expect 0 — no row may hold a score the trigger would not assign.
-- This is the query the backfill exists to satisfy; without it, a
-- rebuilt database fails here on every row written before 037.
-- SELECT count(*) FROM resources r
--  WHERE r.confidence_score IS DISTINCT FROM (
--    CASE
--      WHEN r.verification_status IN ('rejected','suspended') THEN 0
--      WHEN r.verification_status = 'pending' THEN 35
--      WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(r.last_provider_update_at,
--             r.last_verified_at, r.created_at)))/86400.0
--           > COALESCE(r.stale_after_days,30)       THEN 20
--      WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(r.last_provider_update_at,
--             r.last_verified_at, r.created_at)))/86400.0
--           > COALESCE(r.stale_after_days,30)*0.7   THEN 50
--      WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(r.last_provider_update_at,
--             r.last_verified_at, r.created_at)))/86400.0
--           > COALESCE(r.stale_after_days,30)*0.3   THEN 70
--      ELSE 90
--    END);

-- Expect NO row stamped as freshly updated by this migration — the
-- backfill must not have manufactured freshness:
-- SELECT count(*) FROM resources WHERE updated_at > NOW() - INTERVAL '5 minutes';

-- Score distribution after the backfill, for the record:
-- SELECT confidence_score, count(*) FROM resources GROUP BY 1 ORDER BY 1;
