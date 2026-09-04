-- ================================================================
-- StreetRise — Migration 058: Florida reference state (Phase 1)
--
-- ⚠️  READ THIS BEFORE APPLYING. Nothing in section 2 of this file is
--     publishable as it stands. See docs/apply-migration-058.md.
--
-- Phase 1 called for one state "fully populated by hand, as the quality
-- bar every later state has to match". This file delivers half of that
-- honestly and stops at the line where it would have to start guessing.
--
-- ── What is verified and published ───────────────────────────────
-- Section 1: the Florida state row — the record-lookback summary shown
-- at the top of /housing/fl. Written from federal statute and a named
-- session law, both cited in `notes`.
--
-- ── What is seeded UNPUBLISHED and why ───────────────────────────
-- Section 2: five organizations that demonstrably exist and serve
-- people leaving incarceration in Florida, every one of them
-- is_published = false, with street address, phone and email left NULL.
--
-- The session that wrote this file could reach web *search* but not any
-- individual website — the sandbox's egress proxy allowed GitHub and
-- package registries and nothing else — so every candidate address and
-- phone number available to it came from third-party aggregator sites,
-- not from the organizations themselves.
--
-- In a directory for people with records, a stale phone number is a
-- wasted day and a wrong address is a bus fare somebody did not have,
-- spent to stand in front of a building that is not there. Aggregator
-- data is exactly where those errors come from. So the identities are
-- recorded here, the provenance is recorded beside them in
-- housing_sources, and the contact fields stay empty until a human
-- calls and fills them in.
--
-- Publishing one of these is: call the org, confirm the details, write
-- them in, log a housing_verifications row with method='phone', then
-- set is_published = true. The runbook has the SQL.
--
-- Consequence, stated plainly: after this migration /housing/fl renders
-- its lookback summary and an empty listings state. That is correct
-- behaviour, not a bug — the page is designed to say "we have nothing
-- confirmed here yet" rather than to pad itself with unconfirmed rows.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- 1. Florida state row  —  PUBLISHABLE
-- ════════════════════════════════════════════════════════════════
-- Plain language, ~8th grade reading level, and deliberately framed as
-- "what the law does NOT protect you from" because the common and more
-- dangerous misconception runs the other way: people are widely told
-- that convictions "fall off" after seven years. Under the FCRA they do
-- not — that limit covers arrests that did not lead to conviction.
-- Someone who believes the myth stops disclosing, gets caught out on an
-- application, and loses the unit for the non-disclosure rather than
-- for the record.
--
-- has_housing_ban_the_box = false is an asserted false, not an
-- unknown: Florida has no statewide housing ban-the-box law, and since
-- CS/HB 1417 its cities and counties may not create one.

UPDATE housing_states SET
  record_lookback_summary =
       'Florida does not set a time limit on how far back a private landlord can look at criminal '
    || 'convictions. There is no state law that says an old conviction has to be ignored.'
    || E'\n\n'
    || 'You may have heard that a record "falls off" after seven years. That is only partly true, and '
    || 'the part people get wrong is the part that matters. Under federal law (the Fair Credit '
    || 'Reporting Act), a paid background-check company usually cannot report an ARREST that is more '
    || 'than seven years old if it did not lead to a conviction. Convictions are different: there is '
    || 'no federal time limit on reporting them. A conviction from twenty years ago can still show up.'
    || E'\n\n'
    || 'Since July 2023, Florida cities and counties are not allowed to make their own rules about how '
    || 'landlords screen tenants. If you read about a local tenant protection in Miami, Orlando, Tampa '
    || 'or anywhere else in Florida, check the date — a state law passed that year cancelled those '
    || 'local rules.'
    || E'\n\n'
    || 'Federal fair housing law covers most rentals, but not all of them. A landlord who turns away '
    || 'everyone with any record, without looking at what the record is or how long ago it happened, '
    || 'may be breaking it. Some small landlords are exempt: renting a room in a house the owner '
    || 'lives in, where there are four units or fewer, is often not covered, and neither is an owner '
    || 'renting out a single-family home without an agent. A lot of second-chance housing looks '
    || 'exactly like that, so do not assume the rule covers your situation. A legal aid office can '
    || 'tell you whether it does.'
    || E'\n\n'
    || 'This is general information, not legal advice. If you are turned down and you think it was '
    || 'unfair, talk to a legal aid office in your county.',

  -- No statewide housing ban-the-box, and local ones are now preempted.
  has_housing_ban_the_box = false,

  notes =
    'SOURCES — re-check before relying on this text.' || E'\n'
    || '• FCRA, 15 U.S.C. 1681c(a)(2) and (a)(5): seven-year reporting limit on records of arrest and on '
    || '"any other adverse item of information", with records of criminal convictions expressly excluded '
    || 'from that limit.' || E'\n'
    || '• Florida CS/HB 1417 (2023), Chapter 2023-140, Laws of Florida, effective 2023-07-01: preempts '
    || 'regulation of residential tenancies, including screening, to the state and supersedes local '
    || 'ordinances.' || E'\n'
    || '• Fair Housing Act, 42 U.S.C. 3601 et seq., and its exemptions at 42 U.S.C. 3603(b) — '
    || 'owner-occupied dwellings of four units or fewer, and single-family houses rented by the owner '
    || 'without a broker. The summary names these because much second-chance housing is exactly that '
    || 'shape, and a categorical "the law protects you" would be wrong for the reader most likely to '
    || 'be renting a room in somebody''s house.' || E'\n'
    || '• NOTE: this summary deliberately does NOT characterise '
    || 'HUD''s current enforcement posture on criminal-record screening. HUD OGC issued guidance on this in '
    || 'April 2016; a later OGC memorandum dated 2025-09-25 exists and could not be read from the session '
    || 'that wrote this file. Confirm what is operative before adding any sentence about HUD''s position, '
    || 'here or on /housing/rights.' || E'\n\n'
    || 'DRAFTING NOTE: written by an AI session from statute and session-law citations, NOT reviewed by an '
    || 'attorney. StreetRise already carries an open item about unreviewed legal copy on /privacy and '
    || '/terms; this text is in the same category and should go the same route.',

  updated_at = now()
WHERE code = 'FL';


-- ════════════════════════════════════════════════════════════════
-- 2. Florida organizations  —  ALL UNPUBLISHED, CONTACT FIELDS EMPTY
-- ════════════════════════════════════════════════════════════════
-- Identity and locality only. `website` is filled in only for the two
-- organizations whose own domain appeared directly in search results;
-- the rest are left NULL rather than guessed at, because a wrong URL in
-- a reentry directory is a phishing surface, not just an error.
--
-- No street address. No phone. No email. Those are the fields that send
-- somebody somewhere, and none of them were verifiable here.

INSERT INTO housing_organizations (slug, name, org_type, website, description, is_published) VALUES
  (
    'operation-new-hope',
    'Operation New Hope',
    'reentry_nonprofit',
    'https://operationnewhope.org',
    'Jacksonville-based reentry organization working statewide with the Florida Department of Corrections on '
    'pre-release case management, job training and placement, and help finding housing. Listed here as a '
    'reentry nonprofit rather than a housing provider: available reporting describes it as helping people '
    'secure housing, not as operating housing itself. Confirm which it is before adding any program.',
    false
  ),
  (
    'abe-brown-ministries',
    'Abe Brown Ministries',
    'reentry_nonprofit',
    NULL,
    'Faith-based reentry organization in Tampa, Hillsborough County. Reported to run a twelve-month '
    'transitional living program for a limited number of participants, alongside employment services. '
    'Program capacity, cost and intake requirements all unconfirmed.',
    false
  ),
  (
    'pinellas-ex-offender-reentry-coalition',
    'Pinellas Ex-Offender Re-Entry Coalition (PERC)',
    'reentry_nonprofit',
    NULL,
    'Pinellas County coalition providing employment, transportation and temporary housing support for people '
    'leaving incarceration. Reported to operate transitional houses in partnership with another provider, and '
    'a separate larger housing program. Bed counts and current operating status unconfirmed.',
    false
  ),
  (
    'project-180-reentry',
    'Project 180',
    'reentry_nonprofit',
    'https://www.project180reentry.org',
    'Reentry organization in the Sarasota area working on reintegration for people returning from '
    'incarceration. Whether it provides housing directly is unconfirmed.',
    false
  ),
  (
    'dismas-charities-florida',
    'Dismas Charities (Florida locations)',
    'transitional_housing',
    NULL,
    'National operator of residential reentry centers with locations in Florida. Individual Florida facilities '
    'have not been enumerated here — each is a separate address with its own referral route, and most intakes '
    'to residential reentry centers come through the Bureau of Prisons or a supervising officer rather than '
    'by walk-in. Confirm the referral path before publishing, so the listing does not imply self-referral.',
    false
  )
ON CONFLICT (slug) DO NOTHING;


-- ── Locations: city and state only ──────────────────────────────
-- A city is enough to group a listing on the state page and is the one
-- geographic fact reporting agreed on. is_primary is left false: it
-- marks the address someone should actually go to, and there is no
-- address here yet.

INSERT INTO housing_locations (organization_id, city, state_code, is_primary)
SELECT o.id, v.city, 'FL', false
  FROM (VALUES
    ('operation-new-hope',                     'Jacksonville'),
    ('abe-brown-ministries',                   'Tampa'),
    ('pinellas-ex-offender-reentry-coalition', 'Clearwater'),
    ('project-180-reentry',                    'Sarasota')
  ) AS v(slug, city)
  JOIN housing_organizations o ON o.slug = v.slug
 WHERE NOT EXISTS (
   SELECT 1 FROM housing_locations l
    WHERE l.organization_id = o.id AND l.city = v.city AND l.state_code = 'FL'
 );


-- ── Programs: only where a source actually named one ────────────
-- Two rows, both unpublished. Every tri-state boolean is NULL, which is
-- the honest value: no source stated whether these programs accept
-- people with violent or sexual offence convictions, and those are the
-- two questions their applicants most need answered.
--
-- max_stay_days = 365 comes from "twelve-month program" in secondary
-- reporting. It is a derived number from an unverified source and is
-- flagged as such in notes; confirm or clear it on the verification
-- call.

INSERT INTO housing_programs (
  organization_id, name, housing_type, gender_served,
  accepts_felony, accepts_violent_offense, accepts_sex_offense,
  accepts_vouchers, requires_sobriety, has_curfew,
  max_stay_days, notes, is_published, last_verified_at
)
SELECT o.id, v.name, v.htype::housing_type, NULL,
       NULL, NULL, NULL,
       NULL, NULL, NULL,
       v.max_stay, v.notes, false, NULL
  FROM (VALUES
    (
      'abe-brown-ministries',
      'Transitional Living Program',
      'transitional',
      365,
      'UNVERIFIED. Name and twelve-month duration come from secondary reporting, not from the organization. '
      'max_stay_days=365 is derived from "12-month" and must be confirmed or cleared. Intake requirements, '
      'cost, bed count, gender served, and every record-related question are all unknown.'
    ),
    (
      'pinellas-ex-offender-reentry-coalition',
      'Transitional housing (program name unconfirmed)',
      'transitional',
      NULL,
      'UNVERIFIED PLACEHOLDER. Secondary reporting describes transitional houses run with a partner '
      'organization plus a separate larger housing program, but did not give a reliable program name or '
      'current capacity. Do not publish under this placeholder name — replace it with the real one on the '
      'verification call, or delete the row if the program has ended.'
    )
  ) AS v(slug, name, htype, max_stay, notes)
  JOIN housing_organizations o ON o.slug = v.slug
 WHERE NOT EXISTS (
   SELECT 1 FROM housing_programs p
    WHERE p.organization_id = o.id AND p.name = v.name
 );


-- ── Provenance ──────────────────────────────────────────────────
-- Recorded so the next person can see exactly how thin this is, rather
-- than inheriting five rows of unexplained confidence.

INSERT INTO housing_sources (organization_id, source_name, source_url, license_note, raw_payload)
SELECT o.id,
       'AI web search, unverified against the organization',
       NULL,
       'Third-party aggregator summaries retrieved via search only. Not retrieved from the organization''s '
       'own website — the authoring session could not reach it. No licence claim; no content copied.',
       jsonb_build_object(
         'seeded_by',      'migration 058',
         'method',         'web search summaries',
         'verified',       false,
         'fields_omitted', jsonb_build_array('address_line1','postal_code','phone','email','intake_phone'),
         'reason',         'contact and address details were not obtainable from a primary source'
       )
  FROM housing_organizations o
 WHERE o.slug IN (
   'operation-new-hope',
   'abe-brown-ministries',
   'pinellas-ex-offender-reentry-coalition',
   'project-180-reentry',
   'dismas-charities-florida'
 )
   AND NOT EXISTS (
     SELECT 1 FROM housing_sources s
      WHERE s.organization_id = o.id
        AND s.source_name = 'AI web search, unverified against the organization'
   );
