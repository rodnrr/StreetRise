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
  | 'waitlisted'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export interface Booking {
  id: string
  resource_id: string
  resource?: Resource
  user_id?: string
  requester_name: string
  requester_phone?: string
  requester_email?: string
  notes?: string
  status: BookingStatus
  check_in_date?: string
  check_out_date?: string
  adults: number
  children: number
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

export interface MapFilters {
  // Quick-select chip (overrides category/resourceType when set)
  quickFilter?: QuickFilterKey

  // Category / type (used when no quickFilter)
  category?: ResourceCategory
  resourceType?: string

  // Eligibility
  genderPolicy?: GenderPolicy[]
  populationFocus?: string[]

  // Access
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
