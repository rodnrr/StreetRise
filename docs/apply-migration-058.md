# Applying migration 058 — transportation request details

**Status: NOT APPLIED to live.**

Verified before authoring this runbook: live has no `booking_transportation_details` table and no `submit_transportation_request(...)` function. The existing `bookings` table already has the contact/consent/notes fields this feature reuses.

Do not infer migration state from `schema_migrations`; StreetRise's migration history is known to drift. Verify the objects themselves.

## What 058 adds

- `booking_transportation_details` — a private 1:1 extension of canonical `bookings`.
- `submit_transportation_request(...)` — transaction-safe RPC that creates the parent booking and trip details together.
- read policies for:
  - the authenticated requester on their own booking,
  - the provider that owns the transportation resource,
  - StreetRise admins.
- **no public/anonymous SELECT policy** for trip details.

`bookings.resource_id` is the transportation program receiving/being mediated for. `destination_resource_id`, when present, is the StreetRise resource the person is trying to reach.

## Booking status compatibility

The RPC creates `status = 'pending'` only.

Live was checked before this migration was written. Current live `booking_status` values include:

- `pending`
- `confirmed`
- `waitlisted`
- `cancelled`
- `completed`
- `no_show`
- `needs_info`
- `contacted`
- `no_response`
- `closed`

Live **does not include `declined`**. This PR therefore removes the broken Decline action from the admin/provider request queues instead of depending on a status the database rejects.

## Deployment order

Migrations are applied by hand while merging to `main` deploys the frontend.

The request page recognizes only a missing-RPC error as a deployment-order condition. In that specific case it falls back to the existing anonymous `bookings` insert and stores the trip summary in private booking notes. Other RPC errors are not swallowed.

Once 058 is applied, new requests use the transaction-safe parent + extension path.

## Apply

1. Open Supabase SQL Editor for the StreetRise project.
2. Paste `supabase/migrations/058_transportation_request_details.sql`.
3. Run it once.
4. Run the verification queries below.
5. Smoke-test one anonymous request and one provider/admin read before treating the feature as fully enabled.

Do **not** apply this migration merely because the PR exists. Apply it deliberately when the PR is approved for release.

## Verify schema

```sql
SELECT to_regclass('public.booking_transportation_details') AS details_table;

SELECT to_regprocedure(
  'public.submit_transportation_request(uuid,uuid,text,text,timestamptz,text,text[],boolean,text,text,text,text,text,text,text,boolean,text)'
) AS submit_rpc;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'booking_transportation_details'
ORDER BY ordinal_position;
```

Expected: table + RPC both resolve, and origin/destination/request kind are required while wheelchair/timing/mobility fields may remain unknown.

## Verify RLS / privacy

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE oid = 'public.booking_transportation_details'::regclass;

SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'booking_transportation_details'
ORDER BY policyname;
```

Expected:

- RLS enabled.
- SELECT policies for requester, owning provider and admin.
- no anonymous/public SELECT policy.
- no direct anonymous INSERT policy on the extension.

## Verify anonymous submission

Use an anonymous browser session against the deployed preview or production app rather than fabricating an `auth.uid()` in SQL.

Submit a transportation request and confirm:

```sql
SELECT b.id,
       b.resource_id,
       b.status,
       b.requester_name,
       b.contact_consent,
       d.origin_text,
       d.destination_text,
       d.requested_kind,
       d.requested_modes,
       d.wheelchair_required
FROM bookings b
JOIN booking_transportation_details d ON d.booking_id = b.id
ORDER BY b.created_at DESC
LIMIT 5;
```

Expected:

- exactly one booking and one extension row for the submission,
- `status = 'pending'`,
- trip details match what the person intentionally submitted,
- browser geolocation coordinates are not stored unless the person explicitly typed equivalent information.

Delete any smoke-test row after verifying it.

## Verify queue ownership

Smoke-test in the app:

1. An admin can see the transportation request in `/admin/bookings` with From → To details.
2. A **claimed/connected** provider that owns the transportation resource can see the same request in `/portal/bookings`.
3. A different provider cannot read the booking or its transportation extension.
4. For an **unclaimed** provider, the public request screen says the request goes to StreetRise for follow-up and is not sent directly to the agency through StreetRise.

## Rollback note

Because the extension is keyed to `bookings` with `ON DELETE CASCADE`, deleting a test parent booking removes its trip detail automatically.

Do not drop the table/function from production as a casual rollback once real transportation requests exist; the extension contains private trip data that should be handled as user records, not disposable seed data.
