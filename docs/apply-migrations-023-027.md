# Migrations 023–027 — Provider claim flow (`claim_status` / `source_type`)

**Status: APPLIED to live 2026-08-06** (project `mldatfcwnmvrmxumzxyb`).

These had never been applied — the columns existed only in the repo
migrations and, misleadingly, in the hand-written
`src/lib/database.types.ts`. The types now match live.

| Repo file | Live status |
|---|---|
| `023_provider_claim_status.sql` | applied as `provider_claim_status` |
| `024_tighten_claim_submit_rls.sql` | **superseded — not applied separately** |
| `025_clarify_claim_submit_rls.sql` | applied as `clarify_claim_submit_rls` |
| `026_lock_claim_status_self_update.sql` | applied as `lock_claim_status_self_update` |
| `027_fix_seeded_provider_claim_status.sql` | applied as `fix_seeded_provider_claim_status` |

024 and 025 both rewrite the same `providers_claim_submit` policy; 025 is
024 with the nine correlated subqueries collapsed into one aliased
`EXISTS`. Applying 024 then 025 would leave exactly 025's policy, so only
025's final state was applied. The end state is identical.

> Applied with the Supabase MCP `apply_migration` tool, so unlike most of
> this repo's history these four **are** recorded in
> `supabase_migrations.schema_migrations` (versions `20260806204020`–
> `20260806204102`). Repo filenames and live version strings still do not
> line up — treat live as the source of truth, as always.

## Live state after apply

| claim_status | source_type | verification_status | rows |
|---|---|---|---|
| `unclaimed` | `seeded` | `verified` | 119 |
| `claimed` | `self_registered` | `verified` | 4 |
| `unclaimed` | `seeded` | `pending` | 3 |

The 4 `claimed` rows are the real user accounts. Everything else is
staff-seeded and now claimable.

## No public visibility changed

Verified as the `anon` role after applying: 126 providers readable,
146 map resources, 29 work exchanges, 34 South Florida resources —
all identical to before.

That holds because 023 adds `providers_unclaimed_read`
(`USING claim_status = 'unclaimed'`), which covers seeded rows
independently of `providers_public_read` (`verification_status =
'verified'`). The three rows 027 downgraded to `pending` stay public
through the unclaimed policy.

## What was tested before applying

The whole thing was rehearsed on a local Postgres 16 instance carrying a
faithful copy of the live `providers` schema, the six live policies, and
`is_admin()` / `my_provider_id()`. These policies query `providers` from
inside a `providers` policy, which can raise
`infinite recursion detected in policy for relation` — it does not here,
but that was worth proving rather than assuming.

| # | Case | Result |
|---|---|---|
| 1–2 | anon reads unclaimed stub / verified providers | pass |
| 3–4 | authenticated user claims a seeded stub | pass |
| 5 | claimant self-approves `claim_status='claimed'` | **blocked** |
| 6 | claimant self-verifies | **blocked** |
| 7 | claimant escalates to `role='admin'` | **blocked** |
| 8 | row state unchanged after 5–7 | pass |
| 9 | claimant rewrites `organization_name` mid-claim | **blocked** |
| 10 | claimant flips `source_type` mid-claim | **blocked** |
| 11 | honest claim on the same row | pass |
| 12 | normal provider edits own `bio` | pass |
| 13 | admin approves a claim | pass |
| 14 | new signup INSERT with claim columns | pass |
| 15 | rogue INSERT posing as `seeded` | **blocked** |
| 16 | onboarding INSERT **omitting** claim columns | pass |
| 17 | anon reads `pending` + `unclaimed` (the 027 state) | visible |
| 18 | anon reads `pending` + `pending_claim` | hidden |

Test 16 is the regression that mattered: 023 tightens
`providers_insert_self` to require `claim_status='claimed'` and
`source_type='self_registered'`, but `ProviderOnboarding.tsx` does not set
either column. Column defaults supply both before `WITH CHECK` runs, so
onboarding is unaffected. **If those defaults are ever dropped, provider
signup breaks.**

## Two things to know

**1. There is no claim UI.** Nothing in `src/` references `claim_status`,
`source_type`, `unclaimed`, or `pending_claim` outside
`database.types.ts`, and there is no `/claim` route. The database is
ready; the feature is not user-facing. Someone still has to build the
"claim your organization" directory and an admin approval action.

**2. Test 18 is a real gap in that future UI.** The moment a user submits
a claim, the row goes `unclaimed → pending_claim` and stops matching
`providers_unclaimed_read`. With `verification_status='pending'` it also
misses `providers_public_read`, so the org **disappears from `/work` and
from public provider reads until an admin approves it**. Whoever builds
the claim UI needs to either warn the claimant or add a policy covering
`pending_claim`.

## On migration 027

By the time 027 ran, 023's backfill (`WHERE user_id IS NULL`) had already
set those three Central Florida providers to `unclaimed` / `seeded`. The
only thing 027 still changed was `verification_status → 'pending'`.

Its header argues this restores "the same state the backfill applies to
every other staff-seeded row" — that is not accurate in this ordering.
023's backfill never touches `verification_status`, so the other 119
seeded rows stayed `verified`. 027 makes these three the only `pending`
seeded providers.

No public impact (they stay visible via the unclaimed policy), but it is
an inconsistency. To undo just that part:

```sql
UPDATE providers SET verification_status = 'verified'
 WHERE id IN ('79889638-4146-4e8d-b077-a9535e4f4cce',
              '17923725-b344-4529-9fa0-ccf206914682',
              '2bef4558-5482-4724-a5e5-a1adbabde185');
```

## Rolling the whole thing back

```sql
DROP POLICY IF EXISTS providers_claim_submit  ON providers;
DROP POLICY IF EXISTS providers_unclaimed_read ON providers;

DROP POLICY IF EXISTS providers_update_self ON providers;
CREATE POLICY providers_update_self ON providers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    role = (SELECT role FROM providers WHERE user_id = auth.uid())
    AND verification_status = (SELECT verification_status FROM providers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS providers_insert_self ON providers;
CREATE POLICY providers_insert_self ON providers FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role = 'provider'
              AND verification_status = 'pending');

ALTER TABLE providers DROP COLUMN claim_status, DROP COLUMN source_type;
DROP TYPE provider_claim_status;
DROP TYPE provider_source_type;
```

Dropping the columns would put `database.types.ts` back out of sync with
live — remove the `claim_status` / `source_type` entries and both enum
blocks if you do this.
