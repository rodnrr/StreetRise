// Auto-generated Supabase types skeleton
// Run `supabase gen types typescript --project-id YOUR_REF > src/lib/database.types.ts`
// after your migrations are applied to get the fully-generated version.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      providers: {
        Row: {
          id: string
          user_id: string
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
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['providers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['providers']['Insert']>
      }
      resources: {
        Row: {
          id: string
          provider_id: string
          name: string
          description: string
          category: string
          subcategory: string | null
          address: Json
          lat: number
          lng: number
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
          hours_of_operation: Json
          verification_status: string
          is_active: boolean
          languages_spoken: string[]
          tags: string[]
          photos: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['resources']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['resources']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
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
          lat: number
          lng: number
          address: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['work_exchanges']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['work_exchanges']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['faq']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['faq']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['moderation_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['moderation_logs']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['donation_campaigns']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['donation_campaigns']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
