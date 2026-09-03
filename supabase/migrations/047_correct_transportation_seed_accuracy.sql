-- ================================================================
-- StreetRise — Migration 047: Transportation seed accuracy fixes
--
-- Corrects facts in migration 041 after checking the agencies' current
-- official pages on 2026-09-03. Safe to run after 041; idempotent updates
-- are keyed by stable external_id values.
--
-- PSTA:
--   • TD applications/info remain 727-540-1900.
--   • PSTA Access and Mobility-on-Demand use 727-540-1888.
--   • Deep-link each program to the current official program page.
--   • Avoid naming a disputed taxi vendor in the MOD description because
--     current PSTA pages are not internally consistent on that vendor name.
--
-- HART:
--   • HARTPlus reservations are required the day before service.
--   • Eligibility determination is completed within 21 days after the
--     application process is complete; it is not accurately described as
--     taking "at least 21 days".
--   • Deep-link HARTPlus and Travel Training to their current official pages.
-- ================================================================

UPDATE resources
SET phone = '(727) 540-1888',
    website = 'https://psta.net/rider-info/accessibility/',
    hours_of_operation = jsonb_set(
      hours_of_operation,
      '{source_url}',
      '"https://psta.net/rider-info/accessibility/"'::jsonb,
      TRUE
    )
WHERE external_id IN ('PSTA-001-access', 'PSTA-001-mod');

UPDATE resources
SET website = 'https://psta.net/fares/',
    hours_of_operation = jsonb_set(
      hours_of_operation,
      '{source_url}',
      '"https://psta.net/fares/"'::jsonb,
      TRUE
    )
WHERE external_id = 'PSTA-001-td-fare';

UPDATE resources
SET website = 'https://psta.net/services/direct-connect/',
    hours_of_operation = jsonb_set(
      hours_of_operation,
      '{source_url}',
      '"https://psta.net/services/direct-connect/"'::jsonb,
      TRUE
    )
WHERE external_id = 'PSTA-001-direct-connect';

UPDATE resources
SET description = replace(
      description,
      'providers including Uber, Lyft, zTrip and a wheelchair-accessible service',
      'providers including Uber and Lyft plus participating taxi and wheelchair-accessible services'
    )
WHERE external_id = 'PSTA-001-mod';

UPDATE resources
SET description = replace(
      replace(
        description,
        'one to three days in advance',
        'the day before service is desired'
      ),
      'which HART documents as taking at least 21 days',
      'with HART completing the eligibility determination within 21 days after the application process is complete'
    ),
    website = 'https://www.gohart.org/Pages/services-van.aspx',
    hours_of_operation = jsonb_set(
      hours_of_operation,
      '{source_url}',
      '"https://www.gohart.org/Pages/services-van.aspx"'::jsonb,
      TRUE
    )
WHERE external_id = 'HART-001-hartplus';

UPDATE resources
SET website = 'https://gohart.org/Pages/HARTForAll.aspx',
    hours_of_operation = jsonb_set(
      hours_of_operation,
      '{source_url}',
      '"https://gohart.org/Pages/HARTForAll.aspx"'::jsonb,
      TRUE
    )
WHERE external_id = 'HART-001-travel-training';
