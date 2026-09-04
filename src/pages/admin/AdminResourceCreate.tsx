import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import { Plus } from 'lucide-react'
import type { ResourceCategory, ResourceAccessType } from '@/types'

const CATEGORIES: { value: ResourceCategory; label: string }[] = [
  { value: 'shelter', label: 'Shelter' },
  { value: 'housing', label: 'Housing' },
  { value: 'food', label: 'Food' },
  { value: 'medical', label: 'Medical' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'legal', label: 'Legal' },
  { value: 'hygiene', label: 'Hygiene' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'outdoor_space', label: 'Outdoor Space' },
  { value: 'day_space', label: 'Day Space' },
  { value: 'work_exchange', label: 'Work Exchange' },
  { value: 'employment', label: 'Employment' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'hotline', label: 'Hotline' },
  { value: 'substance_recovery', label: 'Substance Recovery' },
  { value: 'other', label: 'Other' },
]

/** See the same list in AdminResourceEdit — a listing with no front door. */
const NON_WALK_IN_ACCESS = ['phone_intake', 'web_intake', 'confidential_address', 'not_map_ready']

const ACCESS_TYPES = [
  { value: 'onsite', label: 'On-site — people come to this address' },
  { value: 'phone_intake', label: 'Phone intake — no walk-in address' },
  { value: 'web_intake', label: 'Online intake — no walk-in address' },
  { value: 'confidential_address', label: 'Confidential address — do not publish' },
  { value: 'not_map_ready', label: 'Not ready for the map' },
]

/** Every value the live resources_resource_type_check accepts (migration 057). */
const RESOURCE_TYPE_OPTIONS = [
  'emergency_shelter','transitional_housing','food_pantry','hot_meal',
  'shower_facility','restroom_access','day_use_park','warming_cooling_center',
  'domestic_violence_shelter','veteran_housing','youth_shelter','work_exchange',
  'crisis_hotline','job_training','legal_services','medical_clinic',
  'mental_health_clinic','substance_recovery_program','clothing_closet',
  'hygiene_supplies','laundry_facility','childcare_services',
  'transportation_assistance','outreach_program',
  'affordable_housing','public_housing','subsidized_housing',
  'permanent_supportive_housing','recovery_residence','shared_housing',
  'housing_navigation','voucher_program','other',
]

const AVAILABILITY_STATUS = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited' },
  { value: 'full', label: 'Full' },
  { value: 'unknown', label: 'Unknown' },
]

interface ResourceForm {
  provider_id: string
  name: string
  description: string
  category: ResourceCategory
  resource_type: string
  access_type: string
  street: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  phone: string
  email: string
  website: string
  availability_status: string
  beds_total?: number
  beds_available?: number
}

export default function AdminResourceCreate() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showAddAnother, setShowAddAnother] = useState(false)

  const [form, setForm] = useState<ResourceForm>({
    provider_id: '',
    name: '',
    description: '',
    category: 'other',
    resource_type: '',
    access_type: 'onsite',
    street: '',
    city: '',
    state: 'FL',
    zip: '',
    lat: 27.9506,
    lng: -82.4572,
    phone: '',
    email: '',
    website: '',
    availability_status: 'available',
  })

  // Fetch all providers
  const { data: providers } = useQuery({
    queryKey: ['admin-providers-list'],
    queryFn: async () => {
      const { data, error } = await db.providers()
        .select('id, organization_name, verification_status')
        .eq('verification_status', 'verified')
        .order('organization_name')
      if (error) throw error
      return data || []
    },
  })

  // Create resource mutation
  const createResource = useMutation({
    mutationFn: async () => {
      if (!form.provider_id || !form.name || !form.category) {
        throw new Error('Provider, name, and category are required')
      }

      const hasCoords = Number.isFinite(form.lat) && Number.isFinite(form.lng)
      const { error } = await db.resources().insert({
        provider_id: form.provider_id,
        name: form.name,
        description: form.description,
        category: form.category,
        address: { street: form.street, city: form.city, state: form.state, zip: form.zip },
        lat: hasCoords ? form.lat : null,
        lng: hasCoords ? form.lng : null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        availability_status: form.availability_status,
        beds_total: form.beds_total ?? null,
        beds_available: form.beds_available ?? null,
        is_active: true,
        verification_status: 'verified',
        resource_type: form.resource_type || null,
        access_type: form.access_type as ResourceAccessType,
        // Both conditions: a walk-in listing still needs coordinates to be
        // map-ready, and a phone/web-intake listing is never map-ready even if
        // someone typed an office address in.
        is_map_ready: hasCoords && !NON_WALK_IN_ACCESS.includes(form.access_type),
      })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Resource created', 'The resource has been added and is now live')
      queryClient.invalidateQueries({ queryKey: ['admin-stats-resources'] })

      if (showAddAnother) {
        // Reset form for adding another (keep the same provider)
        setForm({
          provider_id: form.provider_id,
          name: '',
          description: '',
          category: 'other',
          resource_type: '',
          access_type: 'onsite',
          street: '',
          city: '',
          state: 'FL',
          zip: '',
          lat: 27.9506,
          lng: -82.4572,
          phone: '',
          email: '',
          website: '',
          availability_status: 'available',
        })
      } else {
        navigate('/admin/resources')
      }
    },
    onError: (err: Error) => {
      toast.error('Failed to create resource', err.message)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createResource.mutate()
  }

  const isShelter = form.category === 'shelter'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Add Resource</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manually create a new resource listing</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 max-w-2xl">
        {/* Provider */}
        <div className="mb-6">
          <label className="label">Provider *</label>
          <select
            required
            value={form.provider_id}
            onChange={e => setForm({ ...form, provider_id: e.target.value })}
            className="input w-full"
          >
            <option value="">Select a verified provider…</option>
            {providers?.map(p => (
              <option key={p.id} value={p.id}>{p.organization_name}</option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="label">Resource Name *</label>
          <input
            type="text"
            required
            placeholder="e.g., Downtown Community Shelter"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="input w-full"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="label">Description</label>
          <textarea
            placeholder="Details about this resource…"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="input w-full"
          />
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="label">Category *</label>
          <select
            required
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value as ResourceCategory })}
            className="input w-full"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Type and access. Without these the normal "Add Resource" flow could
            not produce a usable housing listing at all: no housing type means
            no /housing shortcut matches it, and no access type means a voucher
            programme has to be given an invented street address. */}
        <div className="mb-6">
          <label className="label">Type</label>
          <select
            value={form.resource_type}
            onChange={e => setForm({ ...form, resource_type: e.target.value })}
            className="input w-full"
          >
            <option value="">Not specified</option>
            {RESOURCE_TYPE_OPTIONS.map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="label">How people reach this</label>
          <select
            value={form.access_type}
            onChange={e => setForm({ ...form, access_type: e.target.value })}
            className="input w-full"
          >
            {ACCESS_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        {/* Address */}
        <div className="mb-6">
          <label className="label">Street Address</label>
          <input
            type="text"
            placeholder="123 Main St"
            value={form.street}
            onChange={e => setForm({ ...form, street: e.target.value })}
            className="input w-full"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="col-span-2">
            <label className="label">City</label>
            <input
              type="text"
              placeholder="Tampa"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">State</label>
            <input
              type="text"
              placeholder="FL"
              value={form.state}
              onChange={e => setForm({ ...form, state: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">ZIP</label>
            <input
              type="text"
              placeholder="33602"
              value={form.zip}
              onChange={e => setForm({ ...form, zip: e.target.value })}
              className="input w-full"
            />
          </div>
        </div>

        {/* Lat/Lng */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.lat}
              onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.lng}
              onChange={e => setForm({ ...form, lng: parseFloat(e.target.value) })}
              className="input w-full"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="mb-6">
          <label className="label">Phone</label>
          <input
            type="tel"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="input w-full"
          />
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="label">Email</label>
          <input
            type="email"
            placeholder="contact@example.org"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="input w-full"
          />
        </div>

        {/* Website */}
        <div className="mb-6">
          <label className="label">Website</label>
          <input
            type="url"
            placeholder="https://example.org"
            value={form.website}
            onChange={e => setForm({ ...form, website: e.target.value })}
            className="input w-full"
          />
        </div>

        {/* Availability Status */}
        <div className="mb-6">
          <label className="label">Availability Status</label>
          <select
            value={form.availability_status}
            onChange={e => setForm({ ...form, availability_status: e.target.value })}
            className="input w-full"
          >
            {AVAILABILITY_STATUS.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        {/* Beds (shelters only) */}
        {isShelter && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">Total Beds</label>
              <input
                type="number"
                min="0"
                value={form.beds_total || ''}
                onChange={e => setForm({ ...form, beds_total: e.target.value ? parseInt(e.target.value) : undefined })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Available Beds</label>
              <input
                type="number"
                min="0"
                value={form.beds_available || ''}
                onChange={e => setForm({ ...form, beds_available: e.target.value ? parseInt(e.target.value) : undefined })}
                className="input w-full"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/admin/resources')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createResource.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {createResource.isPending ? 'Creating…' : 'Create Resource'}
          </button>
        </div>

        {createResource.isSuccess && !showAddAnother && (
          <button
            type="button"
            onClick={() => setShowAddAnother(true)}
            className="w-full mt-3 btn-secondary flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Another
          </button>
        )}
      </form>
    </div>
  )
}
