# Provider claim flow

How an organization that was seeded from public information takes ownership of
its own StreetRise listing.

**Migration 033 applied to live 2026-08-06** (project `mldatfcwnmvrmxumzxyb`).
The database half — `claim_status` / `source_type` and their RLS — came from
migrations 023–027, see `docs/apply-migrations-023-027.md`.

## Why this exists

122 of the 126 organizations on live were seeded by staff from public sources.
They carry `claim_status = 'unclaimed'` and `user_id IS NULL`. Nobody at those
organizations can correct their own hours, bed counts, or phone number. This
flow is how they get in.

## The path

```
/provider/onboarding ──► /claim ──► /claim/:id ──► /login?next=/claim/:id
   (pitch page)          (directory)  (org detail)    (sign up / sign in)
                                          │                    │
                                          ◄────────────────────┘
                                          │
                                          ▼
                              provider_claims INSERT   (evidence)
                              providers UPDATE          (unclaimed → pending_claim)
                                          │
                                          ▼
                    /admin/providers → "claims" filter → Approve / Deny
```

On approval the org becomes `claimed` + `verified` and the claimant gets portal
access. On denial it returns to `unclaimed`, the account is detached, and the
org reappears in the public `/claim` directory.

## Files

| File | Role |
|---|---|
| `supabase/migrations/033_provider_claims.sql` | `provider_claims` table + RLS, `providers_pending_claim_read` |
| `src/lib/claims.ts` | queries, `submitClaim`, `ClaimError` |
| `src/pages/claim/ClaimIndexPage.tsx` | `/claim` — searchable directory |
| `src/pages/claim/ClaimDetailPage.tsx` | `/claim/:id` — org summary + claim form |
| `src/pages/admin/AdminProviders.tsx` | "claims" filter, evidence panel, approve/deny |
| `src/lib/adminCounts.ts` | `claimsPending`, badged on the Providers nav link |

## Three constraints the code is shaped around

**1. The claim UPDATE may only touch two columns.**
`providers_claim_submit` (migration 025) requires the post-update row to be
`user_id = auth.uid()`, `claim_status = 'pending_claim'`, `role = 'provider'`,
`verification_status = 'pending'`, with every other column byte-identical to
the seeded values. `submitClaim` therefore sends exactly those four fields.
Adding anything else to that update — even writing a column its existing value
— risks failing the policy. That is why the org summary on `/claim/:id` is
read-only: corrections happen from the portal after approval.

**2. Evidence cannot live on the `providers` row.**
Because of (1) there is nowhere to record who is claiming or why, which would
make admin approval blind — and approving a claim hands over control of a real
organization's listings. So `provider_claims` holds `claim_email` and
`claim_note` under admin-only RLS. `claim_email` is pinned by the policy to
`auth.jwt() ->> 'email'`, so a claimant cannot submit under another address.
This is the same split as `conversation_admin_notes` (migration 018).

**3. One account, one organization.**
`providers.user_id` is `UNIQUE`. An account that already owns an org — whether
self-registered or previously claimed — cannot claim another; Postgres raises
`23505` on `providers_user_id_key`. `submitClaim` translates that into a
readable message telling the user to register a separate account. There is no
way around it without dropping the unique constraint, which would break
`my_provider_id()`.

## Write ordering, and why it is that way round

`submitClaim` inserts the evidence row **first**, then updates the provider.

That order is deliberate. If the update fails, the claim row is deleted and the
org is left exactly as it was. Doing it the other way round would strand an org
in `pending_claim` with no evidence and no way back: once `claim_status` leaves
`'unclaimed'`, `providers_claim_submit` no longer matches the row and
`providers_update_self` refuses to change `claim_status`, so the claimant
cannot undo it and only an admin could clean it up.

The update also carries a redundant-looking `.eq('claim_status', 'unclaimed')`
guard. RLS already enforces it, but a policy mismatch returns *no error and
zero rows* rather than failing — the explicit guard plus a `count` check is
what turns a lost race into the "someone claimed this first" message.

## Admin review

`/admin/providers` → **claims** filter. Each card shows the claimant's email,
their note, and a badge saying whether the email domain matches the org's
contact email or website — a quick signal, not a decision. A missing evidence
row is called out explicitly rather than rendering an empty panel.

Denying detaches the account and releases the org. `verification_status` is
deliberately left alone on denial: whether the org itself is trustworthy is a
separate question from whether this person works there.

## Tested

RLS was rehearsed on a local Postgres 16 carrying the live `providers` schema
and policy set before anything touched production:

| Case | Result |
|---|---|
| claimant files a claim with their own email | pass |
| claimant submits under someone else's email | **blocked** |
| claimant files on behalf of another user | **blocked** |
| duplicate open claim for the same org | **blocked** (unique index) |
| anon reads claim evidence | **0 rows** |
| claimant reads own claim / admin reads all | pass |
| claim UPDATE moves org to `pending_claim` | pass |
| anon still sees the org mid-claim | visible (033 fix) |
| account that already owns an org claims a second | **blocked** (23505) |
| claimant withdraws own pending claim | pass |
| admin approves | pass |

The UI was smoke-tested in Chromium against intercepted API responses (the
sandbox's egress policy blocks the Supabase host from the browser): directory
lists only unclaimed orgs, search filters by name and website, signed-out state
hides the form and preserves `?next=`, and an org already in `pending_claim`
cannot be re-claimed. No console errors.

## Not built yet

- **No email notifications.** Nothing tells a claimant their claim was approved
  or denied — the UI promises an email, so this needs wiring before launch, or
  the copy needs softening.
- **No entry point from `/resources/:id`.** Someone from an organization is
  most likely to arrive at their own listing, not at `/provider/onboarding`.
  A "Do you work here? Claim this listing" link on the resource detail page is
  the highest-value next addition.
- **No claim status surface for the claimant.** After submitting they land on
  the portal's pending screen, which is the generic provider-application copy
  rather than claim-specific.
- **Denials are silent and un-annotated.** `decision_note` exists on the table
  but the admin UI does not collect one.
