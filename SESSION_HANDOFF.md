# Session Handoff — Work Exchange & Central Florida Seed

**Branch:** `claude/work-exchange-resources-drmwec`
**Last updated:** 2026-06-22 (end of session)
**Working tree:** clean — everything committed & pushed.

---

## 1. Snapshot — what was done

| Item | State |
|---|---|
| `020_seed_work_exchanges.sql` — 14 Work Exchange listings (Tampa→Orlando) + 3 Orlando providers + Talbot House link fix | committed, pushed, **applied to live** |
| `021_fix_seeded_provider_claim_status.sql` — re-state 3 Orlando providers as pending/unclaimed/seeded | committed, pushed, **NOT applied to live** (see drift note) |
| `022_seed_central_florida_map_resources.sql` — 3 Orlando map resources (Community Listed) | committed, pushed, **applied to live by hand via SQL editor** (not in Supabase migration history) |
| `src/pages/WorkExchangePage.tsx` — "All opportunities" toggle (default) + "Near me" | committed, pushed, **ships on deploy** |

Commits (newest first): `5eab330` (022) · `586fd7e` (021) · `6f6f5e7` (toggle) · `e32153c` (020 corridor) · `7946a24` (020 initial).

---

## 2. Needs to be PUSHED
- **Nothing.** Tree is clean; all 5 commits are on `origin/claude/work-exchange-resources-drmwec`.

## 3. Needs to be MERGED
- **`claude/work-exchange-resources-drmwec` → `main`** — required to deploy the `/work` "All opportunities" toggle (CI builds on push to `main`). Until merged + deployed, the corridor listings only show within ~35 mi of the map center on the live site.
- Decision needed: merge now, or keep iterating on the branch.

## 4. Needs to be DELETED / cleaned
- **Nothing outstanding.** The throwaway `.claude/settings.local.json` (an ineffective MCP-allowlist attempt) is gone / ignored — confirm it does not reappear.
- **Do NOT hand-apply migration 021 to live** (it errors: prod has no `claim_status` column). Keep it in the repo; it runs cleanly only as part of a full ordered migration push (after 010).
- Optional: reconsider whether **Habitat** belongs on the *map* (it's affordable-homeownership, not an emergency resource). Leaving it as `pending`/Community Listed for now.

---

## 5. Live DB vs repo — IMPORTANT drift
- **Production is behind the repo migrations.** `010_provider_claim_status` is **not applied** to prod → no `claim_status` / `source_type` columns, no `providers_unclaimed_read` policy, no claim flow.
- Consequences on live:
  - The 3 Orlando providers are `verification_status = 'verified'` (correct for live: prod only public-reads verified providers, which is what makes `/work` show org name + "Apply").
  - The 3 Orlando **resources** are `pending` → render the amber **"Community Listed"** badge on the map. Verify each in **AdminResources** after a phone check → green **"Staff Verified."**
- `022` was applied via the SQL editor, so it is **not recorded in Supabase migration history**. A future `supabase db push` will try to apply 010→022 in order; all are idempotent (`ON CONFLICT DO NOTHING`, idempotent UPDATE), so re-running is safe. When 010 runs first, `021` will then apply correctly.
- **Self-claim flow** ("provider signs up → claims → admin approves") is NOT usable on live: depends on the un-applied claim system AND a portal claim UI that does not exist yet. Future feature.

---

## 6. Tomorrow's self-prompt (paste into a fresh session)

> I'm continuing work on the StreetRise repo, branch
> `claude/work-exchange-resources-drmwec`. Read `SESSION_HANDOFF.md` at the
> repo root first — it has full context. Do a clean run + audit before any
> new changes:
>
> 1. **Git:** confirm the branch is clean, list commits ahead of `main`, and
>    report whether it's been merged/deployed.
> 2. **Build health:** run `npm install` (fresh container), then
>    `npm run typecheck` and `npm run lint` — both must be clean.
> 3. **Live DB audit** (Supabase project `mldatfcwnmvrmxumzxyb`, needs MCP
>    `execute_sql` approval or the SQL editor): verify
>    - `work_exchanges`: 14 active rows across Tampa/St. Pete/Lakeland/Orlando.
>    - the 3 Orlando providers exist and their current `verification_status`.
>    - the 3 Orlando `resources` exist, are `pending`, `is_map_ready=true`,
>      with valid lat/lng.
>    - whether `claim_status` column exists yet (i.e., has migration 010 been
>      applied?). This decides if migration `021` is relevant.
> 4. **Migration drift:** list applied migrations vs the repo's
>    `supabase/migrations/` and report the gap (esp. 010, 021). Recommend a
>    reconciliation plan — do NOT apply anything without explicit approval.
> 5. **Report**, then ask what to tackle: merge/deploy the branch, fill the
>    empty Work Exchange types (skills_trade / more internships), add
>    Tampa/Lakeland map resources, or scope the self-claim feature.
>
> Constraints (from CLAUDE.md): honest copy over hype; never "certified/
> guaranteed/always up-to-date"; pending = "Community Listed", verified =
> "Staff Verified"; don't overengineer; never edit applied migrations (add a
> new numbered file). Do not write to the live DB or push/merge without
> explicit go-ahead.

---

## 7. Open decisions for the morning
- [ ] Merge `claude/work-exchange-resources-drmwec` → `main` and deploy (ships `/work` toggle)?
- [ ] Reconcile migration drift: apply `010`→`022` via `supabase db push`, or treat prod as source of truth and not deploy the claim system?
- [ ] Verify the 3 Orlando resources in AdminResources after phone checks.
- [ ] Fill empty Work Exchange filters (skills_trade has none; internship only Talbot House).
- [ ] Decide whether to seed Tampa/Lakeland orgs as map resources too.
- [ ] Scope the self-claim flow as a separate task (if wanted).
