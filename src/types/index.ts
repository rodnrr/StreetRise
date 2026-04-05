// ============================================================
// StreetRise — Core Type Definitions
// ============================================================

// ------ Resource / Provider ------

export type ResourceCategory =
  | 'shelter'
  | 'food'
  | 'work_exchange'
  | 'mental_health'
  | 'medical'
  | 'legal'
  | 'hygiene'
  | 'clothing'
  | 'childcare'
  | 'transportation'
  | 'other'

export type AvailabilityStatus = 'available' | 'limited' | 'full' | 'unknown' | 'closed'

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended'

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

  // Location
  address: Address
  lat: number
  lng: number

  // Contact
  phone?: string
  email?: string
  website?: string

  // Availability
  availability_status: AvailabilityStatus
  beds_total?: number
  beds_available?: number
  beds_updated_at?: string

  // Intake
  walk_ins_accepted: boolean
  requires_id: boolean
  requires_referral: boolean
  age_min?: number
  age_max?: number
  gender_restriction?: 'any' | 'male' | 'female' | 'nonbinary_inclusive'

  // Hours
  hours_of_operation: HoursOfOperation

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
  ein?: string         // Tax ID for nonprofits
  logo_url?: string
  verification_status: VerificationStatus
  role: ProviderRole
  bio?: string
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
  user_id?: string       // null for anonymous requests
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
  compensation?: string  // "Meals + Housing", "$15/hr", "Skills trade"
  skills_required: string[]
  skills_gained: string[]
  is_active: boolean
  lat: number
  lng: number
  address: Address
  created_at: string
  updated_at: string
}

// ------ Donation ------

export interface DonationCampaign {
  id: string
  provider_id?: string   // null = platform campaign
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
  category?: ResourceCategory
  availabilityStatus?: AvailabilityStatus
  walkInsOnly?: boolean
  requiresId?: boolean
  radius?: number        // km
  languages?: string[]
  genderRestriction?: string
}

export interface SearchResult {
  resources: Resource[]
  work_exchanges: WorkExchange[]
  total: number
  bbox?: [number, number, number, number] // [minLat, minLng, maxLat, maxLng]
}

// ------ UI State ------

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}
