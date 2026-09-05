# StreetRise Transportation Experience — implementation note

## Existing foundation on `main`

PR #100 already shipped the transportation engine:

- `/transportation` directory + Ride Assistance Finder
- `GetThere` on resource detail and map sheet
- Google Maps / Apple Maps handoff for transit, walking, bicycling and driving
- deterministic ride-assistance matching in `src/lib/rideOptions.ts`
- static-GTFS nearest-stop support in `src/lib/transit.ts`
- six canonical transportation resources for PSTA/HART
- EN/ES public UI

Housing PR #108 established the architecture StreetRise should keep using: specialized capabilities extend canonical `providers`, `resources` and request objects instead of creating a parallel product universe.

## UX problem to solve

The existing Ride Assistance Finder is correct but form-like. The next iteration should feel like one continuous task:

1. Where are you going?
2. How do you want or need to get there?
3. What options can actually help?
4. If a program can receive StreetRise requests, submit help without creating a second request system.

The experience should preserve the distinction between:

- ordinary routing (transit / walk / bike / drive),
- transportation assistance (fare help, subsidized rides, paratransit), and
- a request for human assistance.

StreetRise still does **not** calculate realtime itineraries, quote fares, guarantee eligibility, or dispatch emergency transportation.

## Request model

`bookings` remains the canonical request object.

A transportation request points `bookings.resource_id` at the transportation program being asked for help. A 1:1 extension, `booking_transportation_details`, stores trip-specific data such as origin, destination, timing and mobility needs.

This keeps:

- provider ownership and RLS tied to the existing resource/provider relationship,
- admin requests in the existing queue,
- anonymous requests supported,
- future notifications compatible with the booking workflow.

Trip details are private. There is no anonymous/public SELECT policy on the extension.

## Deployment compatibility

Migrations are applied manually while merging deploys the app. The request UI therefore treats a missing `submit_transportation_request` RPC as a known deployment-order condition and falls back to the existing `bookings` insert with a human-readable trip summary in `notes`. It must not swallow unrelated errors.

## Privacy

The finder continues to keep disability, Medicaid, low-income and veteran matching answers in React state only. They are not written to Supabase, URLs or persisted stores.

A trip origin/destination is persisted only when the person intentionally submits a transportation request. Browser geolocation itself is never silently stored.

## Geography

The existing Florida city→county resolver remains a compatibility layer for the current matching engine. This PR must not deepen that dependency. A generalized service-area model remains the long-term direction for national scale.

## Scope of this PR

- simplify `/transportation` into a three-stage trip / need / results flow
- strengthen visual hierarchy in `GetThere`
- add transportation request submission through canonical bookings
- keep the existing assistance matcher and GTFS logic intact
- preserve `?to=<resourceId>` and `?mode=wheelchair`
- no giant agency seed, no realtime vehicle feed, no commercial Uber/Lyft integration
