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
| `--discover` | A verified provider's `website` | `new` candidates for programs the page advertises that we do not list |

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

## Running it

### From a phone (no terminal)

**GitHub → Actions → Work Exchange Agent → Run workflow.** Choose the mode,
leave *apply* off for a dry run, turn it on when you want candidates queued.

That workflow needs three repository secrets under
*Settings → Secrets and variables → Actions*:

| Secret | Where it comes from |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, **service_role** key — bypasses RLS, never commit it |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |

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
| `--discover` | — | draft new listings from provider websites |
| `--apply` | off | write to Supabase |
| `--limit N` | 20 | cap pages fetched per mode |
| `--provider <uuid>` | all | restrict to one organization |
| `--stale-days N` | 30 | only verify listings unchecked for N days |

## Reviewing candidates

**/admin/work-exchange**, or the *Work Exchange* entry in the admin sidebar —
it carries a badge with the pending count.

Each card shows the source URL, a **verbatim quote** from the page, and the
agent's note. Check the quote against the page before approving: it is the only
thing standing between a fabricated listing and `/work`. If the quote is not on
the page, reject it and the model got it wrong.

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
- fetches one page per listing or provider, and follows no links — it is not a
  crawler, it re-reads pages we already point people at
- truncates page text to ~14,000 characters before the model sees it

If an organization asks us to stop, set their listings' `source_url` to null
and they drop out of every run.

## Cost

Claude Opus 5 at `effort: 'low'`, one call per page, ~4–6k input tokens and a
few hundred output tokens each. A full `--verify` pass over the current 29
seeded listings runs to a few cents. Every run prints its token counts and an
approximate cost at list price.

## What it is not

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
