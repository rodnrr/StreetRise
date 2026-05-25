-- ================================================================
-- StreetRise — Migration 008: Greater Tampa Bay Seed Data
-- Source: StreetRise_Greater_Tampa_Bay_Seed_Workbook_FINAL.xlsx
-- Providers are unclaimed (user_id = NULL) until orgs self-register
-- ================================================================

-- ── Providers ───────────────────────────────────────────────────
INSERT INTO providers (id, user_id, organization_name, contact_name, contact_email, contact_phone, website, verification_status, role)
VALUES
  ('0e6d0a59-18eb-5df4-f147-74f28ec40d7b', NULL, 'CareerSource Tampa Bay', 'CareerSource Tampa Bay', 'contact@careersource_tampa_bay.placeholder', '(813) 930-7400', 'https://careersourcetampabay.com/career-centers/', 'pending', 'provider'),
  ('0a9cbb32-ba12-d451-8439-2465d21195b6', NULL, 'Feeding Tampa Bay - Pinellas County', 'General Information', 'contact@feeding_tampa_bay___pinellas_county.placeholder', '813-254-1190', 'https://feedingtampabay.org/', 'pending', 'provider'),
  ('c41e73f2-ed5f-399b-8c98-a6da61f8491b', NULL, 'Mattie Williams Neighborhood Family Center', 'Need Help Line', 'contact@mattie_williams_neighborhood_family_center.placeholder', '727-797-9723', 'https://mwnfc.org/about-us/contact-us/', 'pending', 'provider'),
  ('a468bb84-c2a7-01a4-13a2-ae3077b463ae', NULL, 'Pinellas Hope (Catholic Charities)', 'Joseph Pondolfino', 'contact@pinellas_hope_(catholic_charities).placeholder', '727-556-6397', 'https://pinellashope.org/contact-2/', 'pending', 'provider'),
  ('078764d7-f68e-d7c3-cc82-4574cb29b078', NULL, 'First Contact / 211 Tampa Bay Cares', 'General Information', 'contact@first_contact___211_tampa_bay_cares.placeholder', '727-442-4077', 'https://211tampabay.org/', 'pending', 'provider'),
  ('d59347d7-7145-bd00-f459-401562ef2cc6', NULL, 'ACTS', 'ACTS', 'contact@acts.placeholder', NULL, 'https://actsfl.org/', 'pending', 'provider'),
  ('795ee7c8-7385-6804-93d6-beba61349274', NULL, 'Cove Community Housing Solutions Center', 'Cove Community Housing Solutions Center', 'contact@cove_community_housing_solutions_center.placeholder', NULL, NULL, 'pending', 'provider'),
  ('cfa6b8de-b852-bc18-0fbb-5313332b3cd0', NULL, 'Mary & Martha House', 'Mary & Martha House', 'contact@mary_and_martha_house.placeholder', NULL, 'https://marymarthahouse.org/', 'pending', 'provider'),
  ('9a2aeb8e-4f90-51b4-555b-fe31d9868a3f', NULL, 'Metropolitan Ministries', 'Metropolitan Ministries', 'contact@metropolitan_ministries.placeholder', '(813) 209-1000', 'https://www.metromin.org/', 'pending', 'provider'),
  ('ced6b29e-d40c-b9e0-70e7-dd54c10279f4', NULL, 'Salvation Army Tampa', 'Salvation Army Tampa', 'contact@salvation_army_tampa.placeholder', '(813) 226-0055', 'https://southernusa.salvationarmy.org/tampa/', 'pending', 'provider'),
  ('71d1eb89-d485-b42f-7031-b39e79c214c0', NULL, 'Feeding Tampa Bay', 'Feeding Tampa Bay', 'contact@feeding_tampa_bay.placeholder', '(813) 254-1190', 'https://feedingtampabay.org/', 'pending', 'provider'),
  ('0c1d8f49-4f1f-7e59-ed04-3dca712df5b8', NULL, 'First Contact', 'First Contact', 'contact@first_contact.placeholder', '211 / (727) 210-4211', 'https://www.firstcontact.org/211-community-resource-connections', 'pending', 'provider'),
  ('d4588dd6-07e4-29b4-5bcf-2e4148864f12', NULL, 'Hope Villages of America', 'Hope Villages of America', 'contact@hope_villages_of_america.placeholder', '(727) 442-4128', 'https://hopevillagesofamerica.org/', 'pending', 'provider'),
  ('fdf9aa2b-f32b-2402-d32f-4361c18d28c9', NULL, 'CASA Pinellas', 'CASA Pinellas', 'contact@casa_pinellas.placeholder', '(727) 895-4912', 'https://www.casapinellas.org/', 'pending', 'provider'),
  ('4ab1be26-30aa-9e33-0f1b-c2d4659304fe', NULL, 'Pinellas Safe Harbor', 'Pinellas Safe Harbor', 'contact@pinellas_safe_harbor.placeholder', '727-464-8058', 'https://www.pinellassheriff.gov/SafeHarbor', 'pending', 'provider'),
  ('d5c4e62c-e284-5799-def4-887ff76cbc11', NULL, 'HEP', 'HEP', 'contact@hep.placeholder', NULL, 'https://www.hepempowers.org/', 'pending', 'provider'),
  ('bdb29aa4-0c18-12ef-a28f-29e89ebdf339', NULL, 'FEAST Food Pantry', 'FEAST Food Pantry', 'contact@feast_food_pantry.placeholder', NULL, 'https://feastfoodpantry.org/', 'pending', 'provider'),
  ('903d328b-010a-3895-8998-798502c43ab0', NULL, 'Feed St. Pete', 'Feed St. Pete', 'contact@feed_st_pete.placeholder', NULL, 'https://feedstpete.org/', 'pending', 'provider'),
  ('fddb09c7-6733-1473-f066-c1e0a7d10e1c', NULL, 'Salvation Army St. Petersburg', 'Salvation Army St. Petersburg', 'stpetersburginfo@uss.salvationarmy.org', '727-822-4954', 'https://stpetersburg.salvationarmyflorida.org/', 'pending', 'provider'),
  ('03ba86fa-fa4d-3644-60a0-9dfbf3cd6cb0', NULL, 'St. Vincent de Paul CARES (Pinellas)', 'Pinellas County Homeless Services', 'homeless@svdp.care', '727-823-2516', 'https://www.svdpsp.org/contact-us/', 'pending', 'provider'),
  ('bb1ac7a3-ceea-f80a-b8ed-106cd8401069', NULL, 'Talbot House', 'General Information', 'contact@talbot_house.placeholder', NULL, 'https://talbothouseministries.com/', 'pending', 'provider'),
  ('c1f7fead-ad48-053f-f1d3-6bff38868f21', NULL, 'CareerSource Polk', 'CareerSource Polk', 'contact@careersource_polk.placeholder', NULL, 'https://www.careersourcepolk.com/', 'pending', 'provider'),
  ('faf8fe73-1dd8-0855-2de9-3fb49ef3172a', NULL, 'Catholic Charities Tampa Hope', 'Catholic Charities Tampa Hope', 'contact@catholic_charities_tampa_hope.placeholder', '(813) 631-4370', 'https://www.ccdosp.org/', 'pending', 'provider'),
  ('b28da9aa-e98c-21f8-1615-5c89bd92ac90', NULL, 'JWB Children''s Services Council of Pinellas', 'JWB Children''s Services Council of Pinellas', 'Communications@jwbpinellas.org', '727-453-5600', 'https://www.jwbpinellas.org/contact/', 'pending', 'provider'),
  ('3f65d55b-e6aa-6f43-764c-93362a371098', NULL, 'RCS Pinellas', 'RCS Pinellas', 'contact@rcs_pinellas.placeholder', '(727) 586-0311', 'https://www.rcspinellas.org/', 'pending', 'provider'),
  ('e7110e8a-0272-8758-1f73-33997049445a', NULL, 'Hillsborough County Parks & Recreation', 'Rick Valdez', 'contact@hillsborough_county_parks_and_recreation.placeholder', '813-744-5595', 'https://hcfl.gov/departments/parks', 'pending', 'provider'),
  ('d287627b-5356-52c1-05e6-bb94cf150b30', NULL, 'Florida State Parks – Tampa Bay', 'Statewide Information Line', 'park.services@dep.state.fl.us', '850-245-2157', 'https://www.floridastateparks.org/', 'pending', 'provider'),
  ('d9f2bf87-8f13-89d1-b5a4-0a93654ade49', NULL, 'Pinellas County Parks & Conservation Resources', 'Parks & Conservation Resources', 'parks@pinellas.gov', '727-582-2100', 'https://pinellas.gov/services/contact-parks-and-conservation-resources/', 'pending', 'provider'),
  ('0f8efc70-b843-8d62-d27f-f28d4d7ac670', NULL, 'Pasco County Parks, Recreation & Natural Resources', 'Keith Wiley', 'prnrquestions@mypasco.net', '813-929-2760', 'https://www.pascocountyfl.gov/services/parks_recreation_and_natural_resources/index.php', 'verified', 'provider'),
  ('b0d57014-08e3-0a13-f081-0f693678f56c', NULL, 'Hernando County Parks & Recreation', 'Hernando County Parks & Recreation', 'parksandrec@hernandocounty.us', '(352) 754-4031', 'https://www.hernandocounty.us/community-recreation/parks-recreation/', 'pending', 'provider')
ON CONFLICT (id) DO NOTHING;

-- ── Resources ───────────────────────────────────────────────────
INSERT INTO resources (
  id, provider_id, name, description, category, subcategory,
  address, lat, lng, access_type, is_map_ready,
  phone, email, website,
  availability_status, beds_total, beds_available,
  walk_ins_accepted, requires_id, requires_referral,
  hours_of_operation,
  verification_status, is_active
) VALUES
  ('890d73be-7d43-7a4d-6892-08c9fe8fea83', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Tampa Center', 'Career center offering job search help, career planning, referrals, and workforce services.

Eligibility: Public workforce center; call for program-specific eligibility.', 'work_exchange', 'career_center',
   '{"street": "9215 N Florida Ave", "city": "Tampa", "state": "FL", "zip": "33612"}'::jsonb, 28.05071, -82.451, 'onsite', TRUE,
   '(813) 930-7400', NULL, 'https://careersourcetampabay.com/career-centers/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Mon-Fri 8:00 AM-5:00 PM"}',
   'pending', TRUE),
  ('2a372f59-da90-16c5-5a57-6b42f879b437', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Gulf to Bay Center', 'Pinellas-area career center for job seekers and employers.

Eligibility: Public workforce center; call for program-specific eligibility.', 'work_exchange', 'career_center',
   '{"street": "2312 Gulf to Bay Blvd", "city": "Clearwater", "state": "FL", "zip": "33765"}'::jsonb, 27.97452, -82.74419, 'onsite', TRUE,
   '(727) 524-4344', NULL, 'https://careersourcetampabay.com/career-centers/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Mon-Fri 8:00 AM-5:00 PM"}',
   'pending', TRUE),
  ('ebe097ea-37b9-beb7-1a4f-f903a32df77f', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'St. Petersburg Center', 'South County career center for job search, employer referrals, and workforce support.

Eligibility: Public workforce center; call for program-specific eligibility.', 'work_exchange', 'career_center',
   '{"street": "3420 8th Ave S", "city": "St. Petersburg", "state": "FL", "zip": "33711"}'::jsonb, 27.73884, -82.68845, 'onsite', TRUE,
   '(727) 524-4344', NULL, 'https://careersourcetampabay.com/career-centers/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Mon-Fri 8:00 AM-5:00 PM"}',
   'pending', TRUE),
  ('f4dffc51-0e86-3693-90ac-7278740601b4', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Veteran Services', 'Florida Veterans Support Line and housing support connection for veterans and families.

Eligibility: For veterans and veteran families; SSVF screening via 211/partner referral.', 'work_exchange', 'veteran_employment_support',
   '{"street": "9215 N Florida Ave", "city": "Tampa", "state": "FL", "zip": "33612"}'::jsonb, 28.05071, -82.451, 'onsite', TRUE,
   '1-844-693-5838 / 211', 'admin@firstcontact.org', 'https://www.firstcontact.org/veteran-services',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{"summary": "Hotline and 211 access available 24/7"}',
   'pending', TRUE),
  ('fb618b27-7ec4-b797-148b-8bb2d92d0f1a', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Support Services', 'Supportive workforce services including guidance, transportation help, family assistance, and related referrals.

Eligibility: Program availability varies by need and eligibility.', 'work_exchange', 'employment_support_services',
   '{"street": "9215 N Florida Ave", "city": "Tampa", "state": "FL", "zip": "33612"}'::jsonb, 28.05071, -82.451, 'onsite', TRUE,
   '(813) 930-7400', NULL, 'https://careersourcetampabay.com/support-services/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Contact any center Mon-Fri 8:00 AM-5:00 PM"}',
   'pending', TRUE),
  ('8f4cd6ce-bb48-7461-4633-afc2a7dd510d', '0a9cbb32-ba12-d451-8439-2465d21195b6', 'Feeding Pinellas Empowerment Center - Neighbor Services', 'Neighbor services and resource navigation for food assistance, SNAP, and related benefits support.

Eligibility: Walk-ins first come, first served; Friday by appointment.', 'food', 'food_assistance_navigation',
   '{"street": "6330 54th Ave N", "city": "St. Petersburg", "state": "FL", "zip": "33709"}'::jsonb, 27.81721, -82.73075, 'onsite', TRUE,
   '813.710.6269', 'feedingpinellas@feedingtampabay.org', 'https://feedingtampabay.org/feeding-pinellas/feeding-pinellas-empowerment-center',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Mon/Wed 1:00 PM-4:00 PM; Tue/Thu 9:00 AM-4:00 PM; Fri by appointment"}',
   'pending', TRUE),
  ('7dd7012c-13dd-7279-a35a-a430ae278bae', '0a9cbb32-ba12-d451-8439-2465d21195b6', 'Trinity Cafe at Feeding Pinellas', 'Free full-service meal site at Feeding Pinellas.

Eligibility: Walk-in meal service per public page.', 'food', 'free_meal',
   '{"street": "6330 54th Ave N", "city": "St. Petersburg", "state": "FL", "zip": "33709"}'::jsonb, 27.81721, -82.73075, 'onsite', TRUE,
   '813.710.6269', 'feedingpinellas@feedingtampabay.org', 'https://ftb.org/trinity',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Mon-Fri 11:30 AM-12:30 PM"}',
   'pending', TRUE),
  ('a565b064-5e94-0c5f-3221-3ba52e495bbc', 'c41e73f2-ed5f-399b-8c98-a6da61f8491b', 'Food Pantry', 'Weekly food pantry with curbside distribution; TEFAP distribution monthly for eligible households.

Eligibility: No referral needed; registration required; service area limited to listed north Pinellas ZIP codes.', 'food', 'food_pantry',
   '{"street": "1003 Dr. Martin Luther King Jr. St N", "city": "Safety Harbor", "state": "FL", "zip": "34695"}'::jsonb, 28.013464, -82.692276, 'onsite', TRUE,
   '(727) 791-8255', NULL, 'https://mwnfc.org/services/food-pantry/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   '{"summary": "Thu 9:00 AM-11:00 AM and 5:00 PM-6:00 PM"}',
   'pending', TRUE),
  ('fa5f7cb1-0e21-cbe6-fc38-a8b045c567a4', 'c41e73f2-ed5f-399b-8c98-a6da61f8491b', 'Family Support Services', 'One-on-one family support including utility assistance, food stamp and Medicaid help, tax help, notary, and job readiness/career exploration.

Eligibility: Registration required; service area limited to listed north Pinellas ZIP codes.', 'other', 'family_support',
   '{"street": "1003 Dr. Martin Luther King Jr. St N", "city": "Safety Harbor", "state": "FL", "zip": "34695"}'::jsonb, 28.013464, -82.692276, 'onsite', TRUE,
   '(727) 791-8255', NULL, 'https://mwnfc.org/need-help/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Center hours: Mon-Wed 8:30 AM-5:00 PM; Thu 8:30 AM-6:00 PM; Fri 8:30 AM-Noon"}',
   'pending', TRUE),
  ('d2b48ffd-4758-2233-fec1-68c549ab239c', 'a468bb84-c2a7-01a4-13a2-ae3077b463ae', 'Emergency Shelter', 'Temporary emergency shelter campus serving homeless adults, with meals, transportation, case management, and support services.

Eligibility: Intake is facilitated by community outreach teams and conducted weekly.', 'shelter', 'emergency_shelter',
   '{"street": "5726 126th Avenue N", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '(727) 556-6397', NULL, 'https://pinellashope.org/emergency-shelter/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{"summary": "Intake facilitated by outreach teams; contact main office"}',
   'pending', TRUE),
  ('e14640a3-e1e1-dd2b-4cd5-eabd78420a8d', 'a468bb84-c2a7-01a4-13a2-ae3077b463ae', 'Permanent Supportive Housing', 'Income-based permanent supportive housing for formerly homeless adults, including veteran-designated units.

Eligibility: Qualifying income-based housing; not a walk-in shelter service.', 'shelter', 'permanent_supportive_housing',
   '{"street": "5726 126th Avenue N", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '(727) 709-6713', NULL, 'https://pinellashope.org/permanent-supportive-housing/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{"summary": "Contact program for availability and eligibility"}',
   'pending', TRUE),
  ('4aaeda57-053d-ebfd-f76e-adc025411544', 'a468bb84-c2a7-01a4-13a2-ae3077b463ae', 'Medical Respite Program', 'Ten-bed recuperative care program for people discharged from BayCare hospitals with no home to return to.

Eligibility: Referrals must come from BayCare Health System in Pinellas County.', 'medical', 'medical_respite',
   '{"street": "5726 126th Avenue N", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '(813) 295-1561', NULL, 'https://pinellashope.org/pinellas-hope-respite-services/',
   'unknown', 10, NULL,
   FALSE, FALSE, TRUE,
   '{"summary": "Referral-based program; contact coordinator"}',
   'pending', TRUE),
  ('418058fb-ce07-227d-3265-e7489d78df26', '078764d7-f68e-d7c3-cc82-4574cb29b078', '211 Community Resource Connections', '24/7 information and referral service connecting people to local government and nonprofit programs.

Eligibility: No referral needed.', 'other', 'information_and_referral',
   '{"street": "13921 Icot Blvd Suite 700", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '211 / (727) 210-4211', 'admin@firstcontact.org', 'https://www.firstcontact.org/211-community-resource-connections',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{"summary": "Call 211 anytime 24/7; chat Mon-Fri 9:00 AM-3:00 PM"}',
   'pending', TRUE),
  ('3f723628-48ea-0511-9ca0-290be7ec4f47', '078764d7-f68e-d7c3-cc82-4574cb29b078', 'Homeless Helpline', 'Helpline staffed by specialists who screen and connect people to the homeless response system and housing pathways.

Eligibility: For people literally homeless, at imminent risk, or at risk of homelessness.', 'shelter', 'homeless_helpline',
   '{"street": "13921 Icot Blvd Suite 700", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '211 / (727) 210-4211', 'admin@firstcontact.org', 'https://www.firstcontact.org/homeless-helpline',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{"summary": "Call 211 anytime 24/7"}',
   'pending', TRUE),
  ('a1437bc5-c07e-ba73-e495-43e8e42d6a2e', '078764d7-f68e-d7c3-cc82-4574cb29b078', 'Veteran Services', 'Florida Veterans Support Line plus SSVF screening and connection support for homeless veterans and families.

Eligibility: For veterans and veteran families; program screening required for housing components.', 'other', 'veteran_support_line',
   '{"street": "13921 Icot Blvd Suite 700", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '1-844-693-5838 / 211', 'admin@firstcontact.org', 'https://www.firstcontact.org/veteran-services',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{"summary": "Call hotline or 211 anytime 24/7"}',
   'pending', TRUE),
  ('6687d9b0-28f2-98a9-08e6-d57182169d39', '078764d7-f68e-d7c3-cc82-4574cb29b078', 'Pinellas Rapid Re-Housing Collaborative', 'Rapid rehousing support for individuals and families with minor children through coordinated-entry referral pathways.

Eligibility: Referrals only from the Pinellas HLA Housing Prioritization Master List.', 'shelter', 'rapid_rehousing',
   '{"street": "13921 Icot Blvd Suite 700", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '211 / (727) 210-4211', 'admin@firstcontact.org', 'https://www.firstcontact.org/pinellas-rapid-re-housing-collaborative',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{"summary": "Call 211 for screening / referral pathway"}',
   'pending', TRUE),
  ('7e0470b5-e43b-c200-aacc-1c2159ed6667', 'd59347d7-7145-bd00-f459-401562ef2cc6', 'Emergency Shelter / Temporary Housing', 'Emergency shelter / temporary housing candidate identified from public shelter listings.

Eligibility: Confirm intake rules and program naming before import.', 'shelter', 'emergency_shelter',
   '{"street": "4403 W Dr. Martin Luther King Jr Blvd", "city": "Tampa", "state": "FL", "zip": "33614"}'::jsonb, 28.00619, -82.50598, 'onsite', TRUE,
   NULL, NULL, 'https://actsfl.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('04f3fd94-623b-9469-932d-db39c0d843c5', '795ee7c8-7385-6804-93d6-beba61349274', 'Emergency Shelter / Temporary Housing', 'Emergency shelter / temporary housing candidate identified from county shelter listings.

Eligibility: Needs official site or intake page confirmation.', 'shelter', 'emergency_shelter',
   '{"street": "3630 N 50th St", "city": "Tampa", "state": "FL", "zip": "33619"}'::jsonb, 27.93536, -82.37841, 'onsite', TRUE,
   NULL, NULL, NULL,
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('fd2e73c1-e68a-34f5-188c-ba14ce781af6', 'cfa6b8de-b852-bc18-0fbb-5313332b3cd0', 'Shelter for Women and Children', 'Shelter and housing support for women and children.

Eligibility: Confidential location; use intake phone/web process instead of map address.', 'shelter', 'women_children_shelter',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'confidential_address', FALSE,
   NULL, NULL, 'https://marymarthahouse.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('0f7c1dc1-b590-e71e-2adb-68f068cf9f4d', '9a2aeb8e-4f90-51b4-555b-fe31d9868a3f', 'Emergency Shelter / Temporary Housing', 'Emergency shelter and homeless-support campus candidate.

Eligibility: Verify exact public-facing program label before import.', 'shelter', 'emergency_shelter',
   '{"street": "2301 N Tampa St", "city": "Tampa", "state": "FL", "zip": "33602"}'::jsonb, 27.9614, -82.4597, 'onsite', TRUE,
   '(813) 209-1000', NULL, 'https://www.metromin.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('d6c949e9-47c9-e825-0432-e1102c29ad30', 'ced6b29e-d40c-b9e0-70e7-dd54c10279f4', 'Red Shield Center', 'Shelter / support center candidate.

Eligibility: Confirm public intake workflow and exact program title.', 'shelter', 'emergency_shelter',
   '{"street": "1514 N Florida Ave", "city": "Tampa", "state": "FL", "zip": "33602"}'::jsonb, 27.9614, -82.4597, 'onsite', TRUE,
   '(813) 226-0055', NULL, 'https://southernusa.salvationarmy.org/tampa/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('244021b0-2b36-f908-16d9-c613d1627371', 'ced6b29e-d40c-b9e0-70e7-dd54c10279f4', 'Recuperative Care Program', 'Medical recuperative care candidate associated with Tampa Salvation Army campus.

Eligibility: Confirm whether this should live as a separate map card or notes under shelter provider.', 'medical', 'recuperative_care',
   '{"street": "1603 N Florida Ave", "city": "Tampa", "state": "FL", "zip": "33602"}'::jsonb, 27.9614, -82.4597, 'onsite', TRUE,
   '(813) 226-0055', NULL, 'https://southernusa.salvationarmy.org/tampa/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('bc60b960-47d5-395e-ad49-0bc019369646', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Brandon Center', 'Career center serving East Tampa / Brandon area job seekers and employers.

Eligibility: Public workforce center; confirm hours from official center directory.', 'work_exchange', 'career_center',
   '{"street": "6302 E Dr. Martin Luther King Jr Blvd, Suite 120", "city": "Tampa", "state": "FL", "zip": "33619"}'::jsonb, 27.93536, -82.37841, 'onsite', TRUE,
   NULL, NULL, 'https://careersourcetampabay.com/career-centers/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('46a6bbb2-eec7-6f0b-f0c3-ab4f94675dbe', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Ruskin Center', 'Career center serving South Hillsborough job seekers and employers.

Eligibility: Public workforce center; confirm hours from official center directory.', 'work_exchange', 'career_center',
   '{"street": "201 14th Ave SE", "city": "Ruskin", "state": "FL", "zip": "33570"}'::jsonb, 27.69354, -82.45861, 'onsite', TRUE,
   NULL, NULL, 'https://careersourcetampabay.com/career-centers/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('932e44ec-1965-0e37-c127-f5554b4e8130', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Plant City Center', 'Career center serving East Hillsborough / Plant City job seekers.

Eligibility: Public workforce center; confirm hours from official center directory.', 'work_exchange', 'career_center',
   '{"street": "307 N Michigan Ave", "city": "Plant City", "state": "FL", "zip": "33563"}'::jsonb, 28.01694, -82.12544, 'onsite', TRUE,
   NULL, NULL, 'https://careersourcetampabay.com/career-centers/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('e3cbc8a2-6e7a-043b-6ff1-64b68db130c8', '71d1eb89-d485-b42f-7031-b39e79c214c0', 'Trinity Cafe Nebraska', 'Free meal site under Feeding Tampa Bay Trinity Cafe program.

Eligibility: Verify site-specific hours before import.', 'food', 'free_meal',
   '{"street": "2801 N Nebraska Ave", "city": "Tampa", "state": "FL", "zip": "33602"}'::jsonb, 27.9614, -82.4597, 'onsite', TRUE,
   '(813) 254-1190', NULL, 'https://feedingtampabay.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('527b13bc-0d20-4d5f-c609-a4b1ec66708b', '71d1eb89-d485-b42f-7031-b39e79c214c0', 'Bistro at Causeway Center', 'Community meal / food access site at Causeway Center.

Eligibility: Verify site-specific hours and whether this is still active as a separate listing.', 'food', 'free_meal',
   '{"street": "3624 Causeway Blvd", "city": "Tampa", "state": "FL", "zip": "33619"}'::jsonb, 27.93536, -82.37841, 'onsite', TRUE,
   '(813) 254-1190', NULL, 'https://feedingtampabay.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('91407f33-0b6b-79b9-26f7-7c525d72d01f', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Tarpon Springs Center', 'Career center serving North Pinellas job seekers.

Eligibility: Public workforce center; confirm hours from official center directory.', 'work_exchange', 'career_center',
   '{"street": "682 E Klosterman Rd", "city": "Tarpon Springs", "state": "FL", "zip": "34689"}'::jsonb, 28.14971, -82.75956, 'onsite', TRUE,
   NULL, NULL, 'https://careersourcetampabay.com/career-centers/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('600d1c48-b4f5-e5d7-faa7-ed80b024798c', '0c1d8f49-4f1f-7e59-ed04-3dca712df5b8', 'Homeless Helpline', 'Homeless helpline and coordinated entry support for Pinellas and surrounding area.

Eligibility: Phone/web intake only; not a map-ready physical site.', 'other', 'homeless_helpline',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '211 / (727) 210-4211', NULL, 'https://www.firstcontact.org/homeless-helpline',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('dea419e8-7aae-572a-3e0b-c7dcb44eef2b', '0c1d8f49-4f1f-7e59-ed04-3dca712df5b8', 'Veteran Services', 'Veteran support / referral services candidate under First Contact resource network.

Eligibility: Program details should be confirmed on official site before public import.', 'other', 'veteran_support',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '211 / (727) 210-4211', NULL, 'https://www.firstcontact.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('950a5db8-c1c5-765f-25c8-389c3c6e642b', '0c1d8f49-4f1f-7e59-ed04-3dca712df5b8', 'Pinellas Rapid Re-Housing Collaborative', 'Rapid re-housing support / coordinated entry candidate.

Eligibility: Support program rather than public walk-in site; confirm intake details.', 'other', 'housing_support',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '211 / (727) 210-4211', NULL, 'https://www.firstcontact.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('4b01fdc7-18dd-a148-0502-c6c5fada9591', 'd4588dd6-07e4-29b4-5bcf-2e4148864f12', 'The Haven Emergency Safe House', 'Emergency safe house and crisis shelter candidate.

Eligibility: Confidential location; use hotline listing rather than public address.', 'shelter', 'domestic_violence_shelter',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'confidential_address', FALSE,
   '(727) 442-4128', NULL, 'https://hopevillagesofamerica.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{"summary": "24/7 hotline / intake"}',
   'pending', TRUE),
  ('928b12dd-0477-ae69-cbda-4accc1039441', 'd4588dd6-07e4-29b4-5bcf-2e4148864f12', 'Outreach Center', 'Outreach / support services candidate for survivors and families.

Eligibility: Needs official location confirmation before mapping.', 'other', 'outreach_center',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '(727) 442-4128', NULL, 'https://hopevillagesofamerica.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('db112435-25f5-6a13-0d1b-bfe2e802a8e1', 'd4588dd6-07e4-29b4-5bcf-2e4148864f12', 'Food Distribution and Basic Needs', 'Food distribution and basic-needs support candidate.

Eligibility: Confirm exact suite / intake details from official provider pages.', 'food', 'food_assistance',
   '{"street": "700 Druid Rd", "city": "Clearwater", "state": "FL", "zip": "33756"}'::jsonb, 27.94421, -82.79216, 'onsite', TRUE,
   '(727) 442-4128', NULL, 'https://hopevillagesofamerica.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('e003dd13-d878-92f5-4a81-4d5d31a6c042', 'd4588dd6-07e4-29b4-5bcf-2e4148864f12', 'Housing Stability Services', 'Housing stability support candidate.

Eligibility: Support services row; verify walk-in vs referral intake.', 'other', 'housing_support',
   '{"street": "1552 S Myrtle Ave", "city": "Clearwater", "state": "FL", "zip": "33756"}'::jsonb, 27.94421, -82.79216, 'onsite', TRUE,
   '(727) 442-4128', NULL, 'https://hopevillagesofamerica.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('81d91bdb-0045-e1cd-aa4c-f4730be9a65b', 'd4588dd6-07e4-29b4-5bcf-2e4148864f12', 'Express Center', 'Express center / family services candidate.

Eligibility: Needs official program page confirmation.', 'other', 'express_center',
   '{"street": "1520 N Saturn Ave", "city": "Clearwater", "state": "FL", "zip": "33755"}'::jsonb, 27.979046, -82.78302, 'onsite', TRUE,
   '(727) 442-4128', NULL, 'https://hopevillagesofamerica.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('e599a9d6-84dc-5b0f-68ca-db260075146f', 'fdf9aa2b-f32b-2402-d32f-4361c18d28c9', 'Domestic Violence Shelter and Support Services', 'Domestic violence support, advocacy, and shelter-related services.

Eligibility: Use public support office only; do not expose confidential shelter location.', 'shelter', 'domestic_violence_support',
   '{"street": "1011 First Ave N, 2nd Floor", "city": "St. Petersburg", "state": "FL", "zip": "33705"}'::jsonb, 27.74337, -82.643724, 'onsite', TRUE,
   '(727) 895-4912', NULL, 'https://www.casapinellas.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('bc47e9f1-7abf-b46d-9209-f1419706e930', '4ab1be26-30aa-9e33-0f1b-c2d4659304fe', 'Emergency Shelter / Jail Diversion', 'Emergency shelter and jail-diversion support candidate.

Eligibility: County-operated intake resource; public page should be checked for mappable address.', 'shelter', 'emergency_shelter',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '(727) 464-8058', NULL, 'https://pinellas.gov/pinellas-safe-harbor/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('1d5c790d-42a3-fd16-8cca-52be66a9241d', 'a468bb84-c2a7-01a4-13a2-ae3077b463ae', 'Emergency Shelter', 'Large shelter campus serving adults experiencing homelessness.

Eligibility: Public campus listing; confirm any sub-program split during import.', 'shelter', 'emergency_shelter',
   '{"street": "5726 126th Ave N", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '(727) 556-6397', NULL, 'https://pinellashope.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('f3858022-989d-dc41-bc02-a13992dbc83e', 'a468bb84-c2a7-01a4-13a2-ae3077b463ae', 'Medical Respite Program', 'Medical respite support at Pinellas Hope campus.

Eligibility: Public page states a 10-bed respite service; real-time availability should remain unknown.', 'medical', 'medical_respite',
   '{"street": "5726 126th Ave N", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '(727) 556-6397', NULL, 'https://pinellashope.org/pinellas-hope-respite-services/',
   'unknown', 10, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('50bffc46-0685-e42a-74e2-fde440ce0790', 'a468bb84-c2a7-01a4-13a2-ae3077b463ae', 'Adult Education and Job Readiness', 'On-site education and job-readiness candidate.

Eligibility: Treat as a services listing tied to shelter campus until program page is located.', 'work_exchange', 'job_readiness',
   '{"street": "5726 126th Ave N", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '(727) 556-6397', NULL, 'https://pinellashope.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('56e3f25c-efe0-5b91-fea6-6a1aeb4355a0', 'a468bb84-c2a7-01a4-13a2-ae3077b463ae', 'Permanent Supportive Housing', 'Permanent supportive housing and housing-placement candidate.

Eligibility: Supportive housing may be better represented as a support listing, not a map bed listing.', 'other', 'permanent_supportive_housing',
   '{"street": "5726 126th Ave N", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '(727) 556-6397', NULL, 'https://pinellashope.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('4b281112-5ba4-da3f-7275-fdbf42bb52d1', 'd5c4e62c-e284-5799-def4-887ff76cbc11', 'Homeless Shelter and Support Campus', 'Shelter and service campus for people experiencing homelessness.

Eligibility: Confirm main intake phone and public campus naming before import.', 'shelter', 'emergency_shelter',
   '{"street": "1120 N Betty Ln", "city": "Clearwater", "state": "FL", "zip": "33755"}'::jsonb, 27.979046, -82.78302, 'onsite', TRUE,
   NULL, NULL, 'https://www.hepempowers.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('9dbb735f-2abc-b2d7-cbae-0d4629094b35', 'd5c4e62c-e284-5799-def4-887ff76cbc11', 'Veterans-Focused Shelter and Housing Support', 'Veteran-focused housing and support candidate at HEP campus.

Eligibility: May be better as a sub-service row under HEP if not separately marketed.', 'shelter', 'veteran_housing_support',
   '{"street": "1120 N Betty Ln", "city": "Clearwater", "state": "FL", "zip": "33755"}'::jsonb, 27.979046, -82.78302, 'onsite', TRUE,
   NULL, NULL, 'https://www.hepempowers.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('e214506d-b827-6cc0-f5d6-314b4161856b', 'bdb29aa4-0c18-12ef-a28f-29e89ebdf339', 'Drive-Up Pantry', 'Drive-up pantry candidate providing grocery assistance.

Eligibility: Confirm schedule and intake rules from official site.', 'food', 'food_pantry',
   '{"street": "2255 Nebraska Ave", "city": "Palm Harbor", "state": "FL", "zip": "34683"}'::jsonb, 28.08626, -82.76025, 'onsite', TRUE,
   NULL, NULL, 'https://feastfoodpantry.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('f9c33104-0717-58f3-f908-57def3314511', '903d328b-010a-3895-8998-798502c43ab0', 'Weekly Food Distribution', 'Weekly food distribution candidate.

Eligibility: Confirm distribution schedule and any registration requirements.', 'food', 'food_distribution',
   '{"street": "5501 31st St S", "city": "St. Petersburg", "state": "FL", "zip": "33712"}'::jsonb, 27.73719, -82.66535, 'onsite', TRUE,
   NULL, NULL, 'https://feedstpete.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('d23d3973-7161-2a5b-2ccf-57326da0f9b4', 'fddb09c7-6733-1473-f066-c1e0a7d10e1c', 'Emergency Shelter', 'Emergency shelter candidate listed in county shelter resources.

Eligibility: Needs official provider page or public address confirmation.', 'shelter', 'emergency_shelter',
   '{"city": "St. Petersburg", "state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '(727) 822-4954', NULL, NULL,
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('94590d15-aa3c-1254-f447-3cf7e76ce56f', '03ba86fa-fa4d-3644-60a0-9dfbf3cd6cb0', 'CARE Center', 'CARE Center candidate providing homeless services and support.

Eligibility: Public campus / service-center style listing.', 'shelter', 'service_center',
   '{"street": "384 15th St N", "city": "St. Petersburg", "state": "FL", "zip": "33705"}'::jsonb, 27.74337, -82.643724, 'onsite', TRUE,
   '(727) 823-2516', 'homeless@svdp.care', 'https://www.svdpsp.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('0d9d5dcb-ead9-9906-978b-1f5da41fb049', '03ba86fa-fa4d-3644-60a0-9dfbf3cd6cb0', 'Center of Hope', 'Center of Hope program candidate.

Eligibility: Confirm whether this is a separate listing from CARE Center or a sub-program.', 'shelter', 'supportive_services',
   '{"street": "384 15th St N", "city": "St. Petersburg", "state": "FL", "zip": "33705"}'::jsonb, 27.74337, -82.643724, 'onsite', TRUE,
   '(727) 823-2516', 'homeless@svdp.care', 'https://www.svdpsp.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('664455f0-8302-c079-5d8e-55ab5a7b0514', '03ba86fa-fa4d-3644-60a0-9dfbf3cd6cb0', 'Food Center / Community Meals / Pantry', 'Food-support candidate associated with St. Vincent campus.

Eligibility: Confirm if food services are open to the public as a separate listing.', 'food', 'food_pantry',
   '{"street": "384 15th St N", "city": "St. Petersburg", "state": "FL", "zip": "33705"}'::jsonb, 27.74337, -82.643724, 'onsite', TRUE,
   '(727) 823-2516', NULL, 'https://www.svdpsp.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('b3461e3a-2bff-3128-38b4-95c9c9187038', '03ba86fa-fa4d-3644-60a0-9dfbf3cd6cb0', 'Day Center / Showers / Storage Access', 'Day-center style candidate with hygiene / storage supports.

Eligibility: Verify public-facing access and naming.', 'other', 'day_center',
   '{"street": "384 15th St N", "city": "St. Petersburg", "state": "FL", "zip": "33705"}'::jsonb, 27.74337, -82.643724, 'onsite', TRUE,
   '(727) 823-2516', NULL, 'https://www.svdpsp.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('360a04b2-73d7-e54b-3610-efc02afdad4e', '0c1d8f49-4f1f-7e59-ed04-3dca712df5b8', '211 Community Resource Connections', '211-based resource navigation and referral support.

Eligibility: Phone/text/web intake listing, not a map location.', 'other', 'resource_navigation',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '211', NULL, 'https://www.firstcontact.org/211-tampa-bay-cares',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('31881767-4ab3-87b6-5851-aa14aef9889f', 'fdf9aa2b-f32b-2402-d32f-4361c18d28c9', 'Hotline / Crisis Support', 'Hotline and crisis support resource.

Eligibility: Support listing only; not a physical site listing.', 'other', 'crisis_hotline',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '(727) 895-4912', NULL, 'https://www.casapinellas.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{"summary": "24/7 hotline / intake"}',
   'pending', TRUE),
  ('dcd508e9-0833-173b-d0e1-087679e5e986', 'd4588dd6-07e4-29b4-5bcf-2e4148864f12', 'Emergency Safe House Intake', 'Emergency safe-house intake and crisis support.

Eligibility: Support listing only; do not expose confidential location.', 'other', 'hotline_intake',
   '{"state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '(727) 442-4128', NULL, 'https://hopevillagesofamerica.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{"summary": "24/7 hotline / intake"}',
   'pending', TRUE),
  ('3ca02f1d-9837-2439-7f16-085f0281c696', 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069', 'Main Shelter / Basic-Needs Campus', 'Main shelter and basic-needs campus candidate.

Eligibility: Confirm public intake phone and campus naming before import.', 'shelter', 'emergency_shelter',
   '{"street": "814 N Kentucky Ave", "city": "Lakeland", "state": "FL", "zip": "33801"}'::jsonb, 28.042681, -81.906626, 'onsite', TRUE,
   NULL, NULL, 'https://talbothouse.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('f23c508e-61f4-ac05-1e94-dce6d0ce47b2', 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069', 'Food Pantry', 'Food pantry and grocery assistance candidate.

Eligibility: Confirm pantry schedule from official site.', 'food', 'food_pantry',
   '{"street": "814 N Kentucky Ave", "city": "Lakeland", "state": "FL", "zip": "33801"}'::jsonb, 28.042681, -81.906626, 'onsite', TRUE,
   NULL, NULL, 'https://talbothouse.org/food-services/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('b8ad3949-19cb-ab57-375e-75ea07bc9ede', 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069', 'Daily Meals Program', 'Daily meals / food services candidate.

Eligibility: Confirm current meal times before import.', 'food', 'free_meal',
   '{"street": "814 N Kentucky Ave", "city": "Lakeland", "state": "FL", "zip": "33801"}'::jsonb, 28.042681, -81.906626, 'onsite', TRUE,
   NULL, NULL, 'https://talbothouse.org/food-services/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('b6559fc5-7b87-1e3b-789e-58d8cfc71251', 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069', 'Center for Women and Children', 'Shelter and supportive housing candidate for women and children.

Eligibility: Confirm public-facing intake details.', 'shelter', 'women_children_shelter',
   '{"street": "320 MLK Blvd NW", "city": "Winter Haven", "state": "FL", "zip": "33881"}'::jsonb, 28.05439, -81.70081, 'onsite', TRUE,
   NULL, NULL, 'https://talbothouse.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('14a9d0d4-58fd-afba-2b01-261d15bf3eb4', 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069', 'Good Samaritan Free Clinic', 'Free clinic / medical support candidate.

Eligibility: Confirm clinic hours and whether separate intake applies.', 'medical', 'free_clinic',
   '{"street": "814 N Kentucky Ave", "city": "Lakeland", "state": "FL", "zip": "33801"}'::jsonb, 28.042681, -81.906626, 'onsite', TRUE,
   NULL, NULL, 'https://talbothouse.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('21ab7228-3eb8-2574-690c-6415b482ab3d', 'bb1ac7a3-ceea-f80a-b8ed-106cd8401069', 'Affordable Housing / Rehousing Referrals', 'Affordable housing and rehousing referrals candidate.

Eligibility: Support program; not necessarily a mappable address.', 'other', 'housing_support',
   '{"city": "Polk County", "state": "FL"}'::jsonb, NULL, NULL, 'web_intake', FALSE,
   NULL, NULL, 'https://talbothouse.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('2c5f9b83-41af-9726-b526-e5ebdba5cedf', 'c1f7fead-ad48-053f-f1d3-6bff38868f21', 'Lakeland Career Center', 'Career center for Polk job seekers and employers.

Eligibility: Confirm hours and main contact from official site.', 'work_exchange', 'career_center',
   '{"street": "309 N Ingraham Ave", "city": "Lakeland", "state": "FL", "zip": "33801"}'::jsonb, 28.042681, -81.906626, 'onsite', TRUE,
   NULL, NULL, 'https://www.careersourcepolk.com/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('17caed9e-a1da-7dfe-3038-6c8da4eda001', 'c1f7fead-ad48-053f-f1d3-6bff38868f21', 'Haines City Satellite Office', 'Satellite career center serving Haines City / East Polk.

Eligibility: Confirm hours and office naming from official site.', 'work_exchange', 'career_center',
   '{"street": "915 Avenue E", "city": "Haines City", "state": "FL", "zip": "33844"}'::jsonb, 28.099, -81.616, 'onsite', TRUE,
   NULL, NULL, 'https://www.careersourcepolk.com/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('1992d5ae-b465-3de0-e265-8339328b650c', 'faf8fe73-1dd8-0855-2de9-3fb49ef3172a', 'Emergency Shelter / Temporary Housing', 'Emergency shelter / temporary housing candidate identified from public contact references.

Eligibility: Needs official shelter program page and public address confirmation.', 'shelter', 'emergency_shelter',
   '{"city": "Tampa", "state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '(813) 631-4370', NULL, 'https://www.ccdosp.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('1a3889e3-cc20-5d28-26ee-7bdc485af387', 'b28da9aa-e98c-21f8-1615-5c89bd92ac90', 'Youth / Family Support Navigation', 'Youth and family support / referral candidate.

Eligibility: Better as support row unless a specific public-facing site or program location is chosen.', 'other', 'family_support',
   '{"city": "Clearwater", "state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '(727) 547-5670', NULL, 'https://jwbpinellas.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{}',
   'pending', TRUE),
  ('1240ccac-02e4-a9fe-325b-ba701d586cd8', '3f65d55b-e6aa-6f43-764c-93362a371098', 'Food Pantry / Assistance', 'Food and family assistance candidate.

Eligibility: Needs public site location confirmation before map import.', 'food', 'food_pantry',
   '{"city": "Pinellas Park", "state": "FL"}'::jsonb, NULL, NULL, 'phone_intake', FALSE,
   '(727) 586-0311', NULL, 'https://www.rcspinellas.org/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('87da09b2-6494-f593-5dca-62bd62c4ca2a', 'e7110e8a-0272-8758-1f73-33997049445a', 'E.G. Simmons Conservation Park', 'County conservation park on Tampa Bay with 110 RV/tent campsites (2 primitive). Restrooms: confirmed (public restrooms at campground and park). Showers: confirmed (hot and cold shower houses). Camping: confirmed – RV/tent, $24/night; 55+ $18/night; 65+/resident $12/night; online reservations available. Overnight parking: allowed for registered campers only. Day-use fee $2/vehicle.

Eligibility: Open to public. Camping requires registration/payment. Age 55+ and 65+ resident discounts available.', 'outdoor_space', 'campground',
   '{"street": "2401 19th Ave NW", "city": "Ruskin", "state": "FL", "zip": "33570"}'::jsonb, 27.7399, -82.4661, 'onsite', TRUE,
   '(813) 671-7655', NULL, 'https://hcfl.gov/locations/eg-simmons-conservation-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Dawn to dusk (day use); camping check-in 3 PM, checkout 11 AM"}',
   'pending', TRUE),
  ('c129fb7c-ba59-d4c6-e181-955645a05e23', 'e7110e8a-0272-8758-1f73-33997049445a', 'Edward Medard Conservation Park', 'Conservation park with 700-acre reservoir and 43 RV/tent campsites. Restrooms: confirmed (public restrooms at campground). Showers: confirmed (showers at campground). Camping: confirmed – RV/tent $24/night; 55+ $18; 65+/resident $12; online reservations. Equestrian/hiking trails also available. Overnight parking: for registered campers only.

Eligibility: Open to public. Day-use fee $2/vehicle; $5 boat launch. Camping requires registration/payment.', 'outdoor_space', 'campground',
   '{"street": "6140 Turkey Creek Rd", "city": "Plant City", "state": "FL", "zip": "33567"}'::jsonb, 27.9036, -82.0497, 'onsite', TRUE,
   '(813) 757-3802', NULL, 'https://hcfl.gov/locations/edward-medard-conservation-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Spring/Summer 8 AM–7 PM; Fall/Winter 8 AM–6 PM; camping check-in 3 PM checkout 11 AM"}',
   'pending', TRUE),
  ('ab9f8e4d-7151-7e52-521b-474a7fe31b9b', 'e7110e8a-0272-8758-1f73-33997049445a', 'Lithia Springs Conservation Park', 'Conservation park on Alafia River with natural spring swimming and 45 RV/tent campsites. Restrooms: confirmed (at campground). Showers: confirmed (water/shower services at campsites per official page). Camping: confirmed – RV/tent/primitive $24/night; 55+ $18; 65+/resident $12; youth group camping also available. No reservations – first-come first-served (call ahead for availability). Overnight parking: for registered campers only.

Eligibility: Open to public. Day-use $2/vehicle; swimming fee $2/person. No advance reservations – first-come, first-served.', 'outdoor_space', 'campground',
   '{"street": "3932 Lithia Springs Rd", "city": "Lithia", "state": "FL", "zip": "33547"}'::jsonb, 27.8649, -82.2274, 'onsite', TRUE,
   '(813) 744-5572', NULL, 'https://hcfl.gov/locations/lithia-springs-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Dawn to dusk (day use); camping check-in and checkout per park rules"}',
   'pending', TRUE),
  ('a1ae2f60-2934-882d-c471-5502da3c5eb5', 'e7110e8a-0272-8758-1f73-33997049445a', 'Alderman''s Ford Conservation Park – Primitive Campground', 'Conservation park with primitive hike-in tent camping. Restrooms: confirmed – restroom facility located approximately 0.5 mile from campsites (no showers). Showers: NOT available at campsites. Camping: confirmed – 4 primitive tent-only sites, $2/person minimum $12; hike-in 1–1.5 miles; no water or electricity at sites; must pack out all trash. Youth group camping also available (2 sites). Overnight parking: NOT applicable – sites are hike-in only; vehicles park at trailhead during the day.

Eligibility: Open to public. Reservations required – call (813) 757-3801. No day-use fee. No vehicle overnight parking.', 'outdoor_space', 'primitive_campground',
   '{"street": "100 Alderman''s Ford Park Dr", "city": "Lithia", "state": "FL", "zip": "33547"}'::jsonb, 27.8671, -82.1381, 'onsite', TRUE,
   '(813) 757-3801', NULL, 'https://hcfl.gov/locations/aldermans-ford-conservation-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Park open Spring/Summer 8 AM–7 PM; Fall/Winter 8 AM–6 PM"}',
   'pending', TRUE),
  ('ad304c99-b165-5f64-f96f-4e22559fe4af', 'e7110e8a-0272-8758-1f73-33997049445a', 'Alafia River Corridor Nature Preserve – Primitive Camping', 'Nature preserve with free primitive tent-only camping. Restrooms: confirmed – at trailhead/day-use area per Florida Hikes verified source. Showers: NOT available. Camping: confirmed – 3 primitive campsites (Otter 2.5 mi, Hawk 2.2 mi, Bobcat 1 mi from trailhead); hike-in required; no water or electricity; FREE; reservations required at least 14 days in advance. Overnight parking: NOT applicable – hike-in sites only, vehicles park at trailhead.

Eligibility: Free camping; reservations required at least 14 days in advance via online form or call (813) 672-7876 Mon–Fri 8 AM–4 PM.', 'outdoor_space', 'primitive_campground',
   '{"street": "9256 S County Rd 39", "city": "Plant City", "state": "FL", "zip": "33567"}'::jsonb, 27.8712, -82.1357, 'onsite', TRUE,
   '(813) 672-7876', NULL, 'https://hcfl.gov/locations/alafia-river-corridor-nature-preserve-north',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open sunrise to sunset"}',
   'pending', TRUE),
  ('4e21d61a-2630-cf5a-3aaf-f6867c1a4ffb', 'd287627b-5356-52c1-05e6-bb94cf150b30', 'Hillsborough River State Park – Campground', 'Florida State Park with 112-site RV/tent campground plus primitive group camping. Restrooms: confirmed – each campground loop has restrooms with flush toilets. Showers: confirmed – hot showers (coin-operated) in each campground loop restroom building. Camping: confirmed – RV/tent $24/night (most sites have 30/50 amp electric + water); primitive group camping (tent only, no electric, cold showers) for youth/nonprofit orgs; advance reservations via ReserveAmerica (up to 11 months). Also pool, cafe, gift shop, laundry, dump station. Overnight parking: for registered campers only.

Eligibility: Open to public. Camping reservations at Reserve.FloridaStateParks.org or 1-800-326-3521. State park entry fee applies.', 'outdoor_space', 'campground',
   '{"street": "15402 US 301 N", "city": "Thonotosassa", "state": "FL", "zip": "33592"}'::jsonb, 28.1489, -82.2302, 'onsite', TRUE,
   '(813) 688-9500', NULL, 'https://www.floridastateparks.org/parks-and-trails/hillsborough-river-state-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Park open 8 AM to sunset daily; campground office hours vary"}',
   'pending', TRUE),
  ('25a002c0-4b98-b044-7153-76ff27f2893f', 'd9f2bf87-8f13-89d1-b5a4-0a93654ade49', 'Fort De Soto Park – Campground', 'Pinellas County regional park on Tampa Bay with 236-site campground. Restrooms: confirmed – 7 restroom buildings in campground. Showers: confirmed – modern showers in campground restrooms. Camping: confirmed – RV/tent; all sites have water, electric (20/30/50 amp), picnic table, charcoal grill; $33.90–$45.77/night; advance reservations required (6 months for non-residents, 7 months for Pinellas residents). Also primitive youth camping area (up to 90 people, tent only, nonprofit groups with FL tax exemption cert required). Laundry, dump stations, camp store, WiFi at camp office. Overnight parking: at Fort De Soto boat ramp only (boat ramp pass/fee required; no vehicle storage).

Eligibility: Open to public; campground requires advance reservation. Pinellas residents get 7-month advance booking window; non-residents 6 months. Maximum stay 14 days.', 'outdoor_space', 'campground',
   '{"street": "3500 Pinellas Bayway S", "city": "Tierra Verde", "state": "FL", "zip": "33715"}'::jsonb, 27.6253, -82.7302, 'onsite', TRUE,
   '(727) 582-2100', 'parks@pinellas.gov', 'https://pinellas.gov/camping-information/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Camp office: 9 AM–6 PM daily (Fri 9 AM–9 PM); phone 8 AM–5 PM Mon–Fri"}',
   'pending', TRUE),
  ('9100c835-9074-fcfc-522e-771086a6e6fa', '0f8efc70-b843-8d62-d27f-f28d4d7ac670', 'Jay B. Starkey Wilderness Park – Campground & Cabins', 'Regional wilderness park (8,300+ acres) with tent camping, primitive cabins, and backcountry sites. Restrooms: confirmed – four restrooms in day-use areas; bathhouse in campground area. Showers: confirmed – campground has restroom/shower bathhouse (showers noted as refreshing but not hot per visitor reports; cold/tepid). Camping: confirmed – 16 tent sites ($15/night), 8 rustic cabins ($50/night, bunk beds, electricity, no plumbing), 3 primitive backcountry hike-in sites ($10/night); reservations up to 30 days in advance. No RVs. No pets in campground or cabins. Also 10-mile equestrian trail with corral and horse trailer parking. Overnight parking: for registered campers at campground parking area.

Eligibility: Open to public; free admission. Camping reservations required online or by phone. Must be 21+ to reserve. No domestic animals in camping area.', 'outdoor_space', 'campground',
   '{"street": "10500 Wilderness Park Blvd", "city": "New Port Richey", "state": "FL", "zip": "34655"}'::jsonb, 28.2554, -82.643, 'onsite', TRUE,
   '(727) 834-3247', NULL, 'https://www.pascocountyfl.gov/_T22_R85.php',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open dawn to dusk (day use); camping by reservation"}',
   'pending', TRUE),
  ('d17f1ca4-0ced-4d02-51e0-92886437d72f', '0f8efc70-b843-8d62-d27f-f28d4d7ac670', 'Withlacoochee River Park – Campground & Cabins', 'County wilderness park (406 acres) on the Withlacoochee River with RV/tent camping, cabins, and primitive backcountry site. Restrooms: confirmed – at several trailheads and in camping area. Showers: confirmed – restroom and shower building in campground (noted as limited: 1 stall each men/women, 1 shower each per visitor reports). Camping: confirmed – RV/tent sites with restroom/shower access; 2 rustic cabins (sleep 4–6, AC, electricity; no pets in cabins); 1 primitive backcountry hike-in site ($10/night, compost toilet nearby, no showers); tent/RV site fees apply (call park for rates). Must be 21+ to reserve. No pets in camping area. Overnight parking: for registered campers only.

Eligibility: Open to public. Camping reservations required; call (352) 567-0264. Must be 21+ to reserve. No pets in camping area or cabins.', 'outdoor_space', 'campground',
   '{"street": "12449 Withlacoochee Blvd", "city": "Dade City", "state": "FL", "zip": "33525"}'::jsonb, 28.3446, -82.1198, 'onsite', TRUE,
   '(352) 567-0264', NULL, 'https://fl-pascocounty.civicplus.com/303/Withlacoochee-River-Park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open dawn to dusk daily"}',
   'pending', TRUE),
  ('33091038-b396-41bb-fe6c-649528c09a3a', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Rogers Park', 'Day-use county park on the Weeki Wachee River. Restrooms: confirmed. Showers: confirmed – rinsing showers available (outdoor showers at beach/swim area). Camping: NOT allowed – Hernando County parks are day-use only; no camping confirmed. Overnight parking: NOT allowed – day-use only. Features: boat ramp, canoe launch, swimming area, observation deck, playground, barbecue grills, volleyball court, picnic tables, shelter.

Eligibility: Open to public, no fee noted. Day-use only. No lifeguards on duty.', 'outdoor_space', 'day_use_park_with_showers',
   '{"street": "7244 Shoal Line Blvd", "city": "Spring Hill", "state": "FL", "zip": "34607"}'::jsonb, 28.5355, -82.639, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/rogers-park/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "8 AM to sunset"}',
   'pending', TRUE),
  ('0d2a9e88-6d2c-1b5a-3594-3cea3b166b97', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Linda Pedersen Park at Jenkins Creek', 'County park (135 acres) on Jenkins Creek connected to Gulf. Restrooms: confirmed. Showers: confirmed – showers available at swim/beach area. Camping: NOT allowed – day-use only; Hernando County ESL preserves prohibit overnight camping. Overnight parking: NOT allowed. Features: grills, picnic tables, 3 pavilions for rent, swimming area, playground, community building, observation tower, kayak/canoe launch, boardwalk to Jenkins Creek Park across street.

Eligibility: Open to public. 3 pavilions available for rent. Day-use only. No lifeguards on duty.', 'outdoor_space', 'day_use_park_with_showers',
   '{"street": "6300 Shoal Line Blvd", "city": "Spring Hill", "state": "FL", "zip": "34607"}'::jsonb, 28.5237, -82.6363, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/linda-pedersen-park-at-jenkins-creek/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "8 AM to sunset"}',
   'pending', TRUE),
  ('51702811-51c9-1063-e323-dc902e840c13', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Bayport Park', 'County park (7 acres) on Gulf of Mexico with two boat ramps. Restrooms: confirmed – renovated restrooms on site (note: restrooms reported as temporarily closed for repairs per recent visitor reviews; verify current status). Showers: NOT confirmed – no showers documented in official sources. Camping: NOT allowed – day-use only. Overnight parking: overnight boat ramp parking allowed with proper fee/daily receipt or annual permit (Pinellas County FAQ cross-referenced; Hernando County specific policy uncertain – mark for review). Features: fishing pier, 2 boat ramps, scenic boardwalk, pavilion, picnic tables, barbecue grills, parking fee applies.

Eligibility: Open to public. Parking fee applies. Day-use only; overnight camping not allowed.', 'outdoor_space', 'day_use_park_with_restrooms',
   '{"street": "4140 Cortez Blvd", "city": "Spring Hill", "state": "FL", "zip": "34607"}'::jsonb, 28.5339, -82.6501, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/bayport-park/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open 24/7 (boat ramp); park generally 8 AM–6 PM"}',
   'pending', TRUE),
  ('bd17b832-938e-61f7-01ea-ab4cb8cfbe99', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Lake Townsen Regional Park', 'Regional park (375 acres) on Withlacoochee River with multi-use trails. Restrooms: confirmed – public restrooms on site (restroom closure for upgrades reported July 2024; should be resolved). Showers: NOT confirmed – no showers documented in official sources. Camping: NOT allowed – day-use only; ESL preserves prohibit overnight camping per official Hernando County policy. Overnight parking: uncertain – park listed as open 24/7 but overnight camping/parking not explicitly permitted; flagged for manual review. Features: fishing pier, boat ramp on Withlacoochee River, baseball, basketball, volleyball, horseshoes, horse trailer parking, equestrian trails, picnic pavilions, playground, Withlacoochee State Trail access.

Eligibility: Open to public. Day-use only confirmed. No fee noted. Equestrian use welcome (horse trailer parking, trails).', 'outdoor_space', 'day_use_park_with_restrooms',
   '{"street": "28011 Lake Lindsey Rd", "city": "Brooksville", "state": "FL", "zip": "34601"}'::jsonb, 28.6481, -82.1731, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/lake-townsen-regional-park/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open 24/7"}',
   'pending', TRUE),
  ('31d051f4-7e4b-c1ee-15b4-781c78f8cb15', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Jenkins Creek Park', 'Day-use county park (3 acres) on Jenkins Creek adjacent to Linda Pedersen Park. Restrooms: confirmed – restrooms on site. Showers: NOT confirmed – no showers documented in official sources; park description does not mention showers. Camping: NOT allowed – day-use only. Overnight parking: NOT allowed. Features: fishing pier (~420 ft), boat launch (small boats/hand launch only), picnic shelters, bird watching, grill.

Eligibility: Open to public. Day-use only. No lifeguards on duty.', 'outdoor_space', 'day_use_park_with_restrooms',
   '{"street": "6401 Shoal Line Blvd", "city": "Spring Hill", "state": "FL", "zip": "34607"}'::jsonb, 28.5222, -82.6369, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/jenkins-creek-park/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "8 AM to sunset"}',
   'pending', TRUE),
  ('befc1916-fdaf-3293-83d0-2131a9f0a363', 'c41e73f2-ed5f-399b-8c98-a6da61f8491b', 'Food Pantry', 'Weekly food pantry with curbside distribution; TEFAP distribution monthly for eligible households.

Eligibility: No referral needed; registration required; service area limited to listed north Pinellas ZIP codes.', 'food', 'food_pantry',
   '{"street": "1003 Dr Martin Luther King Jr St N", "city": "Safety Harbor", "state": "FL", "zip": "34695"}'::jsonb, 28.013464, -82.692276, 'onsite', TRUE,
   '(727) 791-8255', NULL, 'https://mwnfc.org/services/food-pantry/',
   'unknown', NULL, NULL,
   TRUE, TRUE, FALSE,
   '{"summary": "Thu 9:00 AM-11:00 AM and 5:00 PM-6:00 PM"}',
   'pending', TRUE),
  ('758de634-34ac-cf4c-afe4-f6c6d836f83e', 'c41e73f2-ed5f-399b-8c98-a6da61f8491b', 'Family Support Services', 'One-on-one family support including utility assistance, food stamp and Medicaid help, tax help, notary, and job readiness/career exploration.

Eligibility: Registration required; service area limited to listed north Pinellas ZIP codes.', 'other', 'family_support',
   '{"street": "1003 Dr Martin Luther King Jr St N", "city": "Safety Harbor", "state": "FL", "zip": "34695"}'::jsonb, 28.013464, -82.692276, 'onsite', TRUE,
   '(727) 791-8255', NULL, 'https://mwnfc.org/need-help/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Center hours: Mon-Wed 8:30 AM-5:00 PM; Thu 8:30 AM-6:00 PM; Fri 8:30 AM-Noon"}',
   'pending', TRUE),
  ('4128aecd-a04d-d57b-1be1-ad08cd823d96', 'a468bb84-c2a7-01a4-13a2-ae3077b463ae', 'Permanent Supportive Housing', 'Income-based permanent supportive housing for formerly homeless adults, including veteran-designated units.

Eligibility: Qualifying income-based housing; not a walk-in shelter service.', 'shelter', 'permanent_supportive_housing',
   '{"street": "5726 126th Ave N", "city": "Clearwater", "state": "FL", "zip": "33760"}'::jsonb, 27.90535, -82.71389, 'onsite', TRUE,
   '(727) 709-6713', NULL, 'https://pinellashope.org/permanent-supportive-housing/',
   'unknown', NULL, NULL,
   FALSE, FALSE, TRUE,
   '{"summary": "Contact program for availability and eligibility"}',
   'pending', TRUE),
  ('670fd134-62c3-adb4-1ee9-73421324fcf8', 'd59347d7-7145-bd00-f459-401562ef2cc6', 'Emergency Shelter / Temporary Housing', 'Emergency shelter / temporary housing candidate identified from public shelter listings.

Eligibility: Confirm intake rules and program naming before import.', 'shelter', 'emergency_shelter',
   '{"street": "4403 W Dr Martin Luther King Jr Blvd", "city": "Tampa", "state": "FL", "zip": "33614"}'::jsonb, 28.00619, -82.50598, 'onsite', TRUE,
   NULL, NULL, 'https://actsfl.org/',
   'unknown', NULL, NULL,
   FALSE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('f0766bd7-8e47-69cc-c089-c9651543aa42', '0e6d0a59-18eb-5df4-f147-74f28ec40d7b', 'Brandon Center', 'Career center serving East Tampa / Brandon area job seekers and employers.

Eligibility: Public workforce center; confirm hours from official center directory.', 'work_exchange', 'career_center',
   '{"street": "6302 E Dr Martin Luther King Jr Blvd, Suite 120", "city": "Tampa", "state": "FL", "zip": "33619"}'::jsonb, 27.93536, -82.37841, 'onsite', TRUE,
   NULL, NULL, 'https://careersourcetampabay.com/career-centers/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('855c3504-59cc-9878-1961-9c14d6d78eda', 'c1f7fead-ad48-053f-f1d3-6bff38868f21', 'Haines City Satellite Office', 'Satellite career center serving Haines City / East Polk.

Eligibility: Confirm hours and office naming from official site.', 'work_exchange', 'career_center',
   '{"street": "915 Ave E", "city": "Haines City", "state": "FL", "zip": "33844"}'::jsonb, 28.099, -81.616, 'onsite', TRUE,
   NULL, NULL, 'https://www.careersourcepolk.com/',
   'unknown', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{}',
   'pending', TRUE),
  ('a2b6a5a1-206d-e18f-5fac-bbbc960f467a', 'e7110e8a-0272-8758-1f73-33997049445a', 'E.G. Simmons Conservation Park', 'County conservation park on Tampa Bay with 110 RV/tent campsites (2 primitive). Restrooms: confirmed (public restrooms at campground and park). Showers: confirmed (hot and cold shower houses). Camping: confirmed – RV/tent, $24/night; 55+ $18/night; 65+/resident $12/night; online reservations available. Overnight parking: allowed for registered campers only. Day-use fee $2/vehicle.

Eligibility: Open to public. Camping requires registration/payment. Age 55+ and 65+ resident discounts available.', 'outdoor_space', 'campground',
   '{"street": "2401 19th Ave NW", "city": "Ruskin", "state": "FL", "zip": "33570"}'::jsonb, 27.7399, -82.4661, 'onsite', TRUE,
   '(813) 671-7655', NULL, 'https://hcfl.gov/locations/eg-simmons-conservation-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Dawn to dusk (day use); camping check-in 3 PM, checkout 11 AM"}',
   'pending', TRUE),
  ('f77d3d4a-ccba-bfa9-055e-07537fb174ea', 'e7110e8a-0272-8758-1f73-33997049445a', 'Edward Medard Conservation Park', 'Conservation park with 700-acre reservoir and 43 RV/tent campsites. Restrooms: confirmed (public restrooms at campground). Showers: confirmed (showers at campground). Camping: confirmed – RV/tent $24/night; 55+ $18; 65+/resident $12; online reservations. Equestrian/hiking trails also available. Overnight parking: for registered campers only.

Eligibility: Open to public. Day-use fee $2/vehicle; $5 boat launch. Camping requires registration/payment.', 'outdoor_space', 'campground',
   '{"street": "6140 Turkey Creek Rd", "city": "Plant City", "state": "FL", "zip": "33567"}'::jsonb, 27.9036, -82.0497, 'onsite', TRUE,
   '(813) 757-3802', NULL, 'https://hcfl.gov/locations/edward-medard-conservation-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Spring/Summer 8 AM–7 PM; Fall/Winter 8 AM–6 PM; camping check-in 3 PM checkout 11 AM"}',
   'pending', TRUE),
  ('1b15e2d6-89db-5d93-50ef-67d8799b6af8', 'e7110e8a-0272-8758-1f73-33997049445a', 'Lithia Springs Conservation Park', 'Conservation park on Alafia River with natural spring swimming and 45 RV/tent campsites. Restrooms: confirmed (at campground). Showers: confirmed (water/shower services at campsites per official page). Camping: confirmed – RV/tent/primitive $24/night; 55+ $18; 65+/resident $12; youth group camping also available. No reservations – first-come first-served (call ahead for availability). Overnight parking: for registered campers only.

Eligibility: Open to public. Day-use $2/vehicle; swimming fee $2/person. No advance reservations – first-come, first-served.', 'outdoor_space', 'campground',
   '{"street": "3932 Lithia Springs Rd", "city": "Lithia", "state": "FL", "zip": "33547"}'::jsonb, 27.8649, -82.2274, 'onsite', TRUE,
   '(813) 744-5572', NULL, 'https://hcfl.gov/locations/lithia-springs-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Dawn to dusk (day use); camping check-in and checkout per park rules"}',
   'pending', TRUE),
  ('c6fe0aaa-94ed-52bc-ca07-1c36bb89f416', 'e7110e8a-0272-8758-1f73-33997049445a', 'Alderman''s Ford Conservation Park – Primitive Campground', 'Conservation park with primitive hike-in tent camping. Restrooms: confirmed – restroom facility located approximately 0.5 mile from campsites (no showers). Showers: NOT available at campsites. Camping: confirmed – 4 primitive tent-only sites, $2/person minimum $12; hike-in 1–1.5 miles; no water or electricity at sites; must pack out all trash. Youth group camping also available (2 sites). Overnight parking: NOT applicable – sites are hike-in only; vehicles park at trailhead during the day.

Eligibility: Open to public. Reservations required – call (813) 757-3801. No day-use fee. No vehicle overnight parking.', 'outdoor_space', 'primitive_campground',
   '{"street": "100 Alderman''s Ford Park Dr", "city": "Lithia", "state": "FL", "zip": "33547"}'::jsonb, 27.8671, -82.1381, 'onsite', TRUE,
   '(813) 757-3801', NULL, 'https://hcfl.gov/locations/aldermans-ford-conservation-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Park open Spring/Summer 8 AM–7 PM; Fall/Winter 8 AM–6 PM"}',
   'pending', TRUE),
  ('5435fc88-282a-ea02-7a0a-ddd5e4450b13', 'e7110e8a-0272-8758-1f73-33997049445a', 'Alafia River Corridor Nature Preserve – Primitive Camping', 'Nature preserve with free primitive tent-only camping. Restrooms: confirmed – at trailhead/day-use area per Florida Hikes verified source. Showers: NOT available. Camping: confirmed – 3 primitive campsites (Otter 2.5 mi, Hawk 2.2 mi, Bobcat 1 mi from trailhead); hike-in required; no water or electricity; FREE; reservations required at least 14 days in advance. Overnight parking: NOT applicable – hike-in sites only, vehicles park at trailhead.

Eligibility: Free camping; reservations required at least 14 days in advance via online form or call (813) 672-7876 Mon–Fri 8 AM–4 PM.', 'outdoor_space', 'primitive_campground',
   '{"street": "9256 S County Rd 39", "city": "Plant City", "state": "FL", "zip": "33567"}'::jsonb, 27.8712, -82.1357, 'onsite', TRUE,
   '(813) 672-7876', NULL, 'https://hcfl.gov/locations/alafia-river-corridor-nature-preserve-north',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open sunrise to sunset"}',
   'pending', TRUE),
  ('dfa2e10a-a2d9-6000-4bcf-8d5730f01a6a', 'd287627b-5356-52c1-05e6-bb94cf150b30', 'Hillsborough River State Park – Campground', 'Florida State Park with 112-site RV/tent campground plus primitive group camping. Restrooms: confirmed – each campground loop has restrooms with flush toilets. Showers: confirmed – hot showers (coin-operated) in each campground loop restroom building. Camping: confirmed – RV/tent $24/night (most sites have 30/50 amp electric + water); primitive group camping (tent only, no electric, cold showers) for youth/nonprofit orgs; advance reservations via ReserveAmerica (up to 11 months). Also pool, cafe, gift shop, laundry, dump station. Overnight parking: for registered campers only.

Eligibility: Open to public. Camping reservations at Reserve.FloridaStateParks.org or 1-800-326-3521. State park entry fee applies.', 'outdoor_space', 'campground',
   '{"street": "15402 US 301 N", "city": "Thonotosassa", "state": "FL", "zip": "33592"}'::jsonb, 28.1489, -82.2302, 'onsite', TRUE,
   '(813) 688-9500', NULL, 'https://www.floridastateparks.org/parks-and-trails/hillsborough-river-state-park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Park open 8 AM to sunset daily; campground office hours vary"}',
   'pending', TRUE),
  ('0e4bd244-2e3b-6af7-3584-b2735b40c5e4', 'd9f2bf87-8f13-89d1-b5a4-0a93654ade49', 'Fort De Soto Park – Campground', 'Pinellas County regional park on Tampa Bay with 236-site campground. Restrooms: confirmed – 7 restroom buildings in campground. Showers: confirmed – modern showers in campground restrooms. Camping: confirmed – RV/tent; all sites have water, electric (20/30/50 amp), picnic table, charcoal grill; $33.90–$45.77/night; advance reservations required (6 months for non-residents, 7 months for Pinellas residents). Also primitive youth camping area (up to 90 people, tent only, nonprofit groups with FL tax exemption cert required). Laundry, dump stations, camp store, WiFi at camp office. Overnight parking: at Fort De Soto boat ramp only (boat ramp pass/fee required; no vehicle storage).

Eligibility: Open to public; campground requires advance reservation. Pinellas residents get 7-month advance booking window; non-residents 6 months. Maximum stay 14 days.', 'outdoor_space', 'campground',
   '{"street": "3500 Pinellas Bayway S", "city": "Tierra Verde", "state": "FL", "zip": "33715"}'::jsonb, 27.6253, -82.7302, 'onsite', TRUE,
   '(727) 582-2100', 'parks@pinellas.gov', 'https://pinellas.gov/camping-information/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Camp office: 9 AM–6 PM daily (Fri 9 AM–9 PM); phone 8 AM–5 PM Mon–Fri"}',
   'pending', TRUE),
  ('9072bca5-ae24-5076-bf38-eabca1f1ef65', '0f8efc70-b843-8d62-d27f-f28d4d7ac670', 'Jay B. Starkey Wilderness Park – Campground & Cabins', 'Regional wilderness park (8,300+ acres) with tent camping, primitive cabins, and backcountry sites. Restrooms: confirmed – four restrooms in day-use areas; bathhouse in campground area. Showers: confirmed – campground has restroom/shower bathhouse (showers noted as refreshing but not hot per visitor reports; cold/tepid). Camping: confirmed – 16 tent sites ($15/night), 8 rustic cabins ($50/night, bunk beds, electricity, no plumbing), 3 primitive backcountry hike-in sites ($10/night); reservations up to 30 days in advance. No RVs. No pets in campground or cabins. Also 10-mile equestrian trail with corral and horse trailer parking. Overnight parking: for registered campers at campground parking area.

Eligibility: Open to public; free admission. Camping reservations required online or by phone. Must be 21+ to reserve. No domestic animals in camping area.', 'outdoor_space', 'campground',
   '{"street": "10500 Wilderness Park Blvd", "city": "New Port Richey", "state": "FL", "zip": "34655"}'::jsonb, 28.2554, -82.643, 'onsite', TRUE,
   '(727) 834-3247', NULL, 'https://www.pascocountyfl.gov/_T22_R85.php',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open dawn to dusk (day use); camping by reservation"}',
   'pending', TRUE),
  ('dbd3d6cf-4919-decf-85d3-7116f191494e', '0f8efc70-b843-8d62-d27f-f28d4d7ac670', 'Withlacoochee River Park – Campground & Cabins', 'County wilderness park (406 acres) on the Withlacoochee River with RV/tent camping, cabins, and primitive backcountry site. Restrooms: confirmed – at several trailheads and in camping area. Showers: confirmed – restroom and shower building in campground (noted as limited: 1 stall each men/women, 1 shower each per visitor reports). Camping: confirmed – RV/tent sites with restroom/shower access; 2 rustic cabins (sleep 4–6, AC, electricity; no pets in cabins); 1 primitive backcountry hike-in site ($10/night, compost toilet nearby, no showers); tent/RV site fees apply (call park for rates). Must be 21+ to reserve. No pets in camping area. Overnight parking: for registered campers only.

Eligibility: Open to public. Camping reservations required; call (352) 567-0264. Must be 21+ to reserve. No pets in camping area or cabins.', 'outdoor_space', 'campground',
   '{"street": "12449 Withlacoochee Blvd", "city": "Dade City", "state": "FL", "zip": "33525"}'::jsonb, 28.3446, -82.1198, 'onsite', TRUE,
   '(352) 567-0264', NULL, 'https://fl-pascocounty.civicplus.com/303/Withlacoochee-River-Park',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open dawn to dusk daily"}',
   'pending', TRUE),
  ('8004f92d-cbe4-9e43-9ebe-9a60a9abbd78', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Rogers Park', 'Day-use county park on the Weeki Wachee River. Restrooms: confirmed. Showers: confirmed – rinsing showers available (outdoor showers at beach/swim area). Camping: NOT allowed – Hernando County parks are day-use only; no camping confirmed. Overnight parking: NOT allowed – day-use only. Features: boat ramp, canoe launch, swimming area, observation deck, playground, barbecue grills, volleyball court, picnic tables, shelter.

Eligibility: Open to public, no fee noted. Day-use only. No lifeguards on duty.', 'outdoor_space', 'day_use_park_with_showers',
   '{"street": "7244 Shoal Line Blvd", "city": "Spring Hill", "state": "FL", "zip": "34607"}'::jsonb, 28.5355, -82.639, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/rogers-park/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "8 AM to sunset"}',
   'pending', TRUE),
  ('b5cb837b-683a-862c-da63-1c0ce1a169f1', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Linda Pedersen Park at Jenkins Creek', 'County park (135 acres) on Jenkins Creek connected to Gulf. Restrooms: confirmed. Showers: confirmed – showers available at swim/beach area. Camping: NOT allowed – day-use only; Hernando County ESL preserves prohibit overnight camping. Overnight parking: NOT allowed. Features: grills, picnic tables, 3 pavilions for rent, swimming area, playground, community building, observation tower, kayak/canoe launch, boardwalk to Jenkins Creek Park across street.

Eligibility: Open to public. 3 pavilions available for rent. Day-use only. No lifeguards on duty.', 'outdoor_space', 'day_use_park_with_showers',
   '{"street": "6300 Shoal Line Blvd", "city": "Spring Hill", "state": "FL", "zip": "34607"}'::jsonb, 28.5237, -82.6363, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/linda-pedersen-park-at-jenkins-creek/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "8 AM to sunset"}',
   'pending', TRUE),
  ('5f5e8fa1-e1f2-beef-9a83-ca3bb10fc295', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Bayport Park', 'County park (7 acres) on Gulf of Mexico with two boat ramps. Restrooms: confirmed – renovated restrooms on site (note: restrooms reported as temporarily closed for repairs per recent visitor reviews; verify current status). Showers: NOT confirmed – no showers documented in official sources. Camping: NOT allowed – day-use only. Overnight parking: overnight boat ramp parking allowed with proper fee/daily receipt or annual permit (Pinellas County FAQ cross-referenced; Hernando County specific policy uncertain – mark for review). Features: fishing pier, 2 boat ramps, scenic boardwalk, pavilion, picnic tables, barbecue grills, parking fee applies.

Eligibility: Open to public. Parking fee applies. Day-use only; overnight camping not allowed.', 'outdoor_space', 'day_use_park_with_restrooms',
   '{"street": "4140 Cortez Blvd", "city": "Spring Hill", "state": "FL", "zip": "34607"}'::jsonb, 28.5339, -82.6501, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/bayport-park/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open 24/7 (boat ramp); park generally 8 AM–6 PM"}',
   'pending', TRUE),
  ('9ebfe89a-e58c-dacc-e122-cd86d127ec9f', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Lake Townsen Regional Park', 'Regional park (375 acres) on Withlacoochee River with multi-use trails. Restrooms: confirmed – public restrooms on site (restroom closure for upgrades reported July 2024; should be resolved). Showers: NOT confirmed – no showers documented in official sources. Camping: NOT allowed – day-use only; ESL preserves prohibit overnight camping per official Hernando County policy. Overnight parking: uncertain – park listed as open 24/7 but overnight camping/parking not explicitly permitted; flagged for manual review. Features: fishing pier, boat ramp on Withlacoochee River, baseball, basketball, volleyball, horseshoes, horse trailer parking, equestrian trails, picnic pavilions, playground, Withlacoochee State Trail access.

Eligibility: Open to public. Day-use only confirmed. No fee noted. Equestrian use welcome (horse trailer parking, trails).', 'outdoor_space', 'day_use_park_with_restrooms',
   '{"street": "28011 Lake Lindsey Rd", "city": "Brooksville", "state": "FL", "zip": "34601"}'::jsonb, 28.6481, -82.1731, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/lake-townsen-regional-park/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "Open 24/7"}',
   'pending', TRUE),
  ('8d5b587c-bcf6-42e7-cc79-76713ea662d8', 'b0d57014-08e3-0a13-f081-0f693678f56c', 'Jenkins Creek Park', 'Day-use county park (3 acres) on Jenkins Creek adjacent to Linda Pedersen Park. Restrooms: confirmed – restrooms on site. Showers: NOT confirmed – no showers documented in official sources; park description does not mention showers. Camping: NOT allowed – day-use only. Overnight parking: NOT allowed. Features: fishing pier (~420 ft), boat launch (small boats/hand launch only), picnic shelters, bird watching, grill.

Eligibility: Open to public. Day-use only. No lifeguards on duty.', 'outdoor_space', 'day_use_park_with_restrooms',
   '{"street": "6401 Shoal Line Blvd", "city": "Spring Hill", "state": "FL", "zip": "34607"}'::jsonb, 28.5222, -82.6369, 'onsite', TRUE,
   '(352) 754-4031', 'parksandrec@hernandocounty.us', 'https://www.hernandocounty.us/community-recreation/parks-recreation/jenkins-creek-park/',
   'available', NULL, NULL,
   TRUE, FALSE, FALSE,
   '{"summary": "8 AM to sunset"}',
   'pending', TRUE)
ON CONFLICT (id) DO NOTHING;