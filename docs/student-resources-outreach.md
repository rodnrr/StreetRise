# Student Clothing — Outreach & Partnership Leads

Companion to `supabase/migrations/036_seed_student_clothing_resources.sql`.

The source directory for migration 036 mixed two different things: organisations
a family can actually get clothing from, and organisations worth *approaching*
for a partnership, drive, or sponsorship. Only the first kind belongs on the
public map. This file is where the second kind lives, so the outreach work is
not lost.

---

## Why these four are not on the map

A pin on StreetRise is a promise that someone in need can go there and be
helped. A retail store, a mailing address, or a fund-development contact fails
that promise, and failing it costs a parent a bus fare and an afternoon.

| Organisation | Why it is not a public listing |
|---|---|
| **Goodwill Industries-Suncoast** | Retail — clothing is *sold*, not given. Listing a thrift store under "free clothing help" would misrepresent it. The real opportunity is corporate: vouchers, a sponsored drive, or a store-level partnership. |
| **Project Ready for School** (Miami) | Publishes no service address (Coral Gables is a mailing/contact location) and no public phone. Programs run as school partnerships and events, not a place to walk into. |
| **School Ready** (Miami-Dade) | Primarily a *school-supply* partner rather than a clothing provider. Adjacent and useful, but not what a parent searching for clothing needs. |
| **Big Brothers Big Sisters of Miami — Big Closet** | The Big Closet serves BBBS's own enrolled youth. A family with no BBBS match cannot access it, so a public pin would be an invitation that does not hold. |

---

## Do not publish the individual contacts

The source spreadsheet carried two **named individuals' work email addresses**
(a VP of Fund Development at Goodwill Suncoast, and a contact at Project Ready
for School). Those were deliberately kept out of the `providers` table:
`providers.contact_email` on a seeded row is effectively public-facing, and a
public directory is not the place for one person's inbox.

Use them from your own mail client for outreach. If one of these orgs later
becomes a real listing, seed the **org-level** inbox (`info@…`, `contact@…`) or
the `*.placeholder` convention, exactly as the other seeded providers do — and
let the org itself claim the record at `/claim` and set its own contact details.

---

## The asks, in priority order

Carried over from the source directory, lightly re-ordered so that the
organisations already **on** the map (where a conversation converts a
"Community Listed" amber badge into a "Staff Verified" blue one) come first.

| # | Organisation | On the map? | Ask |
|---|---|---|---|
| 1 | **Clothes To Kids** | ✅ 3 listings | Confirm the school-referral route for students affected by dress-code requirements, and confirm real store hours per location so the listings can carry them. |
| 2 | **OASIS Opportunities** | ✅ 1 listing | Ask about replicating their school-social-worker clothing model, and about targeted uniform drives. |
| 3 | **OCPS Kids' Closet** | ✅ 1 listing | Ask how the centralised district clothing-closet model is structured and staffed — the best Florida benchmark. |
| 4 | **Overtown Youth Center — Neat Stuff** | ✅ 1 listing | Ask how the school-based Neat Stuff closets are established and funded. Direct example of a closet operating *inside* a school. |
| 5 | **M-DCPS Foundation — The Shop** | ✅ 1 listing | Ask about the school-employee referral procedure and partnership options. |
| 6 | **Caring for Miami — Mobile Closet** | ✅ 1 listing | Ask about a targeted school clothing drive for plain polos and compliant khaki bottoms; ask for the Mobile Closet schedule so the listing can carry real hours. |
| 7 | **Goodwill Industries-Suncoast** | ❌ | Community partnership, clothing drive, vouchers, or sponsorship. Largest regional capacity of anyone on this list. |
| 8 | **Project Ready for School** | ❌ | Sponsorship / partnership for uniforms, shoes, backpacks and supplies for Miami students. |
| 9 | **Big Brothers Big Sisters of Miami** | ❌ | Donation drive against their published wish list (new uniforms, socks, undergarments, shoes). |
| 10 | **School Ready** | ❌ | School-supply partnership; useful adjacent to clothing rather than instead of it. |

---

## Notes from the source directory, kept

- **Confidentiality.** Student referrals go through the school's approved
  student-support process. Never put student names or identifying details in a
  donation spreadsheet, a provider message thread, or a listing description.
- **Dress-code fit.** Before soliciting donations, give donors the school's exact
  acceptable colours, garment features, and logo/design restrictions — otherwise
  a drive produces clothing a student still cannot wear.
- **Everything expires.** Programs, eligibility rules, hours and contacts change.
  Confirm before referring a student or sending a family. This is the same reason
  every seeded listing is `pending` until someone actually phones.

---

## Turning a lead into a listing

If one of the four converts into something a family can use directly:

1. Add the provider and its resource in a **new** numbered migration (never edit
   036 — it will already be applied).
2. Tag the resource `population_focus` with `students` so it joins the Students
   chip and `/students` automatically.
3. Seed it `pending` unless it was confirmed by phone.
4. Point `contact_email` at an org-level inbox, not a person.
