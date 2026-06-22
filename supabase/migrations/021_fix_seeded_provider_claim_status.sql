-- ================================================================
-- StreetRise — Migration 021: Fix seeded provider claim state
-- The three Central Florida providers added in migration 020 were
-- inserted AFTER migration 010, so they silently took the column
-- defaults claim_status='claimed' / source_type='self_registered',
-- and were inserted as verification_status='verified'.
--
-- That state mislabels staff-seeded stubs as self-registered and
-- locks the real organizations out of the in-app claim flow:
-- providers_claim_submit only matches rows where claim_status =
-- 'unclaimed', and its WITH CHECK requires the post-claim row to be
-- verification_status='pending'.
--
-- Re-state them as pending / unclaimed / seeded — the same state the
-- migration 010 backfill applies to every other staff-seeded row
-- (user_id IS NULL). They remain publicly visible on /work via the
-- providers_unclaimed_read policy, and can now be claimed.
-- ================================================================

UPDATE providers
   SET verification_status = 'pending',
       claim_status        = 'unclaimed',
       source_type         = 'seeded'
 WHERE id IN (
   '79889638-4146-4e8d-b077-a9535e4f4cce',  -- Second Harvest Food Bank of Central Florida
   '17923725-b344-4529-9fa0-ccf206914682',  -- Coalition for the Homeless of Central Florida
   '2bef4558-5482-4724-a5e5-a1adbabde185'   -- Habitat for Humanity Greater Orlando & Osceola County
 );
