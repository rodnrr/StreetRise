# Apply migrations 056–058 — second-chance housing directory

**Status: NOT APPLIED to live.** Written 2026-09-04. Nothing in this set has
been run against project `mldatfcwnmvrmxumzxyb`.

Apply in order, in the Supabase SQL editor, as every other migration in this
repo is applied (see CLAUDE.md → Database Migrations — `supabase_migrations.schema_migrations`
is drifted and is not a reliable record; verify the objects themselves).

| File | What it does | Risk |
|---|---|---|
| `056_housing_directory.sql` | 7 new tables, 7 enums, 2 trigger functions, RLS, 1 view | **None to existing data.** Creates only; touches no existing table. |
| `057_seed_housing_states.sql` | 51 reference rows | None. `ON CONFLICT DO NOTHING`. |
| `058_seed_housing_florida.sql` | FL lookback summary + 5 unpublished orgs | None public — every org is `is_published = false`. |

All three are idempotent and safe to re-run.

> **Rate-limiting gap worth knowing before you link a public form.** The
> per-program ceiling in `housing_reports_guard` only applies to reports that
> carry a `program_id`. A `new_listing` report has none by definition, so those
> are covered by the duplicate-message guard alone and are otherwise unbounded.
> Postgres cannot do better here — every anonymous insert arrives as the same
> `anon` role with no IP and no session. Per-IP limiting has to be a Cloudflare
> rule in front of `/rest/v1/housing_reports`.

They add no columns to `resources`, `providers`, `bookings` or anything else
already live, so there is no interaction with the outstanding 037/045 items.

---

## 1. Apply

Paste each file whole into the SQL editor, in order, and run.

## 2. Verify

```sql
-- 7 tables, RLS on, and none of them RLS-on-with-no-policies.
-- NOTE the escape: in Postgres `_` is a LIKE wildcard and `[_]` is NOT a
-- character class, so 'housing[_]%' matches nothing at all.
SELECT c.relname,
       c.relrowsecurity            AS rls_enabled,
       count(p.polname)            AS policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
 WHERE n.nspname = 'public'
   AND c.relname LIKE 'housing\_%'
   AND c.relkind = 'r'
 GROUP BY c.relname, c.relrowsecurity
 ORDER BY c.relname;
```

Expect exactly these 7 rows, `rls_enabled = t` on every one:

| table | policies |
|---|---|
| `housing_locations` | 2 |
| `housing_organizations` | 2 |
| `housing_programs` | 2 |
| `housing_reports` | 4 |
| `housing_sources` | 2 |
| `housing_states` | 2 |
| `housing_verifications` | 1 |

A `housing_*` table showing `policies = 0` is a full lockout — that is the
`resource_import_staging` failure mode and must be fixed before going further.

```sql
-- The attribution view must be security_invoker, or it bypasses the
-- published gate and leaks unpublished organizations' sources.
SELECT relname, reloptions FROM pg_class WHERE relname = 'housing_source_attribution';
-- expect: {security_invoker=true}

-- 51 states, exactly one summary (Florida)
SELECT count(*) AS total, count(record_lookback_summary) AS with_summary
  FROM housing_states;
-- expect: 51 | 1

-- 5 Florida orgs, all unpublished, no fabricated contact details
SELECT slug, is_published, phone IS NULL AS phone_null, email IS NULL AS email_null
  FROM housing_organizations ORDER BY slug;
-- expect: 5 rows, is_published = f and both nulls = t on every one

-- Nothing publicly visible yet
SELECT count(*) FROM housing_programs WHERE is_published;   -- expect 0
```

### Confirm the gate actually holds

Do not take the policy list on trust — check the behaviour, as `anon`:

```sql
SET ROLE anon;
SELECT (SELECT count(*) FROM housing_states)              AS states,        -- 51 (public reference data)
       (SELECT count(*) FROM housing_organizations)       AS orgs,          -- 0
       (SELECT count(*) FROM housing_programs)            AS programs,      -- 0
       (SELECT count(*) FROM housing_locations)           AS locations,     -- 0
       (SELECT count(*) FROM housing_source_attribution)  AS attribution,   -- 0
       (SELECT count(*) FROM housing_verifications)       AS verifications, -- 0
       (SELECT count(*) FROM housing_reports)             AS reports;       -- 0

-- anon may file a report …
INSERT INTO housing_reports (report_type, message)
VALUES ('wrong_info', 'Phone number is disconnected.');

-- … and must not be able to read it back
SELECT count(*) FROM housing_reports;                       -- expect 0

-- an identical report inside 24h is refused
INSERT INTO housing_reports (report_type, message)
VALUES ('wrong_info', 'Phone number is disconnected.');
-- expect: ERROR duplicate report already received

-- anon must not be able to file a report pre-marked as handled
INSERT INTO housing_reports (report_type, message, status)
VALUES ('scam', 'x', 'actioned');
-- expect: ERROR new row violates row-level security policy

RESET ROLE;
DELETE FROM housing_reports;   -- clean up the test rows
```

**All of the above were run against a local PostgreSQL 16 on 2026-09-04 and
passed**, along with: the two-gate publish check (publishing a program while its
organization stays unpublished keeps it invisible; publishing the org reveals it;
un-publishing the org hides it again), the verification trigger (`confirmed`
advances `last_verified_at`, `unreachable` does not, and a backdated `confirmed`
does not pull the clock backwards), the per-program report ceiling (blocked at
report 21), and a full re-run of all three files for idempotency. What was *not*
tested is Supabase's own `anon`/`authenticated` grants and the real `auth.uid()` /
`is_admin()` — the local run stubbed those, so re-run the `SET ROLE anon` block
above on live.

## 3. After applying

`/housing` will render the state picker with a dash next to all 51 states.
`/housing/fl` will show Florida's lookback summary and an empty-listings state.
That is correct — see below.

---

## Publishing the first Florida listing

Migration 058 deliberately ships **no publishable listings**. The session that
wrote it could reach web *search* but not any individual website — the sandbox
egress proxy allowed GitHub and package registries only — so every candidate
address and phone number available to it came from third-party aggregators
rather than from the organizations themselves.

In a directory for people with records, a stale phone number is a wasted day and
a wrong address is a bus fare somebody did not have. So the five organizations
are recorded with their identity and locality, their provenance is recorded
beside them in `housing_sources`, and **`address_line1`, `postal_code`, `phone`,
`email` and `intake_phone` are all NULL**.

To publish one, from `/admin/housing`:

1. Open the organization.
2. **Call them.** Confirm: the organization still operates; the program name;
   the street address; the intake phone; whether they take felony records, and
   specifically whether they take violent or sexual offence convictions; the
   rent and deposit; the maximum stay; whether sobriety is required; whether
   there is a curfew; and how someone actually gets in (walk-in, referral,
   probation officer).
3. Fill the fields in. **Leave anything they did not answer as "Not stated"** —
   that renders as "call to ask", which is true. Do not fill a gap with a guess.
4. Save the program, then press **"Confirmed by phone"** on it. That writes a
   `housing_verifications` row and advances `last_verified_at` via the trigger.
5. Tick **Published** on both the program and the organization.
6. Run `npm run housing:sitemap` and commit the sitemap change.

If the organization does not answer, or the program has ended, log the call with
the matching outcome rather than nothing — `unreachable` and `closed` are useful
records, and neither advances the freshness clock.

### The two rows that need extra care

- **`abe-brown-ministries` → "Transitional Living Program"** — `max_stay_days`
  is set to 365, derived from "12-month" in secondary reporting. Confirm it or
  clear it.
- **`pinellas-ex-offender-reentry-coalition` → "Transitional housing (program
  name unconfirmed)"** — the name is a placeholder. Replace it with the real one
  or delete the row. Do not publish it as-is.

Also worth confirming before publishing: **Operation New Hope** and
**Project 180** are recorded as reentry nonprofits, not housing providers,
because available reporting describes them as helping people *find* housing
rather than operating it. If that is wrong, change `org_type` and add the
programs. **Dismas Charities** is a single row standing in for multiple Florida
facilities, and most intakes there come through the Bureau of Prisons or a
supervising officer rather than by walk-in — enumerate the facilities and make
the referral route explicit before publishing, so the listing does not imply
self-referral.

---

## Florida's lookback summary needs a legal read

`housing_states.record_lookback_summary` for FL was drafted from:

- FCRA, 15 U.S.C. 1681c(a)(2) and (a)(5) — seven-year reporting limit on arrest
  records, with convictions expressly excluded from that limit;
- Florida CS/HB 1417 (2023), Chapter 2023-140, effective 2023-07-01 — preempts
  regulation of residential tenancies, including screening, to the state.

It was written by an AI session working from those citations and **has not been
reviewed by an attorney**. It deliberately says nothing about HUD's current
enforcement posture, because the 2016 OGC guidance may have been modified by a
2025-09-25 OGC memorandum that the authoring session could not read.

StreetRise already carries an open item about unreviewed legal copy on
`/privacy` and `/terms`. This is the same category and should go the same route
before it stays live indefinitely.
