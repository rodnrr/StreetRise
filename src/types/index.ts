// ============================================================
// StreetRise — Core Type Definitions
// ============================================================

// ------ Resource / Provider ------

export type ResourceCategory =
  | 'shelter'
  | 'food'
  | 'work_exchange'
  | 'employment'
  | 'mental_health'
  | 'substance_recovery'
  | 'medical'
  | 'healthcare'
  | 'legal'
  | 'legal_aid'
  | 'hygiene'
  | 'clothing'
  | 'childcare'
  | 'transportation'
  | 'outdoor_space'
  | 'day_space'
  | 'outreach'
  | 'hotline'
  | 'other'

export type ResourceType =
  | 'emergency_shelter'
  | 'transitional_housing'
  | 'food_pantry'
  | 'hot_meal'
  | 'shower_facility'
  | 'restroom_access'
  | 'day_use_park'
  | 'warming_cooling_center'
  | 'domestic_violence_shelter'
  | 'veteran_housing'
  | 'youth_shelter'
  | 'work_exchange'
  | 'crisis_hotline'
  | 'job_training'
  | 'legal_services'
  | 'medical_clinic'
  | 'mental_health_clinic'
  | 'substance_recovery_program'
  | 'clothing_closet'
  | 'hygiene_supplies'
  | 'laundry_facility'
  | 'childcare_services'
  | 'transportation_assistance'
  | 'outreach_program'
  | 'other'

export type GenderPolicy =
  | 'gender_inclusive'
  | 'men_only'
  | 'women_only'
  | 'family_only'
  | 'couples_only'
  | 'youth_only'
  | 'unknown'

export type PopulationFocus =
  | 'veterans'
  | 'lgbtq'
  | 'domestic_violence'
  | 'families'
  // Students in PreK-12 and their families. This is a population tag rather
  // than a category because what a school clothing closet *is* is a clothing
  // resource — serving students is who it is for. Keeping the two axes apart
  // is what lets a school-based food pantry or a homeless-liaison program
  // carry the tag without fighting its own category (migration 036).
  | 'students'
  | 'seniors'
  | 'young_adults'
  | 'pregnant_women'
  | 'substance_recovery'
  | 'mental_health'
  | 'reentry'
  | 'hiv_aids'

export type QuickFilterKey =
  | 'shelter_tonight'
  | 'food_today'
  | 'shower_restroom'
  | 'safe_daytime'
  | 'family_help'
  | 'mens_help'
  | 'womens_help'
  | 'veteran_support'
  | 'lgbtq_support'
  | 'youth_support'
  | 'dv_support'

export type AvailabilityStatus = 'available' | 'limited' | 'full' | 'unknown' | 'closed'

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended'

export type ResourceAccessType =
  | 'onsite'
  | 'phone_intake'
  | 'web_intake'
  | 'confidential_address'
  | 'not_map_ready'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface Address {
  street: string
  city: string
  state: string
  zip: string
  country?: string
}

export interface Resource {
  id: string
  provider_id: string
  name: string
  description: string
  category: ResourceCategory
  subcategory?: string

  // Taxonomy (migration 011)
  resource_type?: ResourceType | string | null
  gender_policy: GenderPolicy
  population_focus: string[]

  // Location — lat/lng nullable for intake-only and pending-geocode resources
  address: Address
  lat: number | null
  lng: number | null
  access_type: ResourceAccessType
  is_map_ready: boolean

  // Contact
  phone?: string
  email?: string
  website?: string

  // Availability
  availability_status: AvailabilityStatus
  beds_total?: number
  beds_available?: number
  beds_updated_at?: string

  // Intake / access conditions
  walk_ins_accepted: boolean
  requires_id: boolean
  requires_referral: boolean
  phone_required_before_arrival: boolean
  age_min?: number
  age_max?: number
  // gender_restriction kept for backwards compatibility; prefer gender_policy
  gender_restriction?: 'any' | 'male' | 'female' | 'nonbinary_inclusive'

  // Overnight
  overnight_allowed?: boolean | null

  // Facility amenities
  has_showers: boolean
  has_restrooms: boolean
  serves_meals: boolean
  has_laundry: boolean
  pet_friendly: boolean
  wheelchair_accessible: boolean
  public_transit_accessible: boolean

  // Hours
  hours_of_operation: HoursOfOperation

  // Trust fields (migration 010)
  confidence_score: number
  stale_after_days: number
  last_provider_update_at?: string | null
  last_verified_at?: string | null
  verification_notes?: string | null

  // Meta
  verification_status: VerificationStatus
  is_active: boolean
  languages_spoken: string[]
  tags: string[]
  photos: string[]

  created_at: string
  updated_at: string
}

export interface HoursOfOperation {
  monday?:    DayHours
  tuesday?:   DayHours
  wednesday?: DayHours
  thursday?:  DayHours
  friday?:    DayHours
  saturday?:  DayHours
  sunday?:    DayHours
  notes?: string
}

export interface DayHours {
  open:   string // "08:00"
  close:  string // "20:00"
  closed: boolean
}

// ------ Provider / Organization ------

export type ProviderRole = 'provider' | 'admin' | 'super_admin'

export type ProviderClaimStatus = 'unclaimed' | 'pending_claim' | 'claimed'
export type ProviderSourceType  = 'self_registered' | 'seeded' | 'imported'

/** Row of `provider_claims` (migration 033). Admin- and owner-readable only. */
export interface ProviderClaim {
  id: string
  provider_id: string
  user_id: string
  /** Pinned by RLS to the claimant's account email — evidence, not a contact detail. */
  claim_email: string
  /** Claimant-supplied address to reach them at. Free text; proves nothing. */
  contact_email: string
  claim_note?: string | null
  status: 'pending' | 'approved' | 'denied'
  decided_at?: string | null
  decided_by?: string | null
  decision_note?: string | null
  submitted_notified_at?: string | null
  decision_notified_at?: string | null
  created_at: string
}

/**
 * The public-safe subset of a provider shown on /claim. Deliberately narrower
 * than `Provider` — the claim directory has no business selecting user_id or
 * the trust/verification internals.
 */
export interface ClaimableProvider {
  id: string
  organization_name: string
  contact_email: string
  contact_phone?: string | null
  website?: string | null
  bio?: string | null
  claim_status: ProviderClaimStatus
}

export interface Provider {
  id: string
  user_id: string
  organization_name: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  website?: string
  ein?: string
  logo_url?: string
  verification_status: VerificationStatus
  role: ProviderRole
  bio?: string
  // Claim fields (migrations 023–027)
  claim_status?: ProviderClaimStatus
  source_type?: ProviderSourceType
  // Trust fields (migration 010)
  identity_confirmed?: boolean
  re_verification_due_at?: string | null
  suspension_reason?: string | null
  verification_notes?: string | null
  suspended_at?: string | null
  created_at: string
  updated_at: string
}

// ------ Booking / Request ------

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'needs_info'
  | 'contacted'
  | 'no_response'
  | 'closed'
  | 'waitlisted'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type ContactPreference = 'phone' | 'email' | 'either'

export interface Booking {
  id: string
  resource_id: string
  resource?: Resource
  user_id?: string
  requester_name: string
  requester_phone?: string | null
  requester_email?: string | null
  contact_preference?: ContactPreference | null
  best_contact_time?: string | null
  contact_consent?: boolean | null
  notes?: string | null
  status: BookingStatus
  admin_notes?: string | null
  provider_notes?: string | null
  decision_note?: string | null
  last_contacted_at?: string | null
  decided_at?: string | null
  check_in_date?: string | null
  check_out_date?: string | null
  adults: number
  children: number
  created_at: string
  updated_at: string
}

// ------ Conversations / Messaging ------

export type ConversationStatus = 'open' | 'resolved' | 'closed'

export interface Conversation {
  id: string
  provider_id: string
  admin_id: string | null
  subject: string
  description: string | null
  status: ConversationStatus
  created_by_admin: boolean
  created_at: string
  updated_at: string
  last_message_at: string | null
  // Added in migration 030, applied to live and verified 2026-08-18.
  // Still optional: the columns are nullable, and PostgREST omits them
  // from rows where they were never written.
  provider_last_read_at?: string | null
  admin_last_read_at?: string | null
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  message: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface ConversationAdminNote {
  id: string
  conversation_id: string
  admin_id: string | null
  notes: string
  created_at: string
  updated_at: string
}

// ------ Work Exchange ------

export type WorkExchangeType = 'volunteering' | 'paid' | 'skills_trade' | 'internship'

export interface WorkExchange {
  id: string
  provider_id: string
  title: string
  description: string
  exchange_type: WorkExchangeType
  hours_per_week?: number
  compensation?: string
  skills_required: string[]
  skills_gained: string[]
  is_active: boolean
  lat: number | null
  lng: number | null
  address: Address
  created_at: string
  updated_at: string
  // Provenance (migration 035). `source_url` is the page the listing was
  // transcribed from and the page the agent re-reads to check it is still real.
  external_id?: string | null
  source_url?: string | null
  source_type?: WorkExchangeSourceType
  last_verified_at?: string | null
  last_verify_status?: WorkExchangeVerifyStatus | null
}

export type WorkExchangeSourceType = 'provider_posted' | 'seeded' | 'agent_assisted'
export type WorkExchangeVerifyStatus = 'confirmed' | 'changed' | 'gone' | 'unclear' | 'unreachable'

// ------ Work exchange review queue (migration 035) ------

export type WorkExchangeCandidateKind = 'new' | 'update' | 'delist'
export type WorkExchangeCandidateStatus = 'pending' | 'approved' | 'rejected' | 'applied'

/** The subset of a work_exchanges row an agent may propose. */
export interface WorkExchangeProposal {
  title?: string
  description?: string
  exchange_type?: WorkExchangeType
  hours_per_week?: number | null
  compensation?: string | null
  skills_required?: string[]
  skills_gained?: string[]
  address?: Partial<Address>
  lat?: number | null
  lng?: number | null
}

/**
 * A proposed change to `work_exchanges`, staged for admin review. Nothing
 * here is public: the agent writes rows, an admin at /admin/work-exchange
 * decides, and only then does anything reach the listing itself.
 */
export interface WorkExchangeCandidate {
  id: string
  kind: WorkExchangeCandidateKind
  status: WorkExchangeCandidateStatus
  work_exchange_id: string | null
  provider_id: string | null
  external_id: string | null
  source_url: string
  proposed: WorkExchangeProposal
  agent_run_id: string
  agent_model: string | null
  agent_note: string | null
  /** Verbatim quote from the source page — the reviewer's check on the model. */
  evidence: string | null
  confidence: number | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

// ------ Donation ------

export interface DonationCampaign {
  id: string
  provider_id?: string
  title: string
  description: string
  goal_amount?: number
  raised_amount: number
  stripe_price_id?: string
  is_active: boolean
  ends_at?: string
  created_at: string
}

// ------ Admin / Moderation ------

export type ModerationAction = 'approved' | 'rejected' | 'suspended' | 'requested_info'

export interface ModerationLog {
  id: string
  admin_id: string
  target_type: 'provider' | 'resource' | 'booking' | 'work_exchange'
  target_id: string
  action: ModerationAction
  reason?: string
  notes?: string
  created_at: string
}

// ------ FAQ ------

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  order: number
  is_active: boolean
}

// ------ Map / Search ------

/**
 * The single "what do you need?" chip row on the map. One need is active at a
 * time; each maps to a predicate in `lib/mapFilters.ts` (NEED_DEFS).
 * Supersedes the old quickFilter/category split, which let a chip and a
 * drawer category be set at once with one silently overriding the other.
 */
export type NeedKey =
  | 'shelter' | 'food' | 'hygiene' | 'daytime' | 'medical' | 'mental_health'
  | 'recovery' | 'legal' | 'work' | 'clothing' | 'transportation' | 'childcare'
  | 'outreach' | 'families' | 'students' | 'veterans' | 'dv' | 'youth' | 'lgbtq'

export interface MapFilters {
  // Active need chip
  need?: NeedKey

  // Legacy quick-select chip — still honoured for deep links
  quickFilter?: QuickFilterKey

  // Category / type (used when no need/quickFilter)
  category?: ResourceCategory
  resourceType?: string
  subcategory?: string[]

  // Eligibility
  genderPolicy?: GenderPolicy[]
  populationFocus?: string[]

  // Access
  /** Open at the moment of viewing, evaluated in the resource's timezone. */
  openNow?: boolean
  overnightAllowed?: boolean
  walkInsOnly?: boolean
  noCallRequired?: boolean       // phone_required_before_arrival = false
  noReferralRequired?: boolean   // requires_referral = false
  noIdRequired?: boolean         // requires_id = false

  // Facilities
  hasShowers?: boolean
  hasRestrooms?: boolean
  servesMeals?: boolean
  hasLaundry?: boolean
  petFriendly?: boolean
  wheelchairAccessible?: boolean
  nearTransit?: boolean

  // Trust / freshness
  verifiedOnly?: boolean
  hideStale?: boolean
  showLowConfidence?: boolean    // opt-in to see confidence_score < 20

  // Legacy / general
  availabilityStatus?: AvailabilityStatus
  radius?: number                // km
  languages?: string[]
}

export interface SearchResult {
  resources: Resource[]
  work_exchanges: WorkExchange[]
  total: number
  bbox?: [number, number, number, number]
}

// ------ UI State ------

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

// ============================================================
// Second-Chance Housing Directory  (migrations 056–058, /housing)
// ============================================================
//
// Standalone from Resource/Provider on purpose — see migration 056's
// header for why. The types that matter most here are the tri-state
// booleans: `boolean | null`, where null means "nobody has told us",
// never "no". Do not narrow them to `boolean`.

export type HousingOrgType =
  | 'transitional_housing'
  | 'sober_living'
  | 'reentry_nonprofit'
  | 'housing_authority'
  | 'landlord'
  | 'legal_aid'
  | 'shelter'

export type HousingType =
  | 'transitional'
  | 'recovery_residence'
  | 'permanent_supportive'
  | 'rental_unit'
  | 'shared_housing'
  | 'emergency_shelter'

export type HousingGenderServed = 'any' | 'men' | 'women' | 'other'

export type HousingVerificationMethod = 'phone' | 'email' | 'website' | 'partner'
export type HousingVerificationOutcome = 'confirmed' | 'changed' | 'closed' | 'unreachable'

export type HousingReportType = 'closed' | 'wrong_info' | 'scam' | 'new_listing'
export type HousingReportStatus = 'new' | 'reviewed' | 'actioned' | 'dismissed'

export interface HousingState {
  code: string
  name: string
  /** null = not researched yet. The page hides the block rather than faking one. */
  record_lookback_summary: string | null
  /** Tri-state, same rule as the program booleans: null = unknown. */
  has_housing_ban_the_box: boolean | null
  notes: string | null
  updated_at: string
}

export interface HousingOrganization {
  id: string
  slug: string
  name: string
  org_type: HousingOrgType
  website: string | null
  phone: string | null
  email: string | null
  description: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface HousingLocation {
  id: string
  organization_id: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state_code: string | null
  postal_code: string | null
  lat: number | null
  lng: number | null
  is_primary: boolean
}

export interface HousingProgram {
  id: string
  organization_id: string
  name: string
  housing_type: HousingType
  gender_served: HousingGenderServed | null

  // ── Tri-state. null = not stated. NEVER render as "no". ──
  accepts_felony: boolean | null
  accepts_violent_offense: boolean | null
  accepts_sex_offense: boolean | null
  accepts_vouchers: boolean | null
  requires_sobriety: boolean | null
  has_curfew: boolean | null

  monthly_cost_cents: number | null
  deposit_cents: number | null
  max_stay_days: number | null
  beds_total: number | null

  application_url: string | null
  intake_phone: string | null
  notes: string | null

  is_published: boolean
  /** null = never verified. Say so; do not fall back to created_at. */
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

/** Column-limited view — excludes raw_payload. See migration 056 §13. */
export interface HousingSourceAttribution {
  id: string
  organization_id: string
  source_name: string
  source_url: string | null
  retrieved_at: string
  license_note: string | null
}

/** A program joined to its organization and that org's addresses. */
export interface HousingProgramWithOrg extends HousingProgram {
  organization: HousingOrganization
  locations: HousingLocation[]
}

export interface HousingReportInput {
  program_id: string | null
  report_type: HousingReportType
  message: string
  contact_email: string | null
}
