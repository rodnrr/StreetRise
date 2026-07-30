# Applying Migration 030 — conversation read tracking

Live project ref: `mldatfcwnmvrmxumzxyb`
Apply by hand in the Supabase SQL editor (see `BRANCH_FRESHNESS_AUDIT.md`).

## Why this matters now

`isConversationUnread()` returns `true` whenever the side's `last_read_at` is
null. With 030 unapplied, **every conversation with a message shows as unread
forever** — the indicator can never clear, because `markConversationRead()`
writes to columns that don't exist and silently no-ops with a console warning.
Applying 030 is what makes the unread state actually work.

## Verified pre-flight (2026-07-29, read-only)

| Check | Result |
|---|---|
| `provider_last_read_at` / `admin_last_read_at` exist | **false** — safe to add |
| `conversations` RLS UPDATE policy | `provider_id = my_provider_id() OR is_admin()` — **both sides can already write these columns, no RLS change needed** |
| Conversations with messages | 4 (of 5 open) |

## Dry-run results (applied in a transaction, then ROLLBACK) — all passed

- Both columns added `TIMESTAMPTZ`, nullable, no default
- All existing rows are NULL (no backfill, so everything starts "unread")
- Admin can set `admin_last_read_at`
- Provider can set `provider_last_read_at` on their **own** conversation
- Provider writing another provider's conversation affects **0 rows** (RLS holds)
- Admin unread count drops 4 → 3 after marking one read
- anon still sees 0 conversations

`ADD COLUMN ... TIMESTAMPTZ` with no default is metadata-only in modern
Postgres — no table rewrite, no meaningful lock at this row count.

---

## Step 1 — Pre-flight

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversations'
      AND column_name='provider_last_read_at') AS provider_col_exists,
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversations'
      AND column_name='admin_last_read_at')    AS admin_col_exists;
```

Both must be `false`. If either is `true`, stop — 030 is already partly applied.

## Step 2 — Apply

```sql
BEGIN;

ALTER TABLE conversations
  ADD COLUMN provider_last_read_at TIMESTAMPTZ,
  ADD COLUMN admin_last_read_at    TIMESTAMPTZ;

COMMIT;
```

## Step 3 — Post-flight

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='conversations'
  AND column_name IN ('provider_last_read_at','admin_last_read_at')
ORDER BY column_name;
```

Expect two rows, `timestamp with time zone`, `is_nullable = YES`, no default.

```sql
-- Sanity: everything starts unread, nothing backfilled
SELECT count(*) FILTER (WHERE admin_last_read_at IS NULL)    AS admin_unread,
       count(*) FILTER (WHERE provider_last_read_at IS NULL) AS provider_unread,
       count(*)                                              AS total
FROM conversations;
```

## Step 4 — Verify in the app

Sign in as admin → `/admin/messages` → open a thread → leave and return; the
unread indicator should now stay cleared. Before 030 it always came back.

---

## Notes

| Migration | Applied to live | By |
|---|---|---|
| 029_add_blog_posts_table | _fill in_ | _fill in_ |
| 030_conversation_read_tracking | _fill in_ | _fill in_ |

- 030's header still says "NOT YET APPLIED" — record the date above rather than
  editing the migration once it's live.
- `database.types.ts` now declares both columns, and `markConversationRead()` no
  longer needs its `as never` cast (replaced with typed branches). Do not
  regenerate the types from the CLI before 030 is applied.
