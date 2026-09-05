-- ================================================================
-- StreetRise — Migration 062: regional Florida Second Chance housing expansion
-- Data-only seed. Sources checked 2026-09-05.
--
-- Coverage in this batch:
--   Pasco, Polk, Brevard/Space Coast, Volusia/Daytona,
--   Broward/Fort Lauderdale, and Miami-Dade.
--
-- Hernando was researched in this pass but is intentionally not seeded here:
-- the strongest current candidate (Jubilee Freedom Inc.) exposes a current
-- phone/referral path but its public email is Cloudflare-obfuscated in the
-- available source output. providers.contact_email is public-facing and NOT
-- NULL, so StreetRise will not invent or infer an address to satisfy the DB.
--
-- Second Chance remains a derived search:
--   population_focus contains 'reentry' OR accepts_felony = true.
-- Unknown criminal-history answers remain NULL.
-- ================================================================

-- Providers -------------------------------------------------------
-- Operation New Hope already exists from migration 061 and is reused below.
INSERT INTO providers (
  organization_name, contact_name, contact_email, contact_phone, website,
  verification_status, identity_confirmed, claim_status, source_type,
  external_id, last_imported_at, last_verified_at, verification_notes
)
VALUES
('End Recidivism Project Extreme','Reentry Intake','erprojectextreme@gmail.com','727-807-5998','https://www.erprojectextreme.com/','verified',FALSE,'unclaimed','seeded','housing-provider-er-project-extreme',now(),now(),'Official ER Project site and Florida Senate FY2024-25 funding request checked 2026-09-05. State document confirms Pasco reentry housing stabilization assistance and public contact email.'),
('New Life Outreach Ministry, Inc.','Re-entry Services','newlifeoutreachministryinc@yahoo.com','863-510-5696','https://newlifelakeland.org/','verified',FALSE,'unclaimed','seeded','housing-provider-new-life-lakeland',now(),now(),'Official housing/reentry program pages checked 2026-09-05. Public organization profile was used only to resolve the current email hidden by the official site crawler.'),
('Tri-County Human Services, Inc.','Helping HANDS/HATCH','info@tchsonline.org','863-709-9392','https://tchsonline.org/','verified',FALSE,'unclaimed','seeded','housing-provider-tricounty-hands',now(),now(),'Official Helping HANDS/HATCH, STARR and contact pages checked 2026-09-05.'),
('Second Chance Collective','Housing Support','info@second-chance-collective.org','386-500-1110','https://second-chance-collective.org/','verified',FALSE,'unclaimed','seeded','housing-provider-second-chance-collective',now(),now(),'Official current reentry/housing page checked 2026-09-05.'),
('Foundations to Freedom','Admissions','info@foundationtofreedom.org','386-846-7102','https://www.foundationstofreedom.org/','verified',FALSE,'unclaimed','seeded','housing-provider-foundations-freedom',now(),now(),'Official DeLand halfway-house admissions and eligibility pages checked 2026-09-05.'),
('First Step Shelter, Inc.','Housing Program','info@firststepshelter.org','386-361-3800','https://firststepshelter.org/','verified',FALSE,'unclaimed','seeded','housing-provider-first-step-daytona',now(),now(),'Official current Services & Support, resident and contact pages checked 2026-09-05.'),
('House of Hope','Residential Intake','info@houseofhope.org','954-524-8989','https://houseofhope.org/','verified',FALSE,'unclaimed','seeded','housing-provider-house-of-hope-broward',now(),now(),'Official current residential treatment, criminal-justice and intake pages checked 2026-09-05.'),
('Dismas Charities, Inc.','Dania Beach Reentry Center','info@dismas.com','954-920-6558','https://www.dismas.com/','verified',FALSE,'unclaimed','seeded','housing-provider-dismas-dania',now(),now(),'Official Dismas facility/program pages and Federal Bureau of Prisons RRC directory checked 2026-09-05.'),
('Empowerment Zone Re-entry Initiative','Reentry Navigation','info@ezreentryinitiative.org','305-456-1278','https://ezreentryinitiative.org/','verified',FALSE,'unclaimed','seeded','housing-provider-ezri-miami',now(),now(),'Official current services, impact, Get Help and contact pages checked 2026-09-05. Public Cloudflare-protected email decoded from the provider contact link.'),
('Re-Entry One Inc.','Reentry Support','info@reentryone.org','305-990-4387','https://www.reentryone.org/','verified',FALSE,'unclaimed','seeded','housing-provider-reentry-one-miami',now(),now(),'Official current site plus current Miami community-funding profile checked 2026-09-05.'),
('The Agape Network','Criminal Justice Program','info@theagapenetwork.org','305-235-2616','https://theagapenetwork.org/','verified',FALSE,'unclaimed','seeded','housing-provider-agape-miami',now(),now(),'Official current Criminal Justice, supported housing, referral and contact pages checked 2026-09-05; public organizational email corroborated by current community provider directories.')
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  organization_name=EXCLUDED.organization_name,
  contact_name=EXCLUDED.contact_name,
  contact_email=EXCLUDED.contact_email,
  contact_phone=EXCLUDED.contact_phone,
  website=EXCLUDED.website,
  verification_status=EXCLUDED.verification_status,
  source_type=EXCLUDED.source_type,
  last_imported_at=EXCLUDED.last_imported_at,
  last_verified_at=EXCLUDED.last_verified_at,
  verification_notes=EXCLUDED.verification_notes,
  updated_at=now();

-- Resources -------------------------------------------------------
WITH seed(
  provider_external_id,external_id,name,description,resource_type,address,
  phone,email,website,access_type,requires_referral,requires_id,gender_policy,
  population_focus,confidence_score,verification_notes
) AS (
VALUES
('housing-provider-er-project-extreme','housing-er-project-pasco','End Recidivism Project Extreme — Reentry Housing Stabilization','Reentry housing stabilization for Pasco County residents returning from incarceration. Assistance can include locating safe housing and financial help with rental deposits, first month rent and utility deposits when eligible. This is housing navigation and stabilization support, not a StreetRise-listed residential bed.','housing_navigation','{"street":"7324 State Road 52","city":"Hudson","state":"FL","zip":"34667"}'::jsonb,'727-807-5998','erprojectextreme@gmail.com','https://www.erprojectextreme.com/','phone_intake'::resource_access_type,FALSE,FALSE,'gender_inclusive',ARRAY['reentry']::text[],98::smallint,'Official provider site lists housing among reentry supports. Florida Senate funding request documents housing-search assistance and direct deposit/first-month/utility stabilization for Pasco residents returning from incarceration.'),

('housing-provider-new-life-lakeland','housing-new-life-lakeland-reentry','New Life Outreach Ministry — Prison Re-entry Housing Support','Lakeland reentry program for people recently released from incarceration. Services include housing placement, employment preparation, legal assistance, counseling, peer support and family relationship repair. The ministry separately operates transitional housing; this listing conservatively represents the reentry program as housing placement/support rather than promising a program-owned bed.','housing_navigation','{"street":"1221 Omohondro Ave","city":"Lakeland","state":"FL","zip":"33805"}'::jsonb,'863-510-5696','newlifeoutreachministryinc@yahoo.com','https://newlifelakeland.org/programs','web_intake'::resource_access_type,FALSE,FALSE,'unknown',ARRAY['reentry']::text[],96::smallint,'Official program page identifies a Prison Re-entry Program with housing placement and says eligibility includes recently released people and excludes violent offenses. The provider operates multiple housing units, but the source does not prove every reentry participant receives a provider-owned bed.'),

('housing-provider-tricounty-hands','housing-tricounty-hatch-polk','Tri-County Human Services — Helping HANDS/HATCH Housing Support','Polk County jail-transition housing support for Helping HANDS participants who are homeless or at risk of homelessness. HATCH assesses housing needs, helps identify and obtain permanent or temporary housing, and provides ongoing support to maintain housing.','housing_navigation','{"street":"2026 Crystal Wood Drive","city":"Lakeland","state":"FL","zip":"33801"}'::jsonb,'863-640-0585','info@tchsonline.org','https://tchsonline.org/services/helping-hands-hatch/','phone_intake'::resource_access_type,TRUE,FALSE,'unknown',ARRAY['reentry']::text[],99::smallint,'Official page says Helping HANDS serves Polk County inmates returning from jail and HATCH identifies/obtains housing for enrolled participants. Entry comes through jail or named community partner referrals; participation itself is voluntary.'),

('housing-provider-operation-new-hope','housing-operation-new-hope-space-coast','Operation New Hope — Ready4Work Space Coast Housing Support','Ready4Work Space Coast support for people returning from incarceration in Brevard County. Services include reentry case management, employment support and transitional-housing assistance; current Space Coast material describes up to three months of transitional housing support. This listing does not imply the Cocoa office is a residence.','housing_navigation','{"street":"840 N Cocoa Blvd","suite":"Suites C & D","city":"Cocoa","state":"FL","zip":"32922"}'::jsonb,'321-305-6027','info@operationnewhope.org','https://operationnewhope.org/ready4work-space-coast/','web_intake'::resource_access_type,FALSE,FALSE,'gender_inclusive',ARRAY['reentry']::text[],99::smallint,'Official current Space Coast page and September 2025 location announcement confirm reentry services and transitional housing support. Ready4Work accepts post-release applications directly.'),

('housing-provider-second-chance-collective','housing-second-chance-collective-volusia','Second Chance Collective — Reentry Housing Connections','Volusia and Flagler reentry housing navigation that connects returning citizens and other eligible adults with substance-free sober-living partners and sponsorship support. People returning from prison without family support may qualify for housing sponsorship subject to program requirements.','housing_navigation','{"city":"Volusia County","state":"FL"}'::jsonb,'386-500-1110','info@second-chance-collective.org','https://second-chance-collective.org/','phone_intake'::resource_access_type,FALSE,FALSE,'unknown',ARRAY['reentry']::text[],99::smallint,'Official current site explicitly serves people returning from incarceration and says housing partners are currently in Volusia and Flagler counties. Individuals may contact the program themselves; partner/referral sources are also welcomed.'),

('housing-provider-foundations-freedom','housing-foundations-freedom-deland','Foundations to Freedom — DeLand Recovery Housing','Structured recovery residences in DeLand and surrounding Volusia/Flagler counties for adults rebuilding through abstinence-based recovery, including people transitioning out of correctional institutions. Men, women and parents with children have designated housing options.','recovery_residence','{"city":"DeLand","state":"FL"}'::jsonb,'386-846-7102','info@foundationtofreedom.org','https://www.foundationstofreedom.org/halfway-houses-deland-fl/','web_intake'::resource_access_type,FALSE,FALSE,'gender_inclusive',ARRAY['reentry','substance_recovery']::text[],99::smallint,'Official admissions page explicitly includes transition from a correctional institution, requires abstinence, and excludes histories of violent crimes and registered sex offenders. Residential street addresses are not represented by the administrative-office address.'),

('housing-provider-first-step-daytona','housing-first-step-daytona-record-friendly','First Step Shelter — Low-Barrier Transitional Housing','Referral-based transitional housing program for homeless adults in participating Volusia County communities. First Step explicitly states that criminal history does not matter unless screening identifies a high potential for violence. Residents receive a bed and case management toward permanent housing.','transitional_housing','{"street":"3889 W International Speedway Blvd","city":"Daytona Beach","state":"FL","zip":"32124"}'::jsonb,'386-361-3800','info@firststepshelter.org','https://firststepshelter.org/services-support/','web_intake'::resource_access_type,TRUE,FALSE,'gender_inclusive',ARRAY[]::text[],99::smallint,'Official current page calls First Step referral-based, low-barrier transitional housing for men and women 18+ and says criminal history does not matter unless there is a high potential for violence. Partner-city agency referral is mandatory.'),

('housing-provider-house-of-hope-broward','housing-house-of-hope-broward-reentry','House of Hope — Criminal Justice Residential Recovery','Structured residential addiction treatment in Fort Lauderdale for men, including a Criminal Justice program serving accused or adjudicated people referred from the justice system. The provider states that many clients arrive after incarceration and that most are indigent, homeless or coming from correctional facilities.','recovery_residence','{"street":"908 SW 1st Street","city":"Fort Lauderdale","state":"FL","zip":"33312"}'::jsonb,'954-524-8989','intake@houseofhope.org','https://houseofhope.org/intake-screening/','web_intake'::resource_access_type,FALSE,FALSE,'men_only',ARRAY['reentry','substance_recovery']::text[],98::smallint,'Official current provider pages describe a non-secure residential facility and an integrated Criminal Justice program. Public intake screening is available; justice-system referrals are also accepted. Specific felony/violent/sex-offense acceptance is not stated.'),

('housing-provider-dismas-dania','housing-dismas-dania-rrc','Dismas Charities — Dania Beach Residential Reentry Center','Federal residential reentry placement in Dania Beach operated by Dismas Charities for people transitioning from incarceration. This is a correctional reentry placement, not public rental housing or a walk-in shelter.','transitional_housing','{"city":"Dania Beach","state":"FL","zip":"33004"}'::jsonb,'954-920-6558',NULL,'https://www.dismas.com/facilities','phone_intake'::resource_access_type,TRUE,FALSE,'gender_inclusive',ARRAY['reentry']::text[],99::smallint,'Current Dismas facility list confirms Dania Beach operation and local phone. Federal Bureau of Prisons RRC directory independently lists Dismas Charities in Dania, FL. Placement is controlled through federal corrections/reentry processes.'),

('housing-provider-ezri-miami','housing-ezri-miami-navigation','EZRI — Reentry Housing Navigation','Miami-Dade reentry navigation for justice-impacted people and returning citizens. Services include housing navigation, case management, warm handoffs to community partners, transportation support and basic-resource assistance. The Overtown office is a service location, not a residence.','housing_navigation','{"street":"243 NW 8th St","city":"Miami","state":"FL","zip":"33136"}'::jsonb,'305-456-1278','info@ezreentryinitiative.org','https://ezreentryinitiative.org/services/','web_intake'::resource_access_type,FALSE,FALSE,'gender_inclusive',ARRAY['reentry']::text[],99::smallint,'Official current impact/services pages identify justice-impacted people and returning citizens throughout Miami-Dade and explicitly list housing navigation. Public Get Help form includes housing as a requested service.'),

('housing-provider-reentry-one-miami','housing-reentry-one-miami-navigation','Re-Entry One — Returning Citizen Housing Support','Miami-Dade wraparound reentry support for returning citizens, including help with housing and connections to community programs. Current service-area information includes Miami, Liberty City/Brownsville, Little Haiti, Miami Gardens and Opa-locka. This listing represents housing support/navigation, not a provider-owned bed.','housing_navigation','{"street":"2 S Biscayne Blvd","suite":"Suite 3200","city":"Miami","state":"FL","zip":"33131"}'::jsonb,'305-990-4387','info@reentryone.org','https://www.reentryone.org/','web_intake'::resource_access_type,FALSE,FALSE,'gender_inclusive',ARRAY['reentry']::text[],98::smallint,'Official site says the organization assists returning citizens with housing and offers a reentry-service application. Current Miami community profile corroborates housing as a core support area and countywide neighborhood reach.'),

('housing-provider-agape-miami','housing-agape-criminal-justice-navigation','Agape Network — Criminal Justice Housing Support','Reentry case management for justice-involved people in Miami-Dade. Agape Criminal Justice participants receive individualized support addressing housing alongside behavioral health, employment and other reintegration needs. Agape also operates supported housing, but this listing conservatively represents the Criminal Justice program as housing support/navigation rather than promising a supported-housing bed.','housing_navigation','{"street":"22790 SW 112th Ave","city":"Miami","state":"FL","zip":"33170"}'::jsonb,'305-235-2616','info@theagapenetwork.org','https://theagapenetwork.org/services/criminal-justice-program/','web_intake'::resource_access_type,FALSE,FALSE,'unknown',ARRAY['reentry']::text[],97::smallint,'Official current Criminal Justice Program page explicitly serves justice-involved people and says case management addresses housing. Supported Housing is a separate eligibility-based Agape program, so no direct bed is promised here.')
)
INSERT INTO resources (
  provider_id,name,description,category,resource_type,address,phone,email,website,
  availability_status,verification_status,is_active,walk_ins_accepted,requires_id,
  requires_referral,access_type,is_map_ready,gender_policy,population_focus,
  external_id,source_file,import_batch_id,last_imported_at,last_verified_at,
  confidence_score,stale_after_days,verification_notes
)
SELECT p.id,s.name,s.description,'housing'::resource_category,s.resource_type,s.address,
  s.phone,s.email,s.website,'unknown'::availability_status,'verified'::verification_status,
  TRUE,FALSE,s.requires_id,s.requires_referral,s.access_type,FALSE,s.gender_policy,
  s.population_focus,s.external_id,'migration_062','housing_second_chance_062',
  now(),now(),s.confidence_score,30,s.verification_notes
FROM seed s JOIN providers p ON p.external_id=s.provider_external_id
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  provider_id=EXCLUDED.provider_id,name=EXCLUDED.name,description=EXCLUDED.description,
  category=EXCLUDED.category,resource_type=EXCLUDED.resource_type,address=EXCLUDED.address,
  phone=EXCLUDED.phone,email=EXCLUDED.email,website=EXCLUDED.website,
  availability_status=EXCLUDED.availability_status,verification_status=EXCLUDED.verification_status,
  is_active=EXCLUDED.is_active,walk_ins_accepted=EXCLUDED.walk_ins_accepted,
  requires_id=EXCLUDED.requires_id,requires_referral=EXCLUDED.requires_referral,
  access_type=EXCLUDED.access_type,is_map_ready=EXCLUDED.is_map_ready,
  gender_policy=EXCLUDED.gender_policy,population_focus=EXCLUDED.population_focus,
  source_file=EXCLUDED.source_file,import_batch_id=EXCLUDED.import_batch_id,
  last_imported_at=EXCLUDED.last_imported_at,last_verified_at=EXCLUDED.last_verified_at,
  confidence_score=EXCLUDED.confidence_score,stale_after_days=EXCLUDED.stale_after_days,
  verification_notes=EXCLUDED.verification_notes,updated_at=now();

-- Housing details -------------------------------------------------
WITH d(
  external_id,accepts_felony,accepts_violent_offense,accepts_sex_offense,
  requires_sobriety,has_curfew,application_url,intake_phone,eligibility_notes
) AS (
VALUES
('housing-er-project-pasco',NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,'https://www.erprojectextreme.com/','727-807-5998','For Pasco-area returning citizens after incarceration. Housing support may include search/navigation and, subject to program eligibility/funding, deposits, first month rent and utility deposits. Specific offense exclusions are not published.'),
('housing-new-life-lakeland-reentry',NULL::boolean,FALSE,NULL::boolean,NULL::boolean,NULL::boolean,'https://newlifelakeland.org/client-intake-application','863-510-5696','Official Prison Re-entry Program lists recently released people as eligible and states no violent offenses. The intake form asks about sex-offender registration, but the public source does not state a blanket sex-offense exclusion, so that field remains unknown.'),
('housing-tricounty-hatch-polk',NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,'https://tchsonline.org/services/helping-hands-hatch/','863-640-0585','HATCH is for Helping HANDS participants who are homeless or at risk of homelessness. Helping HANDS referrals come from the Polk County jail or listed community partner agencies; participation is voluntary, not court ordered.'),
('housing-operation-new-hope-space-coast',NULL::boolean,NULL::boolean,NULL::boolean,TRUE,NULL::boolean,'https://operationnewhope.org/ready4work-space-coast/','321-305-6027','Ready4Work serves justice-impacted people returning from incarceration. Current program FAQ says clients must remain drug free. Space Coast materials describe transitional housing among wraparound services and current location material describes three months of housing support.'),
('housing-second-chance-collective-volusia',NULL::boolean,NULL::boolean,NULL::boolean,TRUE,NULL::boolean,'https://second-chance-collective.org/','386-500-1110','Adults 18+ must commit to a substance-free lifestyle. Returning citizens are explicitly served. Housing is through sober-living/transitional-housing partners in Volusia and Flagler, with possible sponsorship support.'),
('housing-foundations-freedom-deland',NULL::boolean,FALSE,FALSE,TRUE,TRUE,'https://www.foundationstofreedom.org/halfway-houses-deland-fl/','386-846-7102','Abstinence-based recovery housing. Official admissions page says the homes can serve people transitioning from correctional institutions and explicitly excludes histories of violent crimes and registered sex offenders. Employment, outpatient treatment or daytime service/volunteer activity is required.'),
('housing-first-step-daytona-record-friendly',TRUE,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,'https://firststepshelter.org/services-support/','386-361-3800','Adults 18+ in participating Volusia communities must be referred by a partner-city agency. Provider states criminal history does not matter unless there is a high potential for violence. That risk-based language is not converted into a blanket violent-offense exclusion.'),
('housing-house-of-hope-broward-reentry',NULL::boolean,NULL::boolean,NULL::boolean,TRUE,NULL::boolean,'https://houseofhope.org/intake-screening/','954-524-8989','Residential substance-use treatment for men, including justice-involved clients referred from correctional systems. Public application/intake screening is available. Specific criminal-record exclusions are not stated.'),
('housing-dismas-dania-rrc',NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,'https://www.dismas.com/facilities','954-920-6558','Federal Residential Reentry Center placement in Dania Beach. Not a public rental application or walk-in shelter. Specific offense eligibility is determined through the correctional placement process and is not represented here.'),
('housing-ezri-miami-navigation',NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,'https://ezreentryinitiative.org/get-help/','305-456-1278','Serves justice-impacted people, returning citizens, unhoused people and other high-risk Miami-Dade residents. Housing navigation is explicit; no specific criminal-history exclusions are published.'),
('housing-reentry-one-miami-navigation',NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,'https://www.reentryone.org/basic-01','305-990-4387','Wraparound reentry support for returning citizens, including housing assistance and community connections. Specific offense exclusions are not published.'),
('housing-agape-criminal-justice-navigation',NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,'https://theagapenetwork.org/make-a-referral/','305-235-2616','Criminal Justice Program serves justice-involved people and addresses housing through case management. Direct supported-housing admission requires separate clinical/residential eligibility and is not promised by this navigation listing.')
)
INSERT INTO resource_housing_details (
  resource_id,accepts_felony,accepts_violent_offense,accepts_sex_offense,
  requires_sobriety,has_curfew,application_url,intake_phone,eligibility_notes,
  housing_details_last_checked_at
)
SELECT r.id,d.accepts_felony,d.accepts_violent_offense,d.accepts_sex_offense,
  d.requires_sobriety,d.has_curfew,d.application_url,d.intake_phone,d.eligibility_notes,now()
FROM d JOIN resources r ON r.external_id=d.external_id
ON CONFLICT (resource_id) DO UPDATE SET
  accepts_felony=EXCLUDED.accepts_felony,
  accepts_violent_offense=EXCLUDED.accepts_violent_offense,
  accepts_sex_offense=EXCLUDED.accepts_sex_offense,
  requires_sobriety=EXCLUDED.requires_sobriety,
  has_curfew=EXCLUDED.has_curfew,
  application_url=EXCLUDED.application_url,
  intake_phone=EXCLUDED.intake_phone,
  eligibility_notes=EXCLUDED.eligibility_notes,
  housing_details_last_checked_at=EXCLUDED.housing_details_last_checked_at,
  updated_at=now();

-- Evidence --------------------------------------------------------
-- Allowed method/outcome vocabularies are defined by migration 057.
WITH ev(external_id,claim_field,method,outcome,source_url,source_name,notes) AS (
VALUES
('housing-er-project-pasco','population_focus.reentry','official_website','confirmed','https://www.erprojectextreme.com/','End Recidivism Project Extreme','Official site states the program assists people reintegrating after incarceration and lists housing among supports.'),
('housing-er-project-pasco','resource_type','government_source','confirmed','https://www.flsenate.gov/PublishedContent/Session/FiscalYear/FY2024-25/LocalFundingInitiativeRequests/FY2024-25_S3630.pdf','Florida Senate funding request','State funding document describes Pasco reentry housing search/navigation plus eligible rental, first-month and utility deposit assistance, supporting housing_navigation rather than a residential-bed claim.'),

('housing-new-life-lakeland-reentry','population_focus.reentry','official_website','confirmed','https://newlifelakeland.org/programs','New Life Outreach Ministry','Official page has a Prison Re-entry Program for people transitioning from incarceration and lists housing placement among program features.'),
('housing-new-life-lakeland-reentry','accepts_violent_offense','official_website','confirmed','https://newlifelakeland.org/programs','New Life Outreach Ministry','The source confirms this field should be false: published eligibility says no violent offenses.'),

('housing-tricounty-hatch-polk','population_focus.reentry','official_website','confirmed','https://tchsonline.org/services/helping-hands-hatch/','Tri-County Human Services','Helping HANDS is a Polk County jail-transition program for inmates returning to the community.'),
('housing-tricounty-hatch-polk','requires_referral','official_website','confirmed','https://tchsonline.org/services/helping-hands-hatch/','Tri-County Human Services','Official page says referrals come from the jail or listed community partner agencies and HATCH serves identified Helping HANDS participants.'),
('housing-tricounty-hatch-polk','resource_type','official_website','confirmed','https://tchsonline.org/services/helping-hands-hatch/','Tri-County Human Services','HATCH identifies and obtains permanent or temporary housing and provides maintenance support, establishing housing navigation rather than a provider-operated residence.'),

('housing-operation-new-hope-space-coast','population_focus.reentry','official_website','confirmed','https://operationnewhope.org/operation-new-hope-space-coast-has-a-new-home/','Operation New Hope','Current Space Coast announcement states new weekly classes serve clients returning from incarceration in Brevard County.'),
('housing-operation-new-hope-space-coast','resource_type','official_website','confirmed','https://operationnewhope.org/our-programs/ready4work/','Operation New Hope','Ready4Work describes Transitional Housing Assistance among wraparound services; this supports housing_navigation without asserting the Cocoa office is a residence.'),

('housing-second-chance-collective-volusia','population_focus.reentry','official_website','confirmed','https://second-chance-collective.org/','Second Chance Collective','Official site explicitly serves people returning from incarceration and aims to reduce recidivism.'),
('housing-second-chance-collective-volusia','resource_type','official_website','confirmed','https://second-chance-collective.org/','Second Chance Collective','Provider says it connects participants with sober-living homes and sponsorship support and that housing partners are in Volusia/Flagler, supporting housing_navigation.'),

('housing-foundations-freedom-deland','population_focus.reentry','official_website','confirmed','https://www.foundationstofreedom.org/halfway-houses-deland-fl/','Foundations to Freedom','Official FAQ says sober living can serve people transitioning out of a correctional institution.'),
('housing-foundations-freedom-deland','accepts_violent_offense','official_website','confirmed','https://www.foundationstofreedom.org/halfway-houses-deland-fl/','Foundations to Freedom','The source confirms this field should be false: admissions do not accept individuals with a history of violent crimes.'),
('housing-foundations-freedom-deland','accepts_sex_offense','official_website','confirmed','https://www.foundationstofreedom.org/halfway-houses-deland-fl/','Foundations to Freedom','The source confirms this field should be false: registered sex offenders are excluded.'),

('housing-first-step-daytona-record-friendly','accepts_felony','official_website','confirmed','https://firststepshelter.org/services-support/','First Step Shelter','Provider says criminal history does not matter unless screening identifies a high potential for violence, supporting consideration of felony records while preserving violent-offense eligibility as unknown/risk-screened.'),
('housing-first-step-daytona-record-friendly','requires_referral','official_website','confirmed','https://firststepshelter.org/services-support/','First Step Shelter','Official page states the program is referral based and applicants must be referred by an agency in a partner city.'),

('housing-house-of-hope-broward-reentry','population_focus.reentry','official_website','confirmed','https://houseofhope.org/rebuild-lives-addiction-recovery/','House of Hope','Official provider material describes a Criminal Justice program within its residential model for accused/adjudicated people referred from the justice system and clients arriving after incarceration.'),
('housing-house-of-hope-broward-reentry','resource_type','official_website','confirmed','https://houseofhope.org/who-we-are-addiction-treatment/','House of Hope','Current provider page describes residential addiction treatment for up to 96 men, supporting recovery_residence classification.'),

('housing-dismas-dania-rrc','population_focus.reentry','official_website','confirmed','https://www.dismas.com/','Dismas Charities','Dismas identifies itself as a national nonprofit provider of residential reentry services for people transitioning from incarceration.'),
('housing-dismas-dania-rrc','requires_referral','government_source','confirmed','https://www.bop.gov/business/rrc_directory.jsp','Federal Bureau of Prisons','Federal RRC directory lists Dismas Charities in Dania, Florida; the listing is therefore correctional residential reentry placement, not public rental housing.'),

('housing-ezri-miami-navigation','population_focus.reentry','official_website','confirmed','https://ezreentryinitiative.org/research-and-impact/','Empowerment Zone Re-entry Initiative','Current provider impact page explicitly names justice-impacted individuals and returning citizens throughout Miami-Dade as target populations.'),
('housing-ezri-miami-navigation','resource_type','official_website','confirmed','https://ezreentryinitiative.org/research-and-impact/','Empowerment Zone Re-entry Initiative','Housing navigation is explicitly listed among key services, supporting housing_navigation.'),

('housing-reentry-one-miami-navigation','population_focus.reentry','official_website','confirmed','https://www.reentryone.org/','Re-Entry One Inc.','Official site is dedicated to returning citizens following release from incarceration.'),
('housing-reentry-one-miami-navigation','resource_type','official_website','confirmed','https://www.reentryone.org/','Re-Entry One Inc.','Official site says returning citizens receive housing assistance alongside employment, healthcare and other reentry support, supporting housing_navigation rather than a direct-bed claim.'),

('housing-agape-criminal-justice-navigation','population_focus.reentry','official_website','confirmed','https://theagapenetwork.org/services/criminal-justice-program/','The Agape Network','Official Criminal Justice Program provides reentry services to justice-involved individuals including people in custody/community control/court involvement.'),
('housing-agape-criminal-justice-navigation','resource_type','official_website','confirmed','https://theagapenetwork.org/services/criminal-justice-program/','The Agape Network','Criminal Justice case management explicitly addresses housing; direct Supported Housing is a separate eligibility-based program, supporting conservative housing_navigation classification.')
)
INSERT INTO resource_evidence(
  resource_id,claim_field,method,outcome,source_url,source_name,checked_at,checked_by,notes
)
SELECT r.id,ev.claim_field,ev.method,ev.outcome,ev.source_url,ev.source_name,now(),
  'StreetRise migration 062',ev.notes
FROM ev JOIN resources r ON r.external_id=ev.external_id
WHERE NOT EXISTS (
  SELECT 1 FROM resource_evidence e
  WHERE e.resource_id=r.id
    AND e.claim_field IS NOT DISTINCT FROM ev.claim_field
    AND e.source_url IS NOT DISTINCT FROM ev.source_url
);
