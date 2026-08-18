# Applying Migration 036 — Student Clothing & School-Support Seed

**Status: APPLIED to live 2026-08-18 (`mldatfcwnmvrmxumzxyb`).**

Every verification query below was run after the apply and returned its
expected value. The public map total went 146 → 166. This document is kept as
the record of what was applied, and as the procedure if the project is ever
rebuilt from migrations.

Migration 036 is the platform's first `clothing` data. The **Students** need
chip and the `/students` page have nothing to show without it — the chip hides
itself (`isUsefulOption`) and `/students` renders its empty state — so the app
code is safe to deploy independently in either order.

Everything here is data-only: **no DDL, no schema change, no RLS change.**
`population_focus` is an unconstrained `TEXT[]`, so the new `students` tag needs
no migration of its own.

---

## What it adds

| | Count |
|---|---|
| Providers | 15 new (`verified`, `user_id` NULL, claimable) |
| Resources | 20 (19 `clothing` + 1 `outreach`) |
| Metros | Tampa Bay (9), Orlando (7), Miami-Dade (4) |

Two resources attach to providers that **already exist** rather than being
duplicated:

- Mattie Williams Neighborhood Family Center — `c41e73f2-…` (`MATTIE-001`).
  Seeded by migration 008, so any DB rebuilt from migrations has it.
- Christian Service Center for Central Florida — `28e81d11-…` (`OB3-CSC-001`).
  **Not created by any migration** — it entered live through
  `scripts/import-seed-candidates.ts`. Section 1b of the migration upserts it
  (see below).

All 20 resources are seeded `verification_status = 'pending'` →
they render the amber **Community Listed** badge, `confidence_score` 35 (the
same value migration 032 used for its public-source South Florida batch).
Nothing here was confirmed by phone. Flip a row to `verified` in
`/admin/resources` only after an actual phone check.

---

## Two things that went wrong on the first apply

Both are fixed in the migration file, so a clean re-run does the right thing.
They are recorded because either could recur in the next seed batch.

**`claim_status` / `source_type` defaults are the wrong ones for seeding.**
The live defaults are `claimed` / `self_registered`, chosen so the provider
*signup* path satisfies the `providers_insert_self` WITH CHECK (see CLAUDE.md).
An INSERT that omits them marks a seeded org as though a real person had
registered and claimed it — false provenance, and a dead end, because a
`claimed` org can never be claimed at `/claim`, so the actual organisation
could never take ownership of its listing. All 122 pre-existing seeded
providers are `unclaimed` / `seeded`; migration 027 exists because this went
wrong once before. **Always set both columns explicitly when seeding.**

**A referenced provider that no migration creates will abort the whole batch
on a fresh database.** `resources.provider_id` is
`NOT NULL REFERENCES providers(id)`. Section 2 reuses two existing providers;
one of them (Christian Service Center, `OB3-CSC-001`) only ever existed on live
because the OB3 import script created it, and no migration replays that import.
On live the apply succeeded and hid the problem — but on CI, staging, a review
app, or a restore-from-migrations, the foreign key would abort section 2 and
**not one of the 20 rows would land**. Section 1b now upserts that provider
first, reproducing live's record verbatim; it is a proven no-op on live
(row digest and provider count both unchanged after running it). Caught by
Codex review on PR #79. Any future migration that references an *import-script*
provider needs the same treatment — migration-seeded ids are safe, imported ids
are not.

**Coordinates and UUIDs must be copied, never retyped.** One provider UUID was
reproduced from memory rather than from the file and landed wrong. It was
caught by diffing every stored field back against the migration file after the
apply, and corrected before anything referenced it. Do that diff every time —
a wrong digit in a description is cosmetic, a wrong digit in a `lat` puts a
family's clothing closet in the wrong neighbourhood.

## How to apply

1. Open the Supabase dashboard → project `mldatfcwnmvrmxumzxyb` → **SQL Editor**.
2. Paste the whole of `supabase/migrations/036_seed_student_clothing_resources.sql`.
3. Run it once.

Re-running is safe. Both `INSERT`s end in `ON CONFLICT (id) DO NOTHING` and
every id is a stable `uuid5`, so a second run is a no-op.

---

## Verify after applying

Run these in the SQL editor. The same queries are in the migration's footer.

```sql
-- 1. Providers landed: expect 15
SELECT count(*) FROM providers WHERE external_id IN (
  'CTK-001','OASISOPP-001','HATB-001','MERCYK-001','ECHOBR-001','FBCPV-001',
  'OCPS-001','BOLF-001','CORNSTN-001','ONEHEART-001','SAMARES-001','LRCORL-001',
  'OYCMIA-001','MDCPSF-001','CFMIA-001');

-- 2. Resources landed: expect 20
SELECT count(*) FROM resources WHERE import_batch_id = 'student_clothing_batch_1';

-- 3. All 20 are publicly visible. If this is < 20 the Students chip
--    and /students will under-report.
SELECT count(*) FROM resources
 WHERE import_batch_id = 'student_clothing_batch_1'
   AND is_active AND verification_status IN ('verified','pending')
   AND is_map_ready AND lat IS NOT NULL AND lng IS NOT NULL;

-- 4. The tag the whole feature hangs on: expect 20
SELECT count(*) FROM resources WHERE population_focus @> ARRAY['students'];

-- 5. Category split: expect clothing 19, outreach 1
SELECT category, count(*) FROM resources
 WHERE import_batch_id = 'student_clothing_batch_1' GROUP BY 1;

-- 6. Referral-only rows: expect exactly 4
--    (OASIS Opportunities, OCPS Kids' Closet, M-DCPS "The Shop", Project UP-START)
SELECT name FROM resources
 WHERE import_batch_id = 'student_clothing_batch_1' AND requires_referral
 ORDER BY name;

-- 7. Rows that publish per-day hours: expect exactly 2
--    (Mattie Williams, ECHO of Brandon). These are the only ones that can
--    ever satisfy "Open right now" — see the note below.
SELECT name FROM resources
 WHERE import_batch_id = 'student_clothing_batch_1'
   AND hours_of_operation ? 'monday';
```

Then check the app:

- `/map` → the **🎒 Students** chip appears with a count of 20.
- `/students` → 20 cards, each with a Community Listed badge; four also show
  "Referral needed".
- `/map?populationFocus=students` → opens with the Students chip active.
- `/map` → the **👕 Clothing** chip appears for the first time (19).

---

## Two judgement calls worth knowing about

**Only 2 of 20 rows publish per-day hours.** That is deliberate, not missing
data. "Open right now" is the one filter that fails *closed* because it makes a
positive claim, and for most of these listings we genuinely do not know: the
source says "verify hours", or the published hours are the org's *office* rather
than its clothing room (Mercy Keepers, Overtown Youth Center), or access is by
referral so "open" is meaningless to a family who has not been referred yet.
Adding hours you have not confirmed would send a parent on a wasted trip. If you
phone an org and confirm real distribution hours, add them in
`/admin/resources` — the row starts appearing under "Open right now" immediately.

ECHO of Brandon runs Mon–Fri 9–1 **and** Tue 5–7 PM. The Tuesday window stores
only `09:00–13:00`, under-claiming per the house rule; the evening session lives
in `summary` and `notes`.

**Four rows are referral-only** (`requires_referral = TRUE`,
`walk_ins_accepted = FALSE`). Their addresses are district or program offices,
not walk-in stores, and each description says so in its first two sentences.
Do not "clean this up" by flipping them to walk-in — a parent who drives to
445 W Amelia St expecting a clothing store will be turned away.

---

## Related

- `docs/student-resources-outreach.md` — the four organisations from the source
  directory that were deliberately **not** seeded as public resources, and the
  ask for each.
- `supabase/migrations/036_seed_student_clothing_resources.sql` — the migration,
  whose header carries the full reasoning.
