# Applying Migration 040 — Extend Staleness Window to 90 Days

**Status: not yet applied to live.** Hand-apply via the Supabase SQL editor,
same as every other migration in this repo — see `CLAUDE.md` → Database
Migrations for why this is by hand and not via `supabase db push`.

## Why it exists

At the migration-010 default of 30 days, keeping the "may be outdated" signal
accurate meant renewing every listing roughly monthly — either by hand or by
running the (paid, per-run) work-exchange-agent-style verification bot. That
doesn't scale as the number of listings grows, and a growing pile of
unrenewed "may be outdated" badges was making the platform look less
trustworthy over time, not more. This raises the threshold to 90 days.

Paired with an app-code change in the same PR: the public "may be outdated"
badge is removed entirely from the map card (`ResourceCard.tsx`), the detail
sheet (`ResourceSheet.tsx`), and `/resources/:id` (`ResourceDetailPage.tsx`).
Freshness now shows only in the provider portal (`ProviderListings.tsx`) and
admin (`AdminResourceEdit.tsx`, and the new bulk "Quick refresh" panel on
`/admin/resources`). This migration widens the threshold for that
internal-only signal; it does not touch the removed public copy, which no
longer reads `stale_after_days` at all.

## What it does

1. `ALTER COLUMN stale_after_days SET DEFAULT 90` — new rows.
2. Backfills every existing row still at the old default: `UPDATE resources
   SET stale_after_days = 90 WHERE stale_after_days < 90`. Only raises —
   never lowers a row some future admin tool sets higher on purpose.

Live already runs `fn_update_resource_confidence()` (the hand-created trigger
captured, but not yet applied, by migration 037 — see `docs/apply-migration-037.md`).
It reads `threshold := COALESCE(NEW.stale_after_days, 30)` directly, so this
change takes effect on live's real `confidence_score` the moment it runs,
**independent of whether 037 is ever applied**.

## What it does NOT do

Does not touch `updated_at`. The backfill recomputes `confidence_score`
(correctly — the threshold it's scored against changed) but disables
`resources_updated_at` for the duration, same as migration 037, so the
backfill cannot manufacture false freshness by bumping every listing's
"last updated" timestamp as a side effect of an unrelated schema change.

## How to apply

1. Supabase dashboard → project `mldatfcwnmvrmxumzxyb` → **SQL Editor**.
2. Paste `supabase/migrations/040_extend_staleness_window.sql`.
3. Run it once.

Idempotent — re-running it after every row is already at 90 is a no-op.

## Verify

```sql
-- Expect 0
SELECT count(*) FROM resources WHERE stale_after_days < 90;

-- Confirm updated_at was untouched. Run BEFORE applying:
CREATE TEMP TABLE ts_before_040 AS SELECT id, updated_at FROM resources;
-- …apply the migration…
-- Then, expect 0:
SELECT count(*) FROM resources r JOIN ts_before_040 b USING (id)
 WHERE r.updated_at IS DISTINCT FROM b.updated_at;
```
