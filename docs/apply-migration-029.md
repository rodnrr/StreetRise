# Applying Migration 029 — `blog_posts`

Live project ref: `mldatfcwnmvrmxumzxyb`

Per `BRANCH_FRESHNESS_AUDIT.md`, migrations here are applied to live **by hand in
the Supabase SQL editor** — not by the Cloudflare deploy, not by `supabase db
push`. Repo filenames have no timestamp prefixes, so repo and live migration
history drift. **Live is a separate source of truth.**

> Automated `apply_migration` via the Supabase MCP was attempted 2026-07-29 and
> was **blocked** ("No approval received") — the same DDL gate noted in 030's
> header. Paste by hand in the SQL editor.

---

## Verified pre-flight state (2026-07-29, read-only)

| Check | Result |
|---|---|
| `blog_posts` exists | **false** — safe to create |
| `is_admin()` exists | true (029's RLS depends on it) |
| `update_updated_at()` exists | true (029's trigger depends on it) |
| Verified admins in `providers` | **2** — admin writes will work |
| Default privileges on `public` | grants tables to `anon`/`authenticated` automatically → **029 needs no explicit GRANTs** |
| Migration 030 applied | **false** — `conversations.admin_last_read_at` missing on live |

## Dry-run results (full migration applied in a transaction, then ROLLBACK)

All passed on the corrected migration:

- 11 columns; RLS enabled; exactly 2 policies
- 4 indexes: `blog_posts_pkey`, `blog_posts_slug_key`, `idx_blog_posts_is_published`, `idx_blog_posts_published_at`
- `updated_at` trigger sets `updated_at = now()` on UPDATE
- anon sees only `is_published = true`; a draft fetched by slug returns **0 rows** (no draft leak)
- anon INSERT / UPDATE / DELETE all blocked (SQLSTATE 42501)
- non-admin authenticated INSERT blocked
- admin sees drafts, can publish, can delete

Two dry-run "failures" were **test artifacts, not schema bugs**: `now()` is frozen
per transaction (so `created_at == updated_at` on insert), and a leftover
`request.jwt.claims` made `is_admin()` return true under the anon role. Both were
re-tested correctly and pass.

### Correction made before applying

029 originally contained `CREATE INDEX idx_blog_posts_slug ON blog_posts(slug)`.
`slug TEXT NOT NULL UNIQUE` already creates a unique btree index on that column,
so this was a pure duplicate — write overhead for zero read benefit. **Removed.**
This edit is allowed because 029 is not yet applied (`CLAUDE.md` forbids editing
*applied* migrations only), and pre-apply is the only moment the fix is free.

---

## Step 1 — Apply

Supabase SQL editor → project `mldatfcwnmvrmxumzxyb` → paste and run. Wrapped so
it is all-or-nothing.

```sql
BEGIN;

CREATE TABLE blog_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        NOT NULL UNIQUE,
  title         TEXT        NOT NULL,
  excerpt       TEXT        NOT NULL,
  body_markdown TEXT        NOT NULL,
  cover_image_url TEXT,
  author_name   TEXT        NOT NULL DEFAULT 'StreetRise Team',
  is_published  BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No index on `slug`: the UNIQUE constraint already provides a unique btree.
CREATE INDEX idx_blog_posts_is_published ON blog_posts(is_published);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_public_read"
  ON blog_posts FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "blog_posts_admin_all"
  ON blog_posts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

COMMIT;
```

## Step 2 — Post-flight (expect all true / exact counts)

```sql
SELECT
  to_regclass('public.blog_posts') IS NOT NULL AS table_exists,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='blog_posts')                 AS cols_expect_11,
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.blog_posts'::regclass) AS rls_enabled,
  (SELECT count(*) FROM pg_policies
     WHERE schemaname='public' AND tablename='blog_posts')                    AS policies_expect_2,
  (SELECT count(*) FROM pg_indexes
     WHERE schemaname='public' AND tablename='blog_posts')                    AS indexes_expect_4,
  (SELECT count(*) FROM pg_trigger
     WHERE tgrelid='public.blog_posts'::regclass AND NOT tgisinternal)        AS triggers_expect_1,
  (SELECT count(*) FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='blog_posts'
       AND grantee IN ('anon','authenticated') AND privilege_type='SELECT')   AS select_grants_expect_2;
```

## Step 3 — Verify in the app

Sign in as admin → `/admin/blog` → **New Post** → save a draft →
confirm `/blog` still shows "No posts yet" → **Publish** → confirm the post
appears at `/blog` and `/blog/<slug>`.

---

## Notes

| Migration | Applied to live | By |
|---|---|---|
| 029_add_blog_posts_table | _fill in_ | _fill in_ |

- **029's header still says "NOT YET APPLIED."** Once applied, don't edit 029 —
  record the date in the table above instead.
- **Do not regenerate `database.types.ts` until 029 is live.** The `blog_posts`
  block was hand-written to match 029; regenerating against a DB without the
  table would delete it and break `npm run typecheck`.
- **030 is still unapplied.** The unread indicators shipped in PR #50 read
  `conversations.admin_last_read_at` / `provider_last_read_at`, which do not
  exist on live. Needs its own pass.
- `body_markdown` is rendered as plain text by `BlogPostPage` — no markdown
  renderer yet. `cover_image_url` is stored but displayed nowhere.
