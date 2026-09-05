# StreetRise Second Chance Housing Verification Standard

Status: **required for all new Second Chance / reentry housing records**

Last reviewed: 2026-09-05

## Purpose

StreetRise treats **Second Chance** as a derived housing search, not a resource type.

A listing qualifies only when at least one of these is supported by evidence:

- `resource_housing_details.accepts_felony = true`, or
- `resources.population_focus` contains `reentry` because the provider explicitly serves people returning from incarceration / justice involvement.

A criminal record, low income, homelessness, recovery status, or a provider appearing in a generic reentry directory **does not by itself prove Second Chance eligibility**.

Unknown eligibility stays `NULL`. Never convert "not stated" into `false`, and never convert general reentry language into a claim about violent- or sex-offense eligibility.

---

## 1. Publish gates

A new Second Chance record may be published only when all applicable gates pass.

### Provider identity

Required:

- Current official provider website or current government/211/BOP/FDC record.
- Current phone or other usable intake path.
- Provider identity can be tied to the program being listed.
- No unresolved duplicate provider already exists in StreetRise.

Preferred:

- Official program page plus official contact page.
- Government, 211, CoC, BOP, FDC, court, or county reentry source as corroboration when available.

Do **not** publish from an aggregator alone when a direct or government source can reasonably be found.

### Housing reality

The source must establish what the program actually does. Classify it as one of:

- **Direct housing** — provider operates the residence/bed.
- **Housing navigation** — provider helps the person locate, apply for, or stabilize outside housing.
- **Correctional/reentry placement** — BOP/FDC/court/probation or another authorized referral controls residential placement.
- **Recovery residence** — housing is tied to recovery/sobriety rules.

Do not describe housing navigation as a bed, and do not describe an RRC/community-release facility as ordinary public rental housing.

### Second Chance evidence

At least one direct source must explicitly support one of:

- returning citizens / people returning from incarceration,
- justice-involved people,
- ex-offenders / formerly incarcerated people,
- felon-friendly / criminal-history-friendly housing,
- a clearly defined correctional reentry residential program.

For `accepts_felony = true`, prefer explicit language that the housing accepts felony histories or a program statement showing the target population is formerly incarcerated people and that the housing itself is part of that program.

### Sensitive offense fields

`accepts_violent_offense` and `accepts_sex_offense` require explicit evidence.

Allowed values:

- `true` — source explicitly confirms eligibility/acceptance.
- `false` — source explicitly excludes it.
- `NULL` — source does not say.

Never infer these fields from `accepts_felony`, `reentry`, `non-violent`, a general housing mission, or absence of an exclusion.

### Current intake path

Every published record must have at least one usable current path:

- application URL,
- intake phone,
- referral process, or
- official contact path.

If the provider cannot currently be reached or the intake path cannot be verified, do not mark the record verified.

---

## 2. Canonical StreetRise modeling

### Resource category

Always:

```text
category = housing
```

Second Chance is **not** a category or `resource_type`.

### Recommended resource types

Use the narrowest supported type:

- `transitional_housing`
- `shared_housing`
- `recovery_residence`
- `permanent_supportive_housing`
- `affordable_housing`
- `housing_navigation`
- another existing canonical housing type when the source actually supports it

Do not invent `second_chance_housing`.

### Reentry population

Set:

```text
population_focus += reentry
```

only when the provider/program explicitly serves the reentry/justice-impacted population.

### Referral-required housing

Set `requires_referral = true` when placement is controlled by BOP, FDC, a court, probation, coordinated entry, a justice-system partner, or another required referring entity.

Do not set it merely because the provider *accepts* referrals or works with referral partners.

### Legacy intake booleans and unknowns

`requires_id`, `requires_referral`, `phone_required_before_arrival`, and `walk_ins_accepted` are legacy non-null booleans. Unlike the housing-specific eligibility fields, they cannot represent an unknown value cleanly.

For housing resources:

- Never interpret an unsupported `false` as an affirmative public promise such as **“No ID required,” “No referral required,”** or **“No need to call first.”**
- Only publish or render a positive intake claim when a current source actually establishes that fact.
- When an intake rule is not established, the public housing experience must treat it as unknown and direct the visitor to call/ask rather than infer an answer from the stored default.
- Continue to set `requires_referral = true` whenever referral or correctional placement is explicitly required.
- Do not change non-housing resource semantics merely to accommodate housing uncertainty; the housing UI must fail safely around these legacy fields.

This rule is enforced in the housing rendering path on `ResourceDetailPage`: legacy `false` values are not converted into unsupported negative promises for housing listings.

### Access type

Use the actual public entry path:

- `phone_intake`
- `web_intake`
- `confidential_address`
- `not_map_ready`
- `onsite` only when an onsite public intake is actually supported

### Map readiness and privacy

Do not expose residential coordinates merely because a mailing/contact office is public.

Set `is_map_ready = false` when:

- the listed address is only an administrative/intake office,
- exact residences are intentionally unpublished,
- the provider operates multiple scattered homes without public locations,
- the address is confidential,
- the location cannot be verified as the place a user should physically travel to.

A public office can remain in `address` as contact context while `is_map_ready = false`.

---

## 3. Money, rules, and eligibility

### Fees and rent

Only put a value into a structured money field when the source says what that charge actually is.

Examples:

- monthly rent -> `minimum_monthly_cost_cents` / `maximum_monthly_cost_cents`
- refundable security deposit -> `deposit_cents`
- application/program/admin fee -> keep in `eligibility_notes` unless StreetRise adds a dedicated field

Never relabel a program fee as a deposit.

### Sobriety

Set `requires_sobriety` only when a source establishes a sobriety/drug-free admission or residency requirement.

A provider also serving people in recovery does not prove a sobriety requirement.

### Curfew

Set `has_curfew` only when a current provider/program source states one.

### Stay duration

Set `max_stay_days` only when the published program establishes a maximum or defined program term. Do not turn an approximate or typical stay into a hard maximum unless the source presents it that way.

---

## 4. Evidence rules

Every sensitive or high-impact claim should have a `resource_evidence` row.

At minimum, evidence should cover the claim that makes the record qualify as Second Chance.

Add separate evidence for particularly consequential claims such as:

- `accepts_felony`
- `accepts_violent_offense`
- `accepts_sex_offense`
- `requires_referral`
- `minimum_monthly_cost_cents`
- `has_curfew`
- `population_focus.reentry`
- classification as `housing_navigation` when confusing it with direct housing would mislead the user

Use the existing evidence vocabulary:

### `method`

- `provider_portal`
- `official_website`
- `phone`
- `email`
- `government_source`
- `admin_research`

### `outcome`

- `confirmed`
- `changed`
- `closed`
- `unreachable`

Do not invent new evidence enum/check values inside a seed migration.

---

## 5. Verification and freshness

For researched Second Chance seeds:

- `verification_status = verified`
- `confidence_score >= 90` for direct-source publication
- `stale_after_days = 30`
- set `last_verified_at`
- set `resource_housing_details.housing_details_last_checked_at`

Why 30 days: housing availability, intake, costs, supervision rules, and eligibility change faster than ordinary directory metadata.

A stale listing may remain discoverable according to StreetRise's general trust rules, but the UI must not imply that an old availability or waitlist statement is current.

---

## 6. Required public-facing distinctions

Second Chance results must not make these three things look equivalent:

1. **Direct housing / apply for housing**
2. **Housing navigation / help finding housing**
3. **Referral or correctional placement required**

At minimum, the listing/detail experience must surface `requires_referral` and the canonical housing `resource_type`. Gender restrictions should be visible before a user spends time or money traveling.

Unknown criminal-history eligibility must render as "not stated / call to ask," never as a rejection.

Unknown intake requirements must likewise remain unknown. A database default or legacy `false` must never become a public guarantee that an applicant needs no ID, referral, phone call, or other intake step unless a current source supports that statement.

---

## 7. Pre-publish QA checklist

Before applying a regional seed migration:

- [ ] Direct/current source confirms the provider exists.
- [ ] Direct/current source confirms the housing or housing-navigation service.
- [ ] Reentry/justice-impacted eligibility is explicit.
- [ ] Provider is not already duplicated in `providers`.
- [ ] Resource is not already duplicated by provider + program + location.
- [ ] `category = housing`.
- [ ] Canonical `resource_type` is used.
- [ ] `population_focus` includes `reentry` only when supported.
- [ ] `accepts_felony` is not inferred casually.
- [ ] Violent/sex-offense fields are explicit or `NULL`.
- [ ] Referral-only/correctional programs set `requires_referral = true`.
- [ ] Legacy intake booleans are not being used to make unsupported negative promises.
- [ ] Housing navigation is not described as a residence.
- [ ] Confidential/scattered/administrative locations are `is_map_ready = false`.
- [ ] Fees are modeled as the correct kind of charge.
- [ ] Phone/application/contact path works.
- [ ] Housing detail row exists.
- [ ] Evidence exists for Second Chance qualification and sensitive claims.
- [ ] Confidence is at least 90 for researched direct-source seeds.
- [ ] Freshness window is 30 days.
- [ ] Anonymous-role query returns the intended record after deployment.
- [ ] `/housing?view=second-chance` presentation does not imply walk-in/direct housing when referral is required.

---

## 8. Post-publish QA

After applying a migration:

1. Confirm migration history.
2. Count inserted/upserted resources and housing-detail rows.
3. Confirm every seeded resource has evidence.
4. Test the Second Chance predicate as `anon`.
5. Check duplicates against existing provider names and normalized websites.
6. Check missing phone, website, housing details, evidence, reentry tag, and verification timestamps.
7. Inspect restricted-placement records manually.
8. Verify no confidential/scattered residence became map-ready accidentally.
9. Verify the live `/housing` list and individual resource-detail pages.
10. Recheck after any frontend deploy that changes housing-card rendering.

---

## 9. Mining order for future Florida expansion

For each metro/county, research in this order:

1. Official provider websites.
2. County/city reentry and justice-coordination resources.
3. Florida Department of Corrections resource/reentry sources.
4. Federal BOP Residential Reentry Center sources where applicable.
5. Continuum of Care / homeless-system provider directories.
6. Current 211 directories.
7. Probation/public-defender/court reentry guides.
8. Faith-based and community reentry organizations.
9. Recovery-residence directories when criminal-history eligibility is explicit.
10. Search aggregators only as lead generators; verify the resulting provider independently.

Research should deliberately search for programs serving:

- men,
- women,
- families,
- veterans,
- people on probation/parole,
- people with violent histories,
- people with sex-offense histories,
- recovery populations,
- people without income,
- people with SSI/SSDI,
- people needing housing navigation rather than a residential bed.

The goal is coverage without turning uncertainty into false eligibility.
