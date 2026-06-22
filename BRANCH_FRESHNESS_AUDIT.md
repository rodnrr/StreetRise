# Branch Freshness Audit — Runbook

A repeatable procedure for cleaning up the **many per-session AI branches**
(`claude/*`, `codex/*`, etc.) that accumulate in this repo. Sessions often
re-do similar work on fresh branches, so most older branches are stale
duplicates whose useful changes already landed on `main` by a different route.

**Goal:** for every branch that is *ahead* of `main`, decide — merge it,
salvage specific commits, or delete it as stale/duplicate — **without**
losing unmerged work and **without** breaking production or the live DB.

> Paste the "Self-prompt" at the bottom into a fresh session to run this.

---

## Repo facts you must respect

- **Merging to `main` = production deploy.** GitHub Actions
  (`.github/workflows/deploy.yml`) builds and deploys to Cloudflare Pages on
  every push to `main`. Never merge a branch whose CI is not green.
- **DB migrations are applied to live BY HAND** (Supabase SQL editor), not by
  the deploy and not by `supabase db push`. The repo's `supabase/migrations/`
  use non-standard names (no timestamp prefixes), so the repo list and the
  live migration history **drift**. Treat live as a separate source of truth.
  - Live project: `mldatfcwnmvrmxumzxyb`.
  - Compare with `mcp__Supabase__list_migrations` **and** verify actual
    columns/data with `mcp__Supabase__execute_sql` (read-only `SELECT`s).
- **A branch ahead of `main` may carry a unique migration** that adds columns
  the branch's code depends on. Merging the code without applying the
  migration to live can break production. Always cross-check migrations.
- **Never delete an unmerged branch** until its unique commits are confirmed
  to be either already represented in `main` or genuinely unwanted — and when
  in doubt, ask the user.
- **Never write to the live DB** (INSERT/UPDATE/DDL) without explicit
  go-ahead. Reads are fine.

---

## Step 1 — Inventory every branch

```bash
git fetch --all --prune
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v 'origin/HEAD'); do
  [ "$b" = "origin/main" ] && continue
  counts=$(git rev-list --left-right --count origin/main...$b)
  behind=$(echo "$counts" | cut -f1); ahead=$(echo "$counts" | cut -f2)
  date=$(git log -1 --format='%ci' $b | cut -d' ' -f1)
  merged=$(git branch -r --merged origin/main | grep -qx "  $b" && echo MERGED || echo unmerged)
  printf '%-58s a:%-3s b:%-4s %s %-8s %s\n' "$b" "$ahead" "$behind" "$date" "$merged" "$(git log -1 --format='%s' $b | cut -c1-48)"
done
```

Read the columns as:
- **`a:` (ahead)** — commits on the branch **not** on `main`. `a:0` ⇒ nothing
  to lose.
- **`b:` (behind)** — how far behind `main` it is (staleness signal only).
- **MERGED** — every commit is reachable from `main`.

---

## Step 2 — Classify

### A. `a:0` (ahead = 0) → **safe to delete**
Fully contained in `main`. No review needed. Delete (Step 4).
*(MERGED and `a:0` are equivalent here.)*

### B. Ahead > 0 → **review before doing anything**
For each, find out whether the unique work is actually novel or already
re-implemented on `main` by a later session:

```bash
git log --oneline origin/main..<branch>          # unique commits
git diff --stat origin/main...<branch>           # net difference vs merge-base
git diff origin/main...<branch> -- supabase/migrations/   # any unique migrations?
```

Decide:
- **Already in `main` (re-done elsewhere)** → the net diff is empty or only
  cosmetic/conflicting noise → **stale duplicate, delete.**
- **Has real, wanted, novel changes** → open/refresh a PR to `main`
  (`base=main`), confirm CI is green, and merge. If it touches
  `supabase/migrations/`, see Step 3 before merging.
- **Has a little salvageable work mixed with stale work** → cherry-pick the
  good commit onto a fresh branch off `main`; delete the original.
- **Ambiguous / architecturally significant** → **ask the user**, don't guess.

### C. Duplicate "families" (same name + random suffix)
Branches like `codex/add-sticky-get-help-now-button{,-oy5r2l,-tzg8m5,-wkl29m}`
are retries of one task. Usually the un-suffixed or one variant merged and the
rest are abandoned. Keep at most the one with unique wanted work; delete the rest.

---

## Step 3 — Migration & Supabase cross-check (only for branches you may merge)

1. List the branch's migration files vs `main`'s:
   ```bash
   git diff --name-status origin/main...<branch> -- supabase/migrations/
   ```
2. For any **added** migration, check whether the live DB already has its
   effect (column exists? rows present?) via `execute_sql` against
   `mldatfcwnmvrmxumzxyb`. Example:
   ```sql
   SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='providers' AND column_name='<col>');
   ```
3. Watch for **duplicate migration numbers** (two `0NN_*.sql`). Renumber the
   **unapplied** one to the next free number; never edit a migration already
   applied to live (add a new file instead).
4. If merging code that references a not-yet-applied column, either apply the
   migration to live first (with go-ahead) or confirm the reference is
   type-only (e.g. `database.types.ts`) and never queried at runtime.

---

## Step 4 — Delete stale branches (safe, reversible for ~90 days)

Deleting a remote branch does **not** touch `main` or any merged history, and
the commits remain recoverable via reflog/`git fsck` for a while.

```bash
# One at a time (recommended):
git push origin --delete <branch>

# Bulk-delete every fully-merged branch (a:0), excluding protected ones:
for b in $(git branch -r --merged origin/main | sed 's# *origin/##' \
            | grep -vE '^(main|HEAD)$'); do
  echo "deleting $b"; git push origin --delete "$b"
done
```

**Protect:** `main`, any release branch, and any branch the user is actively
using. Confirm the list before bulk-deleting.

---

## Step 5 — Report

Produce a short table: branch → decision (deleted / merged / kept-for-review)
→ reason. Flag anything that needed a judgment call or a live-DB write.

---

## Appendix — Snapshot (2026-06-22, regenerate with Step 1)

**Merged / `a:0` — safe to delete (23):**
`chore/provider-candidate-type-alias`,
`claude/affectionate-archimedes-uxkhd3`, `claude/clever-bohr-kfzXs`,
`claude/deprecated-npm-deps-yoTfn`, `claude/focused-albattani-oTUl1`,
`claude/intelligent-sagan-kxF0T`, `claude/launch-fixes-sitemap-work-cta`,
`claude/nav-and-emergency-url-fixes`, `claude/seo-sitemap-msebei`,
`claude/street-rise-homepage-updates-uih7j9`, `claude/supabase-check-hhvnwr`,
`claude/trusting-cori-QUyZ3`, `claude/work-exchange-resources-drmwec`,
`codex/add-controlled-vocab-reference`, `codex/add-sticky-get-help-now-button`,
`codex/add-vite-env.d.ts-and-extend-importmetaenv`, `codex/create-mobile-app`,
`codex/create-mobile-app-0wpllr`, `codex/find-issues-in-the-codebase`,
`codex/fix-deployment-failure-due-to-missing-api-token`,
`codex/fix-map-listing-and-button-issues-6159aj`,
`codex/scaffold-full-repo-structure-and-files`,
`codex/update-svg-assets-in-vitepwa-manifest`, `test-create-file-behavior`.

**Unmerged, ahead > 0 — review per Step 2/3:**

| Branch | ahead | last commit | likely status |
|---|---|---|---|
| `claude/gracious-bell-cyhlyx` | 1 | 06-22 | footer-email commit; **same change already on `main`** → duplicate |
| `claude/admin-chat-manual-resources-mkjvtx` | 4 | 06-18 | admin chat already on `main` → likely superseded |
| `claude/resource-filter-verification-wmq88p` | 3 | 06-18 | verify net diff vs `main` |
| `claude/resource-tab-multi-location-y8le4d` | 4 | 06-13 | verify net diff vs `main` |
| `codex/find-issues-in-the-codebase-tl5l5v` | 2 | 06-15 | likely stale |
| `claude/youthful-lamport-Ommqz` | 1 | 05-25 | likely stale |
| `claude/provider-signup-admin-visibility-4qY3c` | 6 | 05-25 | trust system — check if landed via migration 010 |
| `claude/add-providers-resources-Kvpcv` | 3 | 05-16 | old, likely stale |
| `claude/upgrade-map-experience-qFq00` | 3 | 05-13 | old seed migration 007 — check |
| `claude/add-claude-documentation-Q2gU4` | 9 | 05-12 | old, likely stale |
| `claude/export-supabase-data-lYXtg` | 3 | 05-07 | old, likely stale |
| `codex/fix-map-listing-and-button-issues` | 2 | 05-20 | `-6159aj` variant merged → likely stale |
| `codex/fix-routing-issue-for-projects` | 2 | 05-06 | old, likely stale |
| `codex/fix-codex-review-issues-for-pr-#11` | 1 | 05-06 | old, likely stale |
| `codex/add-sticky-get-help-now-button-{oy5r2l,tzg8m5,wkl29m}` | 2 | 04-10 | retries of merged sticky-button → stale |
| `codex/set-resource-to-not-active-and-update-phone-number` | 1 | 04-07 | old, likely stale |
| `feature/public-pending-resources` | 1 | 04-05 | superseded by migration 004 on `main` → stale |
| `rodnrr-patch-1` | 1 | 04-10 | old workflow tweak — check |

> None of the "unmerged" branches has been confirmed deletable yet — each
> needs the Step 2 net-diff check first. The footer/`gracious-bell` and the
> `-button` retries are the highest-confidence deletes.

---

## Self-prompt (paste into a fresh session)

> Run the Branch Freshness Audit in `BRANCH_FRESHNESS_AUDIT.md`. Fetch all
> branches, classify by ahead/behind/merged, and for each branch ahead of
> `main` check whether its unique commits are already represented in `main`
> (net diff) or carry novel wanted work. Cross-check any unique migrations
> against the live Supabase DB (`mldatfcwnmvrmxumzxyb`, read-only). Then give
> me a table of recommended actions (delete / merge / salvage / ask) with
> reasons. **Do not delete any branch, merge anything, or write to the live
> DB until I approve the plan.**
