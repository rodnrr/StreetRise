# Applying migration 035 — Work Exchange agent

Migration 035 adds provenance columns to `work_exchanges` and creates the
`work_exchange_candidates` review queue. Like every other migration in this
repo it is applied **by hand** in the Supabase SQL editor against project
`mldatfcwnmvrmxumzxyb`.

You can do all of this from a phone browser — no terminal needed.

---

## 1. Check what live already has

Open **Supabase Dashboard → SQL Editor → New query**, paste this, and run it.
It only reads.

```sql
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'work_exchanges' AND column_name = 'source_url')       AS has_source_url,
  (SELECT count(*) FROM information_schema.tables
     WHERE table_name = 'work_exchange_candidates')                            AS has_candidates_table,
  (SELECT count(*) FROM work_exchanges)                                        AS listings_total,
  (SELECT count(*) FROM work_exchanges WHERE is_active)                        AS listings_active;
```

Expected **before** applying: `has_source_url = 0`, `has_candidates_table = 0`.
If either is already `1`, migration 035 has been applied — skip to step 3.

---

## 2. Apply it

Open `supabase/migrations/035_work_exchange_agent.sql` on GitHub, tap **Raw**,
copy the whole file, paste it into a new SQL editor query, and **Run**.

The whole file is safe to re-run: every statement is `IF NOT EXISTS`, the
constraint additions are guarded, and the backfill only touches rows whose
`external_id` is still null.

You should see `Success. No rows returned`.

---

## 3. Verify

```sql
-- 17 seeded listings should now carry an external_id and a source URL.
SELECT source_type, count(*), count(source_url) AS with_source_url
  FROM work_exchanges
 GROUP BY source_type
 ORDER BY source_type;

-- The queue exists and is empty.
SELECT count(*) FROM work_exchange_candidates;

-- RLS is on and admin-only.
SELECT relrowsecurity FROM pg_class WHERE relname = 'work_exchange_candidates';
SELECT polname, polcmd FROM pg_policy
 WHERE polrelid = 'work_exchange_candidates'::regclass;
```

Expected:

- `source_type = 'seeded'` with **29** rows, all 29 with a source URL — 17 from
  migrations 020/028 and 12 from 032's South Florida batch. Any rows under
  `provider_posted` are listings a provider entered themselves; those correctly
  have no source URL and the agent skips them.
- `work_exchange_candidates` count `0`.
- `relrowsecurity = true`, one policy `wx_candidates_admin_all` with `polcmd = *`.

---

## 4. Check the admin screen

Once the app is deployed, sign in as an admin and open
**/admin/work-exchange**. It should load with "Nothing awaiting review" and the
sidebar should show a **Work Exchange** entry with no badge.

If it errors instead, RLS or the table is missing — re-run step 3.

---

## Rolling back

Nothing here changes existing behaviour on its own: the new columns are
nullable or defaulted, and no existing query reads them. If you want it gone
anyway:

```sql
DROP TABLE IF EXISTS work_exchange_candidates;

ALTER TABLE work_exchanges
  DROP COLUMN IF EXISTS external_id,
  DROP COLUMN IF EXISTS source_url,
  DROP COLUMN IF EXISTS source_type,
  DROP COLUMN IF EXISTS last_verified_at,
  DROP COLUMN IF EXISTS last_verify_status;
```

Dropping the columns loses the source URLs backfilled in step 2; re-applying
035 restores them, since they are written into the migration itself.

---

## Next

Migration 035 only creates the plumbing. To actually fill the queue, see
[`work-exchange-agent.md`](./work-exchange-agent.md) — including how to run it
from the GitHub web UI without a terminal.
