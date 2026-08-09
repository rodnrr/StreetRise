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
`23505` on `providers_user_id_key`. `/claim/:id` now checks this **before**
showing the form (`useMyProviderOrg`) and explains it in place; `submitClaim`
still translates a `23505` that slips through into the same message. There is no
way around it without dropping the unique constraint, which would break
`my_provider_id()`.

**4. Identity comes from Supabase, not from the auth store.**
`useAuthStore` is persisted to `localStorage` under `streetrise-auth`, and
nothing in the app reconciles it against the real session — there is no global
`onAuthStateChange` listener. It therefore stays "signed in" indefinitely after
the Supabase session behind it has gone. Gating the claim form on `userId` from
that store is what produced the reported bug: the form rendered as signed in,
the insert went out as `anon`, and Postgres answered

```
new row violates row-level security policy for table "provider_claims"
```

which the page then showed verbatim in a toast. `submitClaim` now resolves the
claimant through `currentIdentity()` (`supabase.auth.getUser()`, which validates
against the auth server) and refuses to write without one, and the page swaps in
the sign-in prompt instead of the form. `ProviderOnboarding` had the identical
defect against `providers_insert_self` and got the same guard.

**Corollary: no write in this flow may surface a driver string.** Everything
`submitClaim` can fail with goes through `claimErrorFor`, which maps `42501` /
`PGRST301` / `401` to "your session expired", `23505` to the one-org rule or a
duplicate claim, `23514` to a malformed contact email, and anything else to a
generic retry message.

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

## Email notifications

Migration 034 and the `notify-claim` edge function. Three events:

| Event | Admin (`info@streetrise.org`) | Claimant |
|---|---|---|
| `submitted` | claim to review, with both emails, the note, and a domain check | receipt + what happens next |
| `approved` | — (they did it) | portal access, link to the dashboard |
| `denied` | — | the reviewer's reason, and that they may claim again |

**Email is best effort and never fails a claim.** A claim written to the
database succeeded whether or not mail went out; reporting a mail failure as a
failed claim would be worse than sending nothing, because the user would retry
something that already worked. Every non-authorization problem returns
`200 { sent: false, reason }` and the client treats it as advisory. The admin
toast says plainly whether the claimant was actually emailed.

The function trusts nothing from the caller. The request carries only a claim
id and an event name; every fact in the email is re-read server-side with the
service-role key, and authorization is checked **per event** — a claimant may
announce their own claim and nothing else, only an admin may announce a
decision. Without that split, any signed-in user could read back another
person's claim contact details by asking for an email about them.

`submitted_notified_at` / `decision_notified_at` make sends idempotent, so a
double-click or retry cannot mail the same person twice.

### contact_email vs claim_email

Two columns, deliberately not merged:

- **`claim_email`** — pinned by RLS to `auth.jwt() ->> 'email'`. The account
  the claim was filed from. Evidence, not a contact detail; the claimant
  cannot choose it, which is what makes it useful.
- **`contact_email`** — required free text the claimant supplies, e.g. filing
  from a personal Gmail but asking to be reached at their work address. All
  notification mail goes here.

Domain matching in the admin UI and in the admin email uses **`claim_email`
only**. Matching on `contact_email` would undo the anti-spoofing guarantee,
since anyone can type anything into it.

### Setup required before this sends anything

The function is deployed and live but has no API key, so it currently returns
`{ sent: false, reason: 'not_configured' }` and logs a warning. All dashboard
steps — no terminal needed:

1. **resend.com** → create an account → **Domains** → add `streetrise.org` and
   add the DNS records it gives you at your registrar. Sending fails until the
   domain shows Verified.
2. **Resend → API Keys** → create one with send permission, copy it.
3. **Supabase dashboard** → project `mldatfcwnmvrmxumzxyb` → **Edge Functions →
   Secrets** → add `RESEND_API_KEY` with that value.

Optional overrides, same Secrets screen — all have working defaults:

| Secret | Default |
|---|---|
| `CLAIM_ADMIN_EMAIL` | `info@streetrise.org` |
| `CLAIM_FROM_EMAIL` | `StreetRise <notifications@streetrise.org>` |
| `APP_URL` | `https://app.streetrise.org` |

`CLAIM_FROM_EMAIL` must be on the domain verified in step 1, or Resend rejects
every send.

Nothing needs redeploying after adding the key — the function reads it at
invocation.

## Not built yet

- **The edge function has not been exercised against a live request.** The
  sandbox it was written in cannot reach `supabase.co` from a browser or shell,
  and has no Deno runtime, so its logic is reviewed and its deployment is
  confirmed ACTIVE, but no real invocation has run. First real claim is the
  first true test — watch **Edge Functions → Logs** in the Supabase dashboard.
- **No in-app claim history for the claimant.** `useMyClaims` exists in
  `src/lib/claims.ts` and is unused; there is no "your claims" screen. The
  portal wait screen now says "Claim under review", which covers the common case.
- **Denial reason is collected via `prompt()`**, matching the existing
  provider-rejection flow on the same page. Fine for the current volume, worth
  a real modal when claims get frequent.
