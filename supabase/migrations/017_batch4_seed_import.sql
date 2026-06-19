-- ============================================================
-- Migration 013: Batch 4 seed import — 31 new resources
-- Hernando, Pasco (Manatee expansion), Bradenton/Manatee,
-- + DACCO, Tampa Crossroads, Daystar Pinellas, Boley Centers
-- All new resources import as is_map_ready=false (city centroid)
-- Admin must confirm addresses and flip is_map_ready=true
-- to publish pins to the map.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Create new providers (19 new orgs)
-- ─────────────────────────────────────────────────────────────

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'JROAD-001',
  'Jericho Road Ministries',
  'Jericho Road Ministries',
  'contact@jroad.001.placeholder',
  'https://www.jericho-road.net/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'SALV-HERN-001',
  'The Salvation Army',
  'The Salvation Army',
  'contact@salv.hern.001.placeholder',
  'https://hernando.salvationarmyflorida.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'DAYSTAR-BKSVL-001',
  'Daystar Life Center',
  'Daystar Life Center',
  'contact@daystar.bksvl.001.placeholder',
  'http://daystarlifecenter.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'PHP-HERN-001',
  'People Helping People in Hernando County',
  'People Helping People in Hernando County',
  'contact@php.hern.001.placeholder',
  'https://www.phphernando.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'CSPH-001',
  'CareerSource Pasco Hernando',
  'CareerSource Pasco Hernando',
  'contact@csph.001.placeholder',
  'https://www.careersourcepascohernando.com/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'DAWN-HERN-001',
  'Dawn Center of Hernando County',
  'Dawn Center of Hernando County',
  'contact@dawn.hern.001.placeholder',
  'https://www.dawncenter.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'YFA-001',
  'Youth and Family Alternatives (YFA)',
  'Youth and Family Alternatives (YFA)',
  'contact@yfa.001.placeholder',
  'https://yfainc.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'SUNRISE-PASCO-001',
  'Sunrise of Pasco County',
  'Sunrise of Pasco County',
  'contact@sunrise.pasco.001.placeholder',
  'https://www.sunrisepasco.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'FSH-001',
  'Farmworkers Self-Help',
  'Farmworkers Self-Help',
  'contact@fsh.001.placeholder',
  'https://fshflorida.wixsite.com/farmworkers-self-hel',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'TURN-001',
  'Turning Points',
  'Turning Points',
  'contact@turn.001.placeholder',
  'https://tpmanatee.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'HOPE-MAN-001',
  'HOPE Family Services',
  'HOPE Family Services',
  'contact@hope.man.001.placeholder',
  'https://www.hopefamilyservice.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'MOWM-001',
  'Meals on Wheels PLUS of Manatee',
  'Meals on Wheels PLUS of Manatee',
  'contact@mowm.001.placeholder',
  'https://mealsonwheelsplus.org/food-bank-of-manatee/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'CSC-001',
  'CareerSource Suncoast',
  'CareerSource Suncoast',
  'contact@csc.001.placeholder',
  'https://careersourcesuncoast.com/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'MAN-PARKS-001',
  'Manatee County Parks & Natural Resources',
  'Manatee County Parks & Natural Resources',
  'contact@man.parks.001.placeholder',
  'https://www.mymanatee.org/departments/natural_resources/preserves/rye',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'PASCO-REC-001',
  'Pasco County Parks & Recreation',
  'Pasco County Parks & Recreation',
  'contact@pasco.rec.001.placeholder',
  'https://www.pascocountyfl.gov/_T22_R83.php',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'DACCO-001',
  'DACCO Behavioral Health (Ibis Healthcare)',
  'DACCO Behavioral Health (Ibis Healthcare)',
  'contact@dacco.001.placeholder',
  'https://ibishealthcare.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'TC-001',
  'Tampa Crossroads',
  'Tampa Crossroads',
  'contact@tc.001.placeholder',
  'https://tampacrossroads.com/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'DAYSTAR-PIN-001',
  'Daystar Life Center (Pinellas)',
  'Daystar Life Center (Pinellas)',
  'contact@daystar.pin.001.placeholder',
  'https://daystarlife.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO providers (external_id, organization_name, contact_name, contact_email,
                       website, role, verification_status, user_id)
VALUES (
  'BOLEY-001',
  'Boley Centers',
  'Boley Centers',
  'contact@boley.001.placeholder',
  'https://boleycenters.org/',
  'provider',
  'pending',
  NULL
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Insert 31 new resources
-- ─────────────────────────────────────────────────────────────

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'JROAD-001-mens-shelter-shelter',
  'Men''s Shelter',
  'shelter'::resource_category,
  'emergency_shelter',
  '{"street":''1090 Mondon Hill Rd'',"city":''Brooksville'',"state":''FL'',"zip":''34601''}'::jsonb,
  28.5555,
  -82.3879,
  'onsite'::resource_access_type,
  false,
  '(352) 799-2912',
  NULL,
  'https://www.jericho-road.net/',
  '{}'::jsonb,
  'Emergency shelter and 36-week faith-based recovery program for men. Up to 3 nights/month emergency shelter; meal, shower, bed, change of clothes provided. Check-in 4-8 PM daily.',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.shelterlist.com/details/jericho-road-ministries-inc-mens-shelter',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'JROAD-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'JROAD-001-womens-shelter-marys-house-shelter',
  'Women''s Shelter (Mary''s House)',
  'shelter'::resource_category,
  'women_children_shelter',
  '{"street":''1163 Howell Ave'',"city":''Brooksville'',"state":''FL'',"zip":''34601''}'::jsonb,
  28.5555,
  -82.3879,
  'onsite'::resource_access_type,
  false,
  '(352) 799-2912',
  NULL,
  'https://www.jericho-road.net/',
  '{}'::jsonb,
  'Emergency shelter for women and families plus 36-week recovery program. Up to 3 days emergency shelter; programs commitment required after 3 days.',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.shelterlist.com/details/jericho-road-ministries-inc-womens-shelter',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'JROAD-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'SALV-HERN-001-hernando-county-corps-food-pantry-utility-assistance-food',
  'Hernando County Corps - Food Pantry & Utility Assistance',
  'food'::resource_category,
  'food_pantry',
  '{"street":''15464 Cortez Blvd'',"city":''Brooksville'',"state":''FL'',"zip":''34613''}'::jsonb,
  28.5555,
  -82.3879,
  'onsite'::resource_access_type,
  false,
  '(352) 796-1186',
  NULL,
  'https://hernando.salvationarmyflorida.org/',
  '{"summary":"Food pantry Tue 9am-12pm, Fri 9am-1pm; office M-F 9am-5pm"}'::jsonb,
  'Food pantry serving Hernando County. Also provides utility assistance. Photo ID, SS card, proof of income required.',
  'unknown'::availability_status,
  false,
  true,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.homelessshelterdirectory.org/shelter/fl_salvation-army-hernando-county',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'SALV-HERN-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'DAYSTAR-BKSVL-001-food-pantry-thrift-shop-food',
  'Food Pantry & Thrift Shop',
  'food'::resource_category,
  'food_pantry',
  '{"street":''20428 Cortez Blvd'',"city":''Brooksville'',"state":''FL'',"zip":''34601''}'::jsonb,
  28.5555,
  -82.3879,
  'onsite'::resource_access_type,
  false,
  NULL,
  NULL,
  'http://daystarlifecenter.org/',
  '{}'::jsonb,
  'All-volunteer organization providing food pantry, clothing, household goods, holiday meals to needy families in Brooksville and Spring Hill. 40+ years serving Hernando County. Also operates free medical clinic at 209 Ponce de Leon Blvd 2nd & 4th Wed 1-4pm.',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'http://daystarlifecenter.org/spring-hill-food-pantries/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'DAYSTAR-BKSVL-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'PHP-HERN-001-community-center-food-showers-laundry-other',
  'Community Center - Food, Showers, Laundry',
  'other'::resource_category,
  'day_center',
  '{"street":''7925 Rhanbuoy Rd'',"city":''Spring Hill'',"state":''FL'',"zip":''34606''}'::jsonb,
  28.4781,
  -82.5267,
  'onsite'::resource_access_type,
  false,
  '(352) 686-4466',
  NULL,
  'https://www.phphernando.org/',
  '{"summary":"Showers Tue & Fri 10am-1pm; Sunday hot meal 4-6pm"}'::jsonb,
  'Interfaith nonprofit providing food, showers, laundry, weekend backpack program for children, senior groceries, and homeless services. Multi-purpose center with hygiene suite, free wash-and-dry laundry, commercial kitchen, food pantry.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.phphernando.org/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'PHP-HERN-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'CSPH-001-brooksville-career-center-work_exchange',
  'Brooksville Career Center',
  'work_exchange'::resource_category,
  'career_center',
  '{"street":''16336 Cortez Blvd'',"city":''Brooksville'',"state":''FL'',"zip":''34601''}'::jsonb,
  28.5555,
  -82.3879,
  'onsite'::resource_access_type,
  false,
  '(352) 200-3020',
  NULL,
  'https://www.careersourcepascohernando.com/',
  '{"summary":"Mon-Fri 8:00 AM - 5:00 PM"}'::jsonb,
  'One-stop career center serving Pasco and Hernando Counties. Job search assistance, resume help, training programs, veteran services, WIOA programs, SNAP E&T, computer/internet access.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.careersourcepascohernando.com/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'CSPH-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'DAWN-HERN-001-domestic-violence-emergency-shelter-hotline-shelter',
  'Domestic Violence Emergency Shelter & Hotline',
  'shelter'::resource_category,
  'domestic_violence_shelter',
  '{"street":'''',"city":''Spring Hill'',"state":''FL'',"zip":''34611''}'::jsonb,
  NULL,
  NULL,
  'confidential_address'::resource_access_type,
  false,
  '(352) 686-8430',
  NULL,
  'https://www.dawncenter.org/',
  '{"summary":"24/7 hotline; shelter 24 hrs; admin M-F 9 AM-5 PM"}'::jsonb,
  'Hernando County''s certified DV/sexual assault center. 24-hour hotline 352-686-8430, 40-bed emergency shelter at confidential location, crisis counseling, legal advocacy, outreach support. Services in English, Spanish, ASL.

Eligibility: Survivors of domestic/sexual violence',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.fcadv.org/centers/hernando',
  'confidential_no_map'
FROM providers p
WHERE p.external_id = 'DAWN-HERN-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'YFA-001-new-beginnings-youth-shelter-shelter',
  'New Beginnings Youth Shelter',
  'shelter'::resource_category,
  'youth_shelter',
  '{"street":''18377 Sheriff Mylander Way'',"city":''Brooksville'',"state":''FL'',"zip":''34601''}'::jsonb,
  28.5555,
  -82.3879,
  'onsite'::resource_access_type,
  false,
  '(352) 540-6015',
  NULL,
  'https://yfainc.org/',
  '{"summary":"Shelter 24/7; office M-F 8 AM-5 PM"}'::jsonb,
  '18-bed emergency youth shelter for ages 10-17 experiencing abuse, neglect, homelessness, running away, or family conflict. Serves Hernando, Citrus, and Sumter Counties. 24-hour supervision, food/clothing, life skills, crisis counseling, case management. No fee.

Eligibility: Youth ages 10-17',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.djj.state.fl.us/programs-facilities/prevention-programs/new-beginnings-youth-shelter',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'YFA-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'METMIN-001-miracleplace-pasco-west-pasco-campus-shelter',
  'MiraclePlace Pasco - West Pasco Campus',
  'shelter'::resource_category,
  'transitional_housing',
  '{"street":''3216 US-19'',"city":''Holiday'',"state":''FL'',"zip":''34691''}'::jsonb,
  28.1895,
  -82.7398,
  'onsite'::resource_access_type,
  false,
  '(727) 937-3268',
  NULL,
  'https://www.metromin.org/our-work/pasco/',
  '{"summary":"Mon-Fri 9 AM-5 PM, Tue 9 AM-7 PM"}'::jsonb,
  'Family Support Center plus 24-unit residential housing for homeless families (20 family rooms + 6 singles + 2 transition apts). On-site early childhood education, GED, case management, financial wellness, employment training, three hot meals daily.

Eligibility: Families with children; single women',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.metromin.org/locations/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'METMIN-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'METMIN-001-east-pasco-family-support-center-food',
  'East Pasco Family Support Center',
  'food'::resource_category,
  'food_pantry',
  '{"street":''13703 17th St'',"city":''Dade City'',"state":''FL'',"zip":''33525''}'::jsonb,
  28.3645,
  -82.1948,
  'onsite'::resource_access_type,
  false,
  '(352) 437-4815',
  NULL,
  'https://www.metromin.org/our-work/pasco/',
  '{"summary":"Mon-Fri 9 AM-5 PM, Tue 9 AM-7 PM"}'::jsonb,
  'Family Support Center serving East Pasco. Food pantry, clothing closet, rent and utility assistance, ACCESS Florida food stamp applications, holiday food and toys.',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.metromin.org/locations/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'METMIN-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'SUNRISE-PASCO-001-domestic-sexual-violence-center-outreach-office-shelter',
  'Domestic & Sexual Violence Center - Outreach Office',
  'shelter'::resource_category,
  'domestic_violence_support',
  '{"street":''12724 Smith Rd'',"city":''Dade City'',"state":''FL'',"zip":''33525''}'::jsonb,
  28.3645,
  -82.1948,
  'onsite'::resource_access_type,
  false,
  '(352) 521-3120',
  NULL,
  'https://www.sunrisepasco.org/',
  '{"summary":"24-hour hotline; office M-F 8 AM-5 PM"}'::jsonb,
  'Full-service domestic violence and sexual assault center for Pasco County. 24-bed confidential emergency shelter (location not public) up to 6 weeks. Counseling, legal advocacy, hotline, sexual assault services. All services free. Outreach office address listed.

Eligibility: Survivors of domestic/sexual violence',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.myfloridalegal.com/vicitm-services-providers/sunrise-pasco-county-inc',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'SUNRISE-PASCO-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'CSPH-001-new-port-richey-career-center-work_exchange',
  'New Port Richey Career Center',
  'work_exchange'::resource_category,
  'career_center',
  '{"street":''4440 Grand Blvd'',"city":''New Port Richey'',"state":''FL'',"zip":''34652''}'::jsonb,
  28.2442,
  -82.7187,
  'onsite'::resource_access_type,
  false,
  '(727) 484-3400',
  NULL,
  'https://www.careersourcepascohernando.com/',
  '{"summary":"Mon-Wed/Fri 8 AM-5 PM, Thu 7:30 AM-5:30 PM"}'::jsonb,
  'Main career center for West Pasco. Job search, resume help, training programs, WIOA, veteran services, computer/internet access, SNAP E&T.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.careersourcepascohernando.com/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'CSPH-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'CSPH-001-dade-city-career-center-work_exchange',
  'Dade City Career Center',
  'work_exchange'::resource_category,
  'career_center',
  '{"street":''15000 Citrus Country Dr Ste 303'',"city":''Dade City'',"state":''FL'',"zip":''33523''}'::jsonb,
  28.3645,
  -82.1948,
  'onsite'::resource_access_type,
  false,
  '(813) 377-1300',
  NULL,
  'https://www.careersourcepascohernando.com/',
  '{"summary":"Mon-Fri 8 AM-5 PM"}'::jsonb,
  'East Pasco career center. Job search, resume help, training programs, veteran services.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.careersourcepascohernando.com/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'CSPH-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'FSH-001-food-pantry-support-services-food',
  'Food Pantry & Support Services',
  'food'::resource_category,
  'food_pantry',
  '{"street":''37240 Lock St'',"city":''Dade City'',"state":''FL'',"zip":''33523''}'::jsonb,
  28.3645,
  -82.1948,
  'onsite'::resource_access_type,
  false,
  '(352) 567-1432',
  NULL,
  'https://fshflorida.wixsite.com/farmworkers-self-hel',
  '{"summary":"Mon-Fri 8 AM-5 PM; Thursday pantry distribution 11 AM-12:30 PM"}'::jsonb,
  'Bilingual English-Spanish nonprofit serving immigrant farmworkers and rural poor in Pasco County. Free food pantry, social services, immigration assistance, ESL classes, teen mentoring, community health/opioid outreach.

Eligibility: Farmworkers, immigrants, low-income residents',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.findhelp.org/farmworkers-self-help,-inc.---fsh--dade-city-fl--support-services/5104820387577856?postal=33576',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'FSH-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'TURN-001-bill-galvano-one-stop-center-other',
  'Bill Galvano One Stop Center',
  'other'::resource_category,
  'day_center',
  '{"street":''701 17th Ave W'',"city":''Bradenton'',"state":''FL'',"zip":''34205''}'::jsonb,
  27.4989,
  -82.5748,
  'onsite'::resource_access_type,
  false,
  '(941) 747-1509',
  NULL,
  'https://tpmanatee.org/',
  '{}'::jsonb,
  'Comprehensive one-stop service center for homeless and at-risk individuals in Manatee County. Day resource services (showers, laundry, clothing, food), free medical/dental clinic, employment services, housing assistance, veteran services, rental/utility assistance.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://tpmanatee.org/our-new-name-is-turning-points/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'TURN-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'HOPE-MAN-001-domestic-violence-shelter-24hour-hotline-shelter',
  'Domestic Violence Shelter & 24-Hour Hotline',
  'shelter'::resource_category,
  'domestic_violence_shelter',
  '{"street":'''',"city":''Bradenton'',"state":''FL'',"zip":''34206''}'::jsonb,
  NULL,
  NULL,
  'confidential_address'::resource_access_type,
  false,
  '(941) 747-8499',
  NULL,
  'https://www.hopefamilyservice.org/',
  '{"summary":"24-hour hotline (941) 755-6805; outreach office hours by phone"}'::jsonb,
  'Manatee County''s state-certified domestic violence center. 24-hour helpline 941-755-6805, confidential emergency shelter, individual/group counseling, children''s program, legal advocacy, economic justice services, Hope Chest resale shop.

Eligibility: Survivors of domestic violence',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.myfloridalegal.com/vicitm-services-providers/hope-family-services-inc',
  'confidential_no_map'
FROM providers p
WHERE p.external_id = 'HOPE-MAN-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'MOWM-001-food-bank-of-manatee-food',
  'Food Bank of Manatee',
  'food'::resource_category,
  'food_bank',
  '{"street":''811 23rd Ave E'',"city":''Bradenton'',"state":''FL'',"zip":''34208''}'::jsonb,
  27.4989,
  -82.5748,
  'onsite'::resource_access_type,
  false,
  '(941) 747-4655',
  NULL,
  'https://mealsonwheelsplus.org/food-bank-of-manatee/',
  '{"summary":"Mon-Fri business hours; food distributions vary"}'::jsonb,
  'Largest hunger-relief organization based in Manatee County and the only food bank in the county. Supports 100+ partner agencies and food pantries. Mobile produce pantry, emergency family food crisis boxes, baby basket program.',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://mealsonwheelsplus.org/food-bank-of-manatee/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'MOWM-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'CSC-001-manatee-career-center-work_exchange',
  'Manatee Career Center',
  'work_exchange'::resource_category,
  'career_center',
  '{"street":''1112 Manatee Ave E'',"city":''Bradenton'',"state":''FL'',"zip":''34208''}'::jsonb,
  27.4989,
  -82.5748,
  'onsite'::resource_access_type,
  false,
  '(941) 358-4200',
  NULL,
  'https://careersourcesuncoast.com/',
  '{"summary":"Mon-Fri 8:30 AM-5:00 PM"}'::jsonb,
  'Main career center for Manatee County. Job search, resume building, career coaching, training scholarships, veteran services, eLearning. Free.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://careersourcesuncoast.com/contact-us/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'CSC-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'CSC-001-palmetto-career-center-work_exchange',
  'Palmetto Career Center',
  'work_exchange'::resource_category,
  'career_center',
  '{"street":''600 8th Ave W'',"city":''Palmetto'',"state":''FL'',"zip":''34221''}'::jsonb,
  27.5228,
  -82.5765,
  'onsite'::resource_access_type,
  false,
  '(941) 358-4200',
  NULL,
  'https://careersourcesuncoast.com/',
  '{"summary":"Mon-Thu 8 AM-5 PM"}'::jsonb,
  'Satellite career center serving north Manatee County (Palmetto/Ellenton). Same services as main Bradenton center.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://careersourcesuncoast.com/contact-us/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'CSC-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'FSP-001-lake-manatee-state-park-campground-outdoor_space',
  'Lake Manatee State Park – Campground',
  'outdoor_space'::resource_category,
  'campground',
  '{"street":''20007 State Road 64 E'',"city":''Bradenton'',"state":''FL'',"zip":''34212''}'::jsonb,
  27.4989,
  -82.5748,
  'onsite'::resource_access_type,
  false,
  '(941) 741-3028',
  NULL,
  'https://www.floridastateparks.org/parks-and-trails/lake-manatee-state-park',
  '{"summary":"8 AM to sunset; campground year-round"}'::jsonb,
  '556-acre state park on the south shore of Lake Manatee. 54 full-facility campsites across two loops (water+electric, 30-amp), bathhouses with hot showers, dump station. Swimming area, boat ramp, fishing dock, 2.5-mile bike trail.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.floridastateparks.org/parks-and-trails/lake-manatee-state-park',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'FSP-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'MAN-PARKS-001-rye-preserve-primitive-campground-outdoor_space',
  'Rye Preserve – Primitive Campground',
  'outdoor_space'::resource_category,
  'primitive_campground',
  '{"street":''905 Rye Wilderness Trail'',"city":''Parrish'',"state":''FL'',"zip":''34219''}'::jsonb,
  27.5831,
  -82.4307,
  'onsite'::resource_access_type,
  false,
  '(941) 748-4501',
  NULL,
  'https://www.mymanatee.org/departments/natural_resources/preserves/rye',
  '{"summary":"Open daily sunrise to sunset; camping Fri/Sat only Oct-Apr; ranger station Fri/Sat 3-7 PM"}'::jsonb,
  '530-acre preserve on the Upper Manatee River. Tent camping Friday/Saturday nights October–April, first-come-first-served ($20/night). Bath and shower available at Ranger Station. Nature trails, kayak/canoe launch, restrooms, picnic area, playground.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.mymanatee.org/departments/natural_resources/preserves/rye',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'MAN-PARKS-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'MAN-PARKS-001-duette-preserve-primitive-camping-outdoor_space',
  'Duette Preserve – Primitive Camping',
  'outdoor_space'::resource_category,
  'primitive_campground',
  '{"street":''2649 Rawls Rd'',"city":''Duette'',"state":''FL'',"zip":''34219''}'::jsonb,
  27.6617,
  -82.0957,
  'onsite'::resource_access_type,
  false,
  '(941) 776-2295',
  NULL,
  'https://www.mymanatee.org/departments/natural_resources/preserves/duette',
  '{"summary":"Walk-in gates sunrise to sunset; vehicle entry Sat 11:30 AM-2:30 PM; camping Fri/Sat non-hunt weekends"}'::jsonb,
  'Largest preserve in Manatee County (21,000+ acres). Primitive tent camping Friday and Saturday nights during non-hunt weekends. Open grass camping area with bathroom on site (no running water). Call check station Mon-Wed before camping weekend. $20/night + tax.',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.mymanatee.org/departments/natural_resources/preserves/duette',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'MAN-PARKS-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'MAN-PARKS-001-gt-bray-park-outdoor_space',
  'G.T. Bray Park',
  'outdoor_space'::resource_category,
  'day_use_park_with_showers',
  '{"street":''5502 33rd Ave Dr W'',"city":''Bradenton'',"state":''FL'',"zip":''34209''}'::jsonb,
  27.4989,
  -82.5748,
  'onsite'::resource_access_type,
  false,
  '(941) 742-5923',
  NULL,
  'https://www.mymanatee.org/connect/locations/location-details/gt-bray-park',
  '{"summary":"Park sunrise to 11 PM; Rec Center M-Th 5:30 AM-9 PM, Fri 5:30 AM-7 PM, Sat-Sun 7 AM-4 PM"}'::jsonb,
  'Manatee County''s recreational hub. Public restrooms throughout park, locker rooms with shower facilities at the Rec Center (daily-use $3 drop-in fee). 1.25-mile multi-purpose walking trail, dog park, playgrounds, water fountains. Day-use only — no camping.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.mymanatee.org/connect/locations/location-details/g-t-bray-recreation-center',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'MAN-PARKS-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'PASCO-REC-001-crews-lake-wilderness-park-outdoor_space',
  'Crews Lake Wilderness Park',
  'outdoor_space'::resource_category,
  'campground',
  '{"street":''16739 Crews Lake Dr'',"city":''Spring Hill'',"state":''FL'',"zip":''34610''}'::jsonb,
  28.4781,
  -82.5267,
  'onsite'::resource_access_type,
  false,
  '(727) 861-3038',
  NULL,
  'https://www.pascocountyfl.gov/_T22_R83.php',
  '{"summary":"Open dawn to dusk daily"}'::jsonb,
  '113-acre Pasco County wilderness park. 10 primitive tent campsites plus group tent camping area (reservations required via Pasco County Parks). Nature trails, boardwalk, fishing pier, canoe access, observation tower, multiple shelters with restrooms, playgrounds, paved bike path.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.pascocountyfl.gov/_T22_R83.php',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'PASCO-REC-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'PASCO-REC-001-anclote-river-park-outdoor_space',
  'Anclote River Park',
  'outdoor_space'::resource_category,
  'day_use_park_with_restrooms',
  '{"street":''1119 Baillies Bluff Rd'',"city":''Holiday'',"state":''FL'',"zip":''34691''}'::jsonb,
  28.1895,
  -82.7398,
  'onsite'::resource_access_type,
  false,
  '(727) 938-2598',
  NULL,
  'https://www.pascocountyfl.gov/_T22_R51.php',
  '{"summary":"Open 7 days/week sunrise to sunset; boat ramp parking 24/7"}'::jsonb,
  '31-acre Pasco County park at the mouth of the Anclote River. White sand beach with swimming, restrooms, large picnic pavilion, playground, volleyball, horseshoe pits, 6-lane boat ramp, fishing pier. Kayak launch access to Anclote Key Preserve State Park. Day use only — no overnight camping; overnight boat trailer parking allowed.',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.pascocountyfl.gov/_T22_R51.php',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'PASCO-REC-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'DACCO-001-main-campus-outpatient-residential-treatment-medical',
  'Main Campus - Outpatient & Residential Treatment',
  'medical'::resource_category,
  'behavioral_health',
  '{"street":''4422 E Columbus Dr'',"city":''Tampa'',"state":''FL'',"zip":''33605''}'::jsonb,
  27.9506,
  -82.4572,
  'onsite'::resource_access_type,
  false,
  '(813) 384-4000',
  NULL,
  'https://ibishealthcare.org/',
  '{}'::jsonb,
  'One of Florida''s largest community-based behavioral health providers. Outpatient and residential substance use disorder treatment, dual diagnosis, mental health services, medication-assisted treatment, women''s residential, adolescent programs, vocational training, transitional housing. Serves Hillsborough and Polk Counties. Now part of Ibis Healthcare (merger with Gracepoint and Cove).

Eligibility: Adults and adolescents with substance use and/or mental health disorders',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://www.yelp.com/biz/dacco-behavioral-health-tampa',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'DACCO-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'TC-001-main-office-housing-treatment-vocational-services-shelter',
  'Main Office - Housing, Treatment & Vocational Services',
  'shelter'::resource_category,
  'transitional_housing',
  '{"street":''5120 N Nebraska Ave'',"city":''Tampa'',"state":''FL'',"zip":''33603''}'::jsonb,
  27.9506,
  -82.4572,
  'onsite'::resource_access_type,
  false,
  '(813) 238-8557',
  NULL,
  'https://tampacrossroads.com/',
  '{}'::jsonb,
  'Affordable housing, residential and outpatient treatment for substance use and mental health, vocational rehab, employment services. Serves homeless adults, people with disabilities, veterans and military families. Eco-Oaks Apartments affordable housing complex with LEED Platinum certification.',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://tampacrossroads.com/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'TC-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'TC-001-veterans-assistance-center-other',
  'Veterans Assistance Center',
  'other'::resource_category,
  'veteran_support',
  '{"street":''4203 N Nebraska Ave'',"city":''Tampa'',"state":''FL'',"zip":''33603''}'::jsonb,
  27.9506,
  -82.4572,
  'onsite'::resource_access_type,
  false,
  '(813) 238-8557',
  NULL,
  'https://tampacrossroads.com/veterans-assistance-center/',
  '{}'::jsonb,
  'SSVF (Supportive Services for Veteran Families) program. Rental assistance, utility payments, security/utility deposits, moving costs, child care, transportation, case management, employment support, VA & public benefits assistance, housing counseling, legal assistance. Walk-ins and referrals welcome.

Eligibility: Low-income veterans and veteran families at risk of homelessness',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://tampacrossroads.com/veterans-assistance-center/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'TC-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'TC-001-athena-house-female-veterans-transitional-housing-shelter',
  'Athena House - Female Veterans Transitional Housing',
  'shelter'::resource_category,
  'veteran_housing_support',
  '{"street":'''',"city":''Tampa'',"state":''FL'',"zip":''33605''}'::jsonb,
  NULL,
  NULL,
  'confidential_address'::resource_access_type,
  false,
  '(813) 238-8557',
  NULL,
  'https://tampacrossroads.com/athena-house/',
  '{}'::jsonb,
  '16-bed transitional housing program in Ybor City — the first housing program for homeless female veterans in the nation. Up to 24 months of safe, drug/alcohol-free housing with 24-hour supervision. Individual and group counseling, life skills training. Serves female veterans statewide from Miami to Jacksonville.

Eligibility: Homeless female veterans',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://tampacrossroads.com/athena-house/',
  'confidential_no_map'
FROM providers p
WHERE p.external_id = 'TC-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'DAYSTAR-PIN-001-emergency-services-food-clothing-mail-id-rentutility-assistance-other',
  'Emergency Services - Food, Clothing, Mail, ID, Rent/Utility Assistance',
  'other'::resource_category,
  'day_center',
  '{"street":''1055 28th St S'',"city":''St. Petersburg'',"state":''FL'',"zip":''33712''}'::jsonb,
  27.7676,
  -82.6403,
  'onsite'::resource_access_type,
  false,
  '(727) 825-0442',
  NULL,
  'https://daystarlife.org/',
  '{"summary":"Mon-Tue/Thu/Fri 9 AM-3 PM; Wed 1-4 PM"}'::jsonb,
  'Independent Pinellas County social service agency (since 1982; distinct from Hernando Daystar Life Center). Food pantry, clothing, rent/utility assistance, transportation (gas vouchers, bus passes), state ID assistance, mail/email/phone access for homeless, computer lab. ~26,000 families served annually.

Eligibility: Pinellas County residents below federal poverty level',
  'unknown'::availability_status,
  true,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://daystarlife.org/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'DAYSTAR-PIN-001'
ON CONFLICT DO NOTHING;

INSERT INTO resources (
  provider_id, external_id, name, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website, hours_of_operation, description,
  availability_status, walk_ins_accepted, requires_id,
  verification_status, is_active, tags, languages_spoken, photos,
  import_batch_id, source_file, geocode_quality
)
SELECT
  p.id,
  'BOLEY-001-paula-j-hays-building-headquarters-mental-healthhomelessveteran-services-shelter',
  'Paula J. Hays Building - Headquarters & Mental Health/Homeless/Veteran Services',
  'shelter'::resource_category,
  'supportive_housing',
  '{"street":''445 31st St N'',"city":''St. Petersburg'',"state":''FL'',"zip":''33713''}'::jsonb,
  27.7676,
  -82.6403,
  'onsite'::resource_access_type,
  false,
  '(727) 821-4819',
  NULL,
  'https://boleycenters.org/',
  '{}'::jsonb,
  'Private nonprofit serving individuals with mental disabilities, homeless individuals/families, veterans, and youth. Safe Havens (low-barrier shelter for homeless with mental illness/substance use), Permanent Supported Housing, Shelter Plus Care vouchers, HOME vouchers, outpatient counseling, psychiatric care, employment services, veteran housing. Over 50 housing locations and 1,200+ residential beds across Pinellas.

Eligibility: Adults with mental disabilities, homeless, veterans, youth',
  'unknown'::availability_status,
  false,
  false,
  'pending',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'batch4_20260608',
  'https://boleycenters.org/',
  'city_centroid'
FROM providers p
WHERE p.external_id = 'BOLEY-001'
ON CONFLICT DO NOTHING;

COMMIT;
