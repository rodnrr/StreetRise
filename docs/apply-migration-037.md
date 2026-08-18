# Applying Migration 037 — Confidence Trigger Parity

**Status: NOT APPLIED. It is a no-op on live**, which already has both objects.
That is the point: live has them, the repository did not.

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
