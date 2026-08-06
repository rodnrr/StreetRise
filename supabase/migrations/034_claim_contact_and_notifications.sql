-- ================================================================
-- StreetRise — Migration 034: Claim contact email + notification tracking
--
-- Follow-on to 033, closing the gaps that blocked shipping the claim
-- flow: nobody was told a claim had happened, and there was no
-- reachable address for the claimant.
--
-- ── contact_email vs claim_email ─────────────────────────────────
-- These are deliberately two different columns and must not be merged.
--
--   claim_email    Pinned by RLS to auth.jwt() ->> 'email'. It is the
--                  account the claim was filed from — evidence, not a
--                  contact detail. A claimant cannot choose it, which
--                  is the whole point: it cannot be used to
--                  impersonate someone at the organization.
--
--   contact_email  Free text the claimant supplies. This is where they
--                  actually want to be reached, e.g. filing from a
--                  personal Gmail but asking to be contacted at their
--                  work address.
--
-- Trusting contact_email as evidence would undo the anti-spoofing
-- guarantee of claim_email. The admin review UI shows both and matches
-- domains against claim_email only.
--
-- ── Notification stamps ──────────────────────────────────────────
-- Email is sent best-effort by the `notify-claim` edge function and
-- must never fail a claim. These columns make sends idempotent, so a
-- retry or a double-click cannot spam the same person twice.
-- ================================================================

ALTER TABLE provider_claims
  ADD COLUMN IF NOT EXISTS contact_email          text,
  ADD COLUMN IF NOT EXISTS submitted_notified_at  timestamptz,
  ADD COLUMN IF NOT EXISTS decision_notified_at   timestamptz;

-- Safe as an unconditional NOT NULL: provider_claims has 0 rows on live
-- (verified 2026-08-06 before applying). The app requires the field, so
-- enforce it at the database too rather than relying on the form.
ALTER TABLE provider_claims
  ALTER COLUMN contact_email SET NOT NULL;

-- Deliberately loose. This rejects obvious junk ("", "not an email") at
-- the database boundary without pretending to validate deliverability —
-- strict address regexes reject valid addresses and give false comfort.
ALTER TABLE provider_claims
  DROP CONSTRAINT IF EXISTS provider_claims_contact_email_shape;
ALTER TABLE provider_claims
  ADD CONSTRAINT provider_claims_contact_email_shape
  CHECK (contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');


-- ================================================================
-- Verification (run after applying)
-- ================================================================
--   -- contact_email is NOT NULL and shape-checked
--   INSERT INTO provider_claims (provider_id, user_id, claim_email, contact_email)
--   VALUES ('<some-provider>', gen_random_uuid(), 'a@b.co', 'nope');
--   -- → violates check constraint "provider_claims_contact_email_shape"
-- ================================================================
