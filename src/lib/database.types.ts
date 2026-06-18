type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type AddressJson = {
  street: string
  city: string
  state: string
  zip: string
  country?: string
}

type DayHoursJson = {
  open?: string
  close?: string
  closed?: boolean
}

type HoursOfOperationJson = {
  monday?: DayHoursJson
  tuesday?: DayHoursJson
  wednesday?: DayHoursJson
  thursday?: DayHoursJson
  friday?: DayHoursJson
  saturday?: DayHoursJson
  sunday?: DayHoursJson
  notes?: string
  summary?: string
}

export interface Database {
  public: {
    Tables: {
      providers: {
        Row: {
          id: string
          user_id: string | null
          organization_name: string
          contact_name: string
          contact_email: string
          contact_phone: string | null
          website: string | null
          ein: string | null
          logo_url: string | null
          verification_status: string
          role: string
          bio: string | null
          claim_status: Database['public']['Enums']['provider_claim_status']
          source_type: Database['public']['Enums']['provider_source_type']
          created_at: string
          updated_at: string
          // Trust fields (migration 010)
          identity_confirmed: boolean
          re_verification_due_at: string | null
          suspension_reason: string | null
          verification_notes: string | null
          suspended_at: string | null
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['providers']['Row'], 'id' | 'created_at' | 'updated_at'>,
    | 'user_id'
    | 'contact_phone'
    | 'website'

    | 'ein'
    | 'logo_url'
    | 'verification_status'

    | 'role'
    | 'bio'
    | 'identity_confirmed'

    | 're_verification_due_at'
    | 'suspension_reason'
    | 'verification_notes'

    | 'suspended_at'
    | 'claim_status'
    | 'source_type'
        >
        Update: Partial<Database['public']['Tables']['providers']['Insert']>
        Relationships: []
      }

      resources: {
        Row: {
          id: string
          provider_id: string
          name: string
          description: string
          category: string
          subcategory: string | null
          address: AddressJson
          // Nullable since migration 004 — pending-geocode and intake-only rows have no coords
          lat: number | null
          lng: number | null
          access_type: Database['public']['Enums']['resource_access_type']
          is_map_ready: boolean
          phone: string | null
          email: string | null
          website: string | null
          availability_status: string
          beds_total: number | null
          beds_available: number | null
          beds_updated_at: string | null
          walk_ins_accepted: boolean
          requires_id: boolean
          requires_referral: boolean
          age_min: number | null
          age_max: number | null
          gender_restriction: string | null
          hours_of_operation: HoursOfOperationJson
          verification_status: string
          is_active: boolean
          languages_spoken: string[]
          tags: string[]
          photos: string[]
          created_at: string
          updated_at: string
          // Trust fields (migration 010)
          confidence_score: number
          stale_after_days: number
          last_provider_update_at: string | null
          last_verified_at: string | null
          verification_notes: string | null
          // Taxonomy & facility fields (migration 011)
          resource_type: string | null
          gender_policy: string
          population_focus: string[]
          overnight_allowed: boolean | null
          phone_required_before_arrival: boolean
          has_showers: boolean
          has_restrooms: boolean
          serves_meals: boolean
          has_laundry: boolean
          pet_friendly: boolean
          wheelchair_accessible: boolean
          public_transit_accessible: boolean
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['resources']['Row'], 'id' | 'created_at' | 'updated_at'>,
          | 'description'
          | 'subcategory'
          | 'lat'
          | 'lng'
          | 'access_type'
          | 'is_map_ready'
          | 'address'
          | 'phone'
          | 'email'
          | 'website'
          | 'availability_status'
          | 'beds_total'
          | 'beds_available'
          | 'beds_updated_at'
          | 'walk_ins_accepted'
          | 'requires_id'
          | 'requires_referral'
          | 'age_min'
          | 'age_max'
          | 'gender_restriction'
          | 'hours_of_operation'
          | 'verification_status'
          | 'is_active'
          | 'languages_spoken'
          | 'tags'
          | 'photos'
          | 'confidence_score'
          | 'stale_after_days'
          | 'last_provider_update_at'
          | 'last_verified_at'
          | 'verification_notes'
          | 'resource_type'
          | 'gender_policy'
          | 'population_focus'
          | 'overnight_allowed'
          | 'phone_required_before_arrival'
          | 'has_showers'
          | 'has_restrooms'
          | 'serves_meals'
          | 'has_laundry'
          | 'pet_friendly'
          | 'wheelchair_accessible'
          | 'public_transit_accessible'
        >
        Update: Partial<Database['public']['Tables']['resources']['Insert']>
        Relationships: []
      }

      bookings: {
        Row: {
          id: string
          resource_id: string
          user_id: string | null
          requester_name: string
          requester_phone: string | null
          requester_email: string | null
          notes: string | null
          status: string
          check_in_date: string | null
          check_out_date: string | null
          adults: number
          children: number
          created_at: string
          updated_at: string
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'>,
          | 'user_id'
          | 'requester_phone'
          | 'requester_email'
          | 'notes'
          | 'status'
          | 'check_in_date'
          | 'check_out_date'
          | 'adults'
          | 'children'
        >
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
        Relationships: []
      }

      work_exchanges: {
        Row: {
          id: string
          provider_id: string
          title: string
          description: string
          exchange_type: string
          hours_per_week: number | null
          compensation: string | null
          skills_required: string[]
          skills_gained: string[]
          is_active: boolean
          lat: number | null
          lng: number | null
          address: AddressJson
          created_at: string
          updated_at: string
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['work_exchanges']['Row'], 'id' | 'created_at' | 'updated_at'>,
          'description' | 'exchange_type' | 'hours_per_week' | 'compensation' | 'skills_required' | 'skills_gained' | 'is_active' | 'address' | 'lat' | 'lng'
        >
        Update: Partial<Database['public']['Tables']['work_exchanges']['Insert']>
        Relationships: []
      }

      faq: {
        Row: {
          id: string
          question: string
          answer: string
          category: string
          order: number
          is_active: boolean
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['faq']['Row'], 'id'>,
          'category' | 'order' | 'is_active'
        >
        Update: Partial<Database['public']['Tables']['faq']['Insert']>
        Relationships: []
      }

      moderation_logs: {
        Row: {
          id: string
          admin_id: string
          target_type: string
          target_id: string
          action: string
          reason: string | null
          notes: string | null
          created_at: string
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['moderation_logs']['Row'], 'id' | 'created_at'>,
          'reason' | 'notes'
        >
        Update: Partial<Database['public']['Tables']['moderation_logs']['Insert']>
        Relationships: []
      }

      donation_campaigns: {
        Row: {
          id: string
          provider_id: string | null
          title: string
          description: string
          goal_amount: number | null
          raised_amount: number
          stripe_price_id: string | null
          is_active: boolean
          ends_at: string | null
          created_at: string
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['donation_campaigns']['Row'], 'id' | 'created_at'>,
          'provider_id' | 'description' | 'goal_amount' | 'raised_amount' | 'stripe_price_id' | 'is_active' | 'ends_at'
        >
        Update: Partial<Database['public']['Tables']['donation_campaigns']['Insert']>
        Relationships: []
      }

      conversations: {
        Row: {
          id: string
          provider_id: string
          admin_id: string | null
          subject: string
          description: string | null
          status: string
          created_by_admin: boolean
          created_at: string
          updated_at: string
          last_message_at: string | null
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>,
          'admin_id' | 'description' | 'status' | 'created_by_admin' | 'last_message_at'
        >
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
        Relationships: []
      }

      conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string | null
          message: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: Optional<
          Omit<Database['public']['Tables']['conversation_messages']['Row'], 'id' | 'created_at' | 'updated_at'>,
          'sender_id'
        >
        Update: Partial<Database['public']['Tables']['conversation_messages']['Insert']>
        Relationships: []
      }
    }

    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      resource_access_type:
        | 'onsite'
        | 'phone_intake'
        | 'web_intake'
        | 'confidential_address'
        | 'not_map_ready'
      provider_claim_status:
        | 'unclaimed'
        | 'pending_claim'
        | 'claimed'
      provider_source_type:
        | 'self_registered'
        | 'seeded'
        | 'imported'
    }
  }
}
