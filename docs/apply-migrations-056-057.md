# Apply migrations 056–057 — housing as a resource category

**Status: NOT APPLIED to live.** Written 2026-09-04. Nothing here has been run
against project `mldatfcwnmvrmxumzxyb`.

> ⚠️ **Numbering collision with PR #107.** That superseded branch also has files
> numbered 056–058, for the abandoned standalone-directory design. They are
> different files. Apply only the ones on this branch, and close #107 rather
> than merging it.

| File | Contents | Risk |
|---|---|---|
| `056_housing_category.sql` | `ALTER TYPE resource_category ADD VALUE 'housing'` | Additive. **Must run alone** — the new label cannot be used until it commits. |
| `057_housing_details_reports_evidence.sql` | resource_type CHECK widening; `resource_housing_details`; `resource_evidence`; `resource_reports`; RLS on all three | Additive. Creates only, plus one CHECK widening, which cannot reject an existing row. |

Both are idempotent. No column is dropped, no existing policy replaced, no
backfill — so neither stamps `updated_at`, the hazard migrations 037 and 038
have to guard against.

## Order matters

Run **056 first, on its own, and let it commit** before running 057. Postgres
allows `ALTER TYPE ... ADD VALUE` inside a transaction but forbids *using* the
new value in that same transaction. Pasting both files into one SQL editor run
will fail.

## Deploy order does NOT matter

The app tolerates running before these migrations. `fetchMapResources`,
`fetchCategoryResources` and the resource detail page each attempt the housing
embed, detect the "relation does not exist" error, and retry without it — see
`isMissingHousingRelation()` in `src/lib/housing.ts`. Housing details simply do
not render until 057 is applied; **the map does not break.** That fallback
exists specifically because merging to `main` deploys while migrations are
applied by hand, so the two are never simultaneous.

## Verify

```sql
-- 1. The category value exists
SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
 WHERE t.typname = 'resource_category' AND e.enumlabel = 'housing';

-- 2. The three tables, RLS on, each with at least one policy.
--    NOTE the escape: `_` is a LIKE wildcard in Postgres and `[_]` is NOT a
--    character class, so 'resource[_]%' would match nothing.
SELECT c.relname, c.relrowsecurity AS rls, count(p.polname) AS policies
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
 WHERE n.nspname = 'public' AND c.relkind = 'r'
   AND c.relname IN ('resource_housing_details','resource_evidence','resource_reports')
 GROUP BY 1,2 ORDER BY 1;
```

Expect `resource_evidence` 1 policy, `resource_housing_details` 3,
`resource_reports` 4 — and `rls = t` on all three. A row with `policies = 0` is
a full lockout, the `resource_import_staging` failure mode.

```sql
-- 3. The tri-state columns must have NO default. A DEFAULT FALSE here would
--    silently publish every unasked question as a confirmed "no".
SELECT column_name, column_default
  FROM information_schema.columns
 WHERE table_name = 'resource_housing_details'
   AND column_name IN ('accepts_felony','accepts_violent_offense','accepts_sex_offense',
                       'accepts_vouchers','requires_sobriety','has_curfew');
-- expect: column_default NULL on all six
```

```sql
-- 4. Behaviour, as anon
SET ROLE anon;
SELECT count(*) FROM resource_evidence;   -- expect 0 (admin-only)
SELECT count(*) FROM resource_reports;    -- expect 0 (write-only for the public)

INSERT INTO resource_reports (report_type, message)
VALUES ('wrong_info','apply-check');      -- expect success

SELECT count(*) FROM resource_reports;    -- expect 0 — cannot read it back

INSERT INTO resource_reports (report_type, message, status)
VALUES ('scam','x','actioned');           -- expect: violates row-level security
RESET ROLE;
DELETE FROM resource_reports WHERE message = 'apply-check';
```

**All of the above passed against a local PostgreSQL 16 on 2026-09-04**, on a
base built from the repo's own migrations 001–011, together with: the housing
category and all eight new resource types accepted; voucher assistance and
voucher acceptance queryable independently; unknown eligibility failing an
affirmative filter; the cost-range CHECK; `created_at` clamped from year 3000 to
server time; **40 genuinely parallel report inserts yielding exactly 20 rows**
(the advisory lock holding under real concurrency); housing details disappearing
from the public view when their parent listing is deactivated; and both files
re-running clean.

Not covered locally: Supabase's real `anon`/`authenticated` grants and real
`auth.uid()`/`is_admin()` were stubbed, so re-run step 4 on live after applying.

## After applying

There is **no housing data to seed and none is included**. Housing listings
enter through the normal provider or admin resource flow: create a resource with
`category = 'housing'`, pick a housing `resource_type`, then fill the Housing
details section that appears on the same edit page.

Until a listing exists, `/housing` shows its shortcuts and guidance and the
searches return nothing — which is correct. Do not seed candidate rows to make
the page look populated.
