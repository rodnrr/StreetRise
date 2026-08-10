# The work exchange agent

`scripts/work-exchange-agent.ts` keeps `/work` honest. Requires migration 035
([runbook](./apply-migration-035.md)).

## Why it exists

Every row in `work_exchanges` was either typed in by a provider or transcribed
by hand from an organization's public "get involved / careers" page
(migrations 020, 028 and 032). Nothing ever re-read those pages. A listing whose
program ended last spring still renders on `/work` with a working-looking
"Apply on Website" button — which sends someone who needs work to a dead page.

## What it does

| Mode | What it reads | What it produces |
|---|---|---|
| `--verify` | Each active listing's `source_url` | `last_verified_at` / `last_verify_status` on the listing, plus an `update` or `delist` candidate when the page disagrees with us |
| `--discover` | A verified provider's `website`, and — only if that page advertises nothing — up to 2 same-origin links that look like opportunity pages | `new` candidates for programs the page advertises that we do not list |

## The one rule

**It never publishes.** The only thing it writes to `work_exchanges` is
`last_verified_at` / `last_verify_status` — a record that a check ran. Every
proposed content change becomes a row in `work_exchange_candidates` for a human
to approve at **/admin/work-exchange**.

That is not caution for its own sake. This is a directory people rely on when
they are out of options; machine-drafted text about a real charity does not go
in front of them without someone reading it first.

Two consequences worth knowing:

- A page the agent **could not fetch** is stamped `unreachable` and proposes
  nothing. A site being down is not evidence a program ended.
- A page that **isn't the kind of page that would list the program** — an org
  homepage, a donation appeal, a news post — is stamped `unclear` and proposes
  nothing either. This matters: migration 035 backfills some seeded listings
  with their provider's website because the seed named no specific page, and
  without `unclear` those would all come back as false `delist` proposals.
  `gone` is reserved for a page that does enumerate the org's opportunities
  and does not include this one.
- Approving a `delist` sets `is_active = false`. The row and its history stay,
  so it can be switched back on.

## How it fails

The rule the whole design bends toward: **fail to "we don't know" rather than
to "verified" or "gone".** Four things route there.

| Situation | What happens |
|---|---|
| Page could not be fetched | stamped `unreachable`, proposes nothing |
| Page isn't the kind that lists opportunities (homepage, appeal, news post) | stamped `unclear`, proposes nothing |
| The evidence quote isn't in the page we fetched | finding discarded, listing stamped `unclear` |
| `gone` below 75% confidence | downgraded to `unclear` — no delist proposal |
| The candidate failed to save | **the listing is not stamped**, so the next run checks it again rather than recording a check whose finding was dropped |

Delisting has a higher confidence bar than the other kinds because it is the
destructive direction: a wrong `new` or `update` is caught by the reviewer
reading it, while a wrong `delist` removes a real opportunity from `/work`.

Page content is treated as untrusted input. The system prompt tells the model
that anything inside the fetched page addressed to *it* — "ignore previous
instructions", a demanded verdict, text to include — is evidence the page is
not a normal opportunities page, to be reported rather than obeyed. The
evidence check is the backstop: an injected instruction cannot manufacture a
quote that is absent from the page, and the human approval gate sits behind
both.

## Running it

### From a phone (no terminal)

**GitHub → Actions → Work Exchange Agent → Run workflow.** Choose the mode,
leave *apply* off for a dry run, turn it on when you want candidates queued.

> The workflow only appears in the Actions tab once it is on the default
> branch — GitHub registers `workflow_dispatch` from `main`, not from a PR
> branch. Until PR #63 merges there is nothing to run there.

That workflow needs **two repository secrets** under *Settings → Secrets and
variables → Actions* — on the **Secrets** tab, not the Variables tab:

| Secret | Where it comes from |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** key. Bypasses RLS; never commit it. |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |

`VITE_SUPABASE_URL` is **not** needed. It is the public project URL — already
in the deployed client bundle — so the workflow falls back to it. Set a
`VITE_SUPABASE_URL` repository *variable* only to point the agent at a
different project.

Two placements that look right and fail, both surfaced by the run's first step
rather than by a confusing error inside the agent:

- **The Variables tab instead of the Secrets tab.** Variables are `vars`, not
  `secrets`, and a service-role key should not be in one — variables are
  plaintext and readable in the UI.
- **Environment secrets on `work-exchange-apply` only.** A dry run enters
  `work-exchange-dry-run` and never sees them. Repository secrets cover both.

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — it is a production administrative
credential, and the *apply* toggle is not what protects it. Anyone with write
access to the repository can dispatch the workflow. The real gate is the
`work-exchange-apply` GitHub Environment the apply path runs in: add required
reviewers under *Settings → Environments → work-exchange-apply* and every write
run waits for a human before the secrets reach the job. **Until you add
reviewers there, the environment exists but gates nothing.** Dry runs use a
separate unprotected environment, so looking never needs an approval.

### From a terminal

```bash
npm run agent:work -- --verify                       # dry run, changes nothing
npm run agent:work -- --verify --apply               # queue candidates
npm run agent:work -- --discover --provider <uuid> --apply
npm run agent:work -- --verify --discover --limit 10 --apply
```

Same three values go in `.env.local`. Dry run is the default; `--apply` is the
only thing that writes.

| Flag | Default | Meaning |
|---|---|---|
| `--verify` | — | re-check existing listings |
| `--discover` | — | draft new listings from provider websites (following up to 2 opportunity links only when the landing page advertises nothing) |
| `--apply` | off | write to Supabase |
| `--limit N` | 20 | cap pages fetched per mode |
| `--provider <uuid>` | all | restrict to one organization |
| `--stale-days N` | 30 | only verify listings unchecked for N days |

## Reviewing candidates

**/admin/work-exchange**, or the *Work Exchange* entry in the admin sidebar —
it carries a badge with the pending count.

Each card shows the source URL, the quote the model gave as evidence, and its
note.

**Treat the quote as model-extracted evidence, not proof.** The agent checks
that the quote actually occurs in the page text it fetched, and discards the
finding if it does not — so a quote the page never contained will not reach
you. That is a real check, and it is the limit of what a machine can do here:
it says the words were on the page, not that the model read them correctly, not
that the page is current, and not that the opportunity is what the surrounding
description claims. Open the source URL and satisfy yourself before approving.

For `new` and `update` candidates every field stays editable — the draft is a
starting point, and the words that ship are yours. City and state are required
before approval, because `/work` renders "city, state" under every card.

## Being a good citizen on other people's websites

Small charities run small websites. The agent:

- identifies itself as
  `StreetRiseBot/1.0 (+https://app.streetrise.org/about; info@streetrise.org)`,
  so anyone reading their access log can tell who it is and reach us
- reads `robots.txt` per origin and skips disallowed paths
- waits 2 seconds between requests and times out after 15
- follows at most 2 links per provider, and only from a landing page that
  advertised nothing. They must be same-origin and their path must look like an
  opportunities page (`/volunteer`, `/get-involved`, `/careers`, …), and each
  one goes through the same robots.txt check and delay. Worst case is 3
  requests to an organisation, and the common case is 1 — it is not a crawler,
  it re-reads pages we already point people at
- truncates page text to ~14,000 characters before the model sees it

If an organization asks us to stop, set their listings' `source_url` to null
and they drop out of every run.

## Cost

Claude Opus 5 at `effort: 'low'`, one call per page, ~4–6k input tokens and a
few hundred output tokens each. A full `--verify` pass over the current 29
seeded listings runs to a few cents. Every run prints its token counts and an
approximate cost at list price.

## What it is not

- **It does not cover provider-posted listings.** Verification needs a
  `source_url`, and only seeded listings have one — a provider who types a
  listing into the portal supplies no canonical page, so the agent skips it
  and it can sit unchecked indefinitely. `/work` therefore does *not* offer a
  uniform freshness guarantee today, and nothing in the UI says so. Closing
  this is a product decision, not a code change: either collect a canonical
  opportunity URL in the provider workflow, or surface "never verified" as its
  own freshness state on the listing. Tracked in `docs/OPEN_ITEMS.md`.
- It does not follow links during `--verify` — that mode re-reads exactly the
  listing's `source_url` and nothing else.
- It does not geocode. A `new` candidate inherits `lat`/`lng` from another
  listing at the same organization, or gets none and needs the address filled
  in by hand.
- It does not read JavaScript-rendered pages. A page that returns almost no
  text is reported as unreachable rather than guessed at.
- It does not touch `resources` — only `work_exchanges`. HUD and 211/Open
  Referral ingest into `resources` is a separate, unbuilt piece of work with
  its own hard requirement: confidential domestic-violence shelter addresses
  must never be mapped (`scripts/import-seed-candidates.ts` already handles
  this and any such importer must inherit it).
