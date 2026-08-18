# Applying Migration 037 — Confidence Trigger Parity

**Status: NOT APPLIED.** Live already has both objects — that is the point: live
has them, the repository did not. The DDL is a no-op there.

⚠️ **The backfill is not a no-op on live.** It re-scores **66 stale verified
rows to 20**. Read [What applying it does to live](#what-applying-it-does-to-live)
before running this against production. Nothing disappears from the map and no
listing gains false freshness, but it is a real data change and deserves a
deliberate decision.

## Why it exists

`resources.confidence_score` is trigger-managed. Live runs **two** BEFORE INSERT
OR UPDATE triggers on `resources`, and Postgres fires BEFORE row triggers in
alphabetical order by trigger name:

| order | trigger | function | defined in |
|---|---|---|---|
| 1 | `resources_confidence_score` | `compute_confidence_score()` | migration 010 |
| 2 | `trg_resource_confidence` | `fn_update_resource_confidence()` | **nowhere — live only** |

The second does not accumulate, it assigns — so it overwrites whatever the first
computed. It was created by hand on live and never written into a migration.

The result was a silent divergence in stored **data**, not merely schema:

- on live — a `pending` resource scores **35**
- rebuilt from migrations — the same row scores **~80**

80 on a listing nobody has phoned overstates confidence, and it shows up only in
CI, staging, review apps and disaster-recovery restores — never in the
environment anyone actually looks at.

Found by Codex review on PR #79. It is the **second** finding of that exact
shape on that PR: live carrying state no migration reproduces, which verifying
against live cannot detect by construction. The first was an imported provider
row (migration 036 section 1b).

## What applying it does to live

The DDL changes nothing. The backfill does, because a trigger only fires on
writes — every row written before this migration still holds a score from the
old rule, so the migration recomputes them. Measured on live 2026-08-18:

| rows | now | after | why |
|---|---|---|---|
| pending (all) | 35 | 35 | unchanged |
| verified | 70 | **20** | 31 rows, past `stale_after_days` |
| verified | 50 | **20** | 20 rows, past `stale_after_days` |
| verified | 90 | **20** | 15 rows, past `stale_after_days` |
| rejected / suspended | — | — | none exist |

Those 66 are not being damaged. `fn_update_resource_confidence()` scores by
staleness, and their values were frozen whenever each row was last written —
long enough ago that `days_since` now exceeds the threshold. 20 is what the rule
already says they are worth; they had simply never been recomputed.

**Nothing disappears from the map.** `mapFilters.ts` uses
`MIN_CONFIDENCE_SCORE = 20` with a `>=` test, so exactly 20 still passes.

**No listing gains false freshness.** The recompute is a no-op `UPDATE`, which
would normally fire `resources_updated_at` and stamp all ~197 listings as
updated today — and `getTrustInfo()` reads `updated_at` for the "Updated Xd ago"
and stale warnings. That trigger is disabled for the duration of the backfill
and restored immediately, inside one transaction.

Because of this, applying 037 to live is **optional and unhurried**. The parity
problem it fixes only bites a rebuilt database.

## How to apply

1. Supabase dashboard → project `mldatfcwnmvrmxumzxyb` → **SQL Editor**.
2. Paste `supabase/migrations/037_resource_confidence_trigger_parity.sql`.
3. Run it once.

It reproduces both objects exactly as live defines them (read back with
`pg_get_functiondef` / `pg_get_triggerdef` on 2026-08-18, and diffed against the
file). `CREATE OR REPLACE` on an identical body plus `DROP TRIGGER IF EXISTS`
before `CREATE TRIGGER` makes it idempotent. **No stored `confidence_score`
changes on live.**

There is no urgency for live. It matters the moment anyone builds a database
from migrations.

## Verify

```sql
-- Two triggers, in this order — the order IS the behaviour
SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'resources'::regclass AND NOT tgisinternal
   AND tgname LIKE '%confidence%'
 ORDER BY tgname;
--  resources_confidence_score
--  trg_resource_confidence

-- Expect 0 on live and, after this migration, on a rebuilt database too
SELECT count(*) FROM resources
 WHERE verification_status = 'pending' AND confidence_score <> 35;

-- Expect unchanged on live — this migration rewrites no rows
SELECT confidence_score, count(*) FROM resources GROUP BY 1 ORDER BY 1;
```

## Deliberately not fixed here

Two triggers where the second discards the first's work is wasteful and
confusing — `compute_confidence_score()` is dead weight on every insert and
update. Consolidating them would change scores for `verified` and stale rows
across the whole table, which is a product decision, not a parity fix. Logged in
`docs/OPEN_ITEMS.md`.
