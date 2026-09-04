import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import HousingDetailsFields from '@/components/housing/HousingDetailsFields'
import { NON_WALK_IN_ACCESS } from '@/lib/transport'
import { RESOURCE_TYPE_LABEL } from '@/lib/mapFilters'
import type { Resource } from '@/types'

/**
 * Access types that have no public front door.
 *
 * A resource with one of these is not a place you walk into: a voucher
 * programme run out of a housing authority office, a navigation service on a
 * phone line, a DV shelter whose address is confidential on purpose. Requiring
 * a street address for them forces an operator to invent one — which is how a
 * directory ends up sending somebody to a building that is not there.
 */
/**
 * Two different questions, deliberately two different lists.
 *
 * NON_WALK_IN_ACCESS (imported, shared with the public renderers) answers
 * "is there a front door?" — it decides whether an address is required here
 * and whether the address and directions are shown publicly.
 *
 * NEVER_MAP_READY additionally includes `not_map_ready`, which is a different
 * claim: the place is real and people can go to it, but its pin has not been
 * confirmed. Such a listing still needs its address; it just must not appear
 * on the map yet.
 */
const NEVER_MAP_READY = [...NON_WALK_IN_ACCESS, 'not_map_ready']

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

const CATEGORIES = [
  'shelter','housing','food','work_exchange','mental_health','medical',
  'legal','hygiene','clothing','childcare','transportation','outdoor_space','other',
]

const schema = z.object({
  name:                z.string().min(2, 'Name required'),
  description:         z.string().min(10, 'Please write a brief description'),
  category:            z.enum(CATEGORIES as [string, ...string[]]),
  resource_type:       z.string().optional(),
  access_type:         z.string().optional(),
  phone:               z.string().optional(),
  email:               z.string().email().optional().or(z.literal('')),
  website:             z.string().url().optional().or(z.literal('')),
  street:              z.string().optional().or(z.literal('')),
  city:                z.string().min(2, 'City required'),
  state:               z.string().length(2, '2-letter state code'),
  zip:                 z.string().optional().or(z.literal('')),
  lat:                 z.coerce.number().min(-90).max(90).optional().nullable(),
  lng:                 z.coerce.number().min(-180).max(180).optional().nullable(),
  walk_ins_accepted:   z.boolean().default(true),
  requires_id:         z.boolean().default(false),
  requires_referral:   z.boolean().default(false),
  beds_total:          z.coerce.number().int().min(0).optional(),
  beds_available:      z.coerce.number().int().min(0).optional(),
  availability_status: z.enum(['available','limited','full','unknown','closed']),
  languages_spoken:    z.string().optional(), // comma-separated
  tags:                z.string().optional(),
})
  // The street address is required only for a walk-in listing. Making it
  // unconditional is what would force an operator to invent one for a voucher
  // programme or a confidential-address shelter.
  .superRefine((v, ctx) => {
    const walkIn = !NON_WALK_IN_ACCESS.includes(v.access_type || 'onsite')
    if (walkIn && (!v.street || v.street.trim().length < 3)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['street'], message: 'Street address required for a walk-in location' })
    }
    if (walkIn && (!v.zip || v.zip.trim().length < 5)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zip'], message: 'ZIP required for a walk-in location' })
    }
  })

type FormData = z.infer<typeof schema>

export default function ProviderListingEdit() {
  const { id }         = useParams<{ id?: string }>()
  const isNew          = !id || id === 'new'
  const { providerId } = useAuthStore()
  const navigate       = useNavigate()
  const toast          = useToast()
  const qc             = useQueryClient()

  const { data: existing } = useQuery<Resource | null>({
    queryKey: ['resource', id],
    queryFn: async () => {
      if (isNew) return null
      const { data } = await db.resources().select('*').eq('id', id!).single()
      return data as unknown as Resource
    },
    enabled: !isNew,
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { availability_status: 'unknown', walk_ins_accepted: true } })

  useEffect(() => {
    if (existing) {
      reset({
        name:                existing.name,
        description:         existing.description,
        category:            existing.category,
        resource_type:       existing.resource_type ?? '',
        access_type:         existing.access_type ?? 'onsite',
        phone:               existing.phone ?? '',
        email:               existing.email ?? '',
        website:             existing.website ?? '',
        street:              (existing.address as { street?: string }).street ?? '',
        city:                existing.address.city ?? '',
        state:               existing.address.state ?? '',
        zip:                 (existing.address as { zip?: string }).zip ?? '',
        lat:                 existing.lat ?? undefined,
        lng:                 existing.lng ?? undefined,
        walk_ins_accepted:   existing.walk_ins_accepted,
        requires_id:         existing.requires_id,
        requires_referral:   existing.requires_referral,
        beds_total:          existing.beds_total ?? undefined,
        beds_available:      existing.beds_available ?? undefined,
        availability_status: existing.availability_status,
        languages_spoken:    existing.languages_spoken?.join(', ') ?? '',
        tags:                existing.tags?.join(', ') ?? '',
      })
    }
  }, [existing, reset])

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        provider_id:         providerId!,
        name:                data.name,
        description:         data.description,
        category:            data.category as Resource['category'],
        resource_type:       data.resource_type || null,
        access_type:         (data.access_type || 'onsite') as Resource['access_type'],
        // Map readiness is only ever forced DOWN here, never up.
        //
        // A non-walk-in listing must not be map-ready. But the reverse does not
        // follow: is_map_ready is an independent admin gate, and migration 017
        // deliberately imports rows as false while carrying city-centroid
        // coordinates, pending someone confirming the real address. Deriving
        // `true` from access_type would have flipped those to map-ready on any
        // unrelated edit — publishing an unverified pin at a city centre
        // because somebody fixed a typo in the description.
        is_map_ready:        NEVER_MAP_READY.includes(data.access_type || 'onsite')
                               ? false
                               : existing?.is_map_ready ?? true,
        phone:               data.phone || null,
        email:               data.email || null,
        website:             data.website || null,
        address:             { street: data.street ?? '', city: data.city, state: data.state, zip: data.zip ?? '' },
        lat:                 data.lat,
        lng:                 data.lng,
        walk_ins_accepted:   data.walk_ins_accepted,
        requires_id:         data.requires_id,
        requires_referral:   data.requires_referral,
        beds_total:          data.beds_total ?? null,
        beds_available:      data.beds_available ?? null,
        availability_status: data.availability_status as Resource['availability_status'],
        languages_spoken:    data.languages_spoken ? data.languages_spoken.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags:                data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        hours_of_operation:  {},
        is_active:           true,
        verification_status: 'pending' as const,
        photos:              [],
        // A full edit-and-save is itself a freshness signal — see
        // getTrustInfo() in mapFilters.ts, which this field drives.
        last_provider_update_at: new Date().toISOString(),
      }
      if (isNew) {
        const { error } = await db.resources().insert(payload)
        if (error) throw error
      } else {
        const { error } = await db.resources().update(payload).eq('id', id!)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(isNew ? 'Listing created!' : 'Listing updated!')
      qc.invalidateQueries({ queryKey: ['provider-resources'] })
      navigate('/portal/listings')
    },
    onError: (e: Error) => toast.error('Save failed', e.message),
  })

  const deleteListing = useMutation({
    mutationFn: async () => {
      const { error } = await db.resources().delete().eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Listing deleted')
      qc.invalidateQueries({ queryKey: ['provider-resources'] })
      navigate('/portal/listings')
    },
    onError: (e: Error) => toast.error('Delete failed', e.message),
  })

  function Field({ label, name, type = 'text', placeholder, required }: {
    label: string; name: keyof FormData; type?: string; placeholder?: string; required?: boolean
  }) {
    const err = errors[name]
    return (
      <div>
        <label className="label">{label}{required && ' *'}</label>
        <input {...register(name)} type={type} placeholder={placeholder}
          className={err ? 'input-error' : 'input'} />
        {err && <p className="error-text">{String(err.message)}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'New Listing' : 'Edit Listing'}</h1>
          <p className="text-sm text-gray-500">{isNew ? 'Create a new resource on the map' : 'Update your resource details'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-5">
        {/* Basic info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <Field label="Resource name" name="name" required placeholder="Downtown Men's Shelter" />
          <div>
            <label className="label">Category *</label>
            <select {...register('category')} className={errors.category ? 'input-error' : 'input'}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {/* Resource type. Neither form exposed this before, so every listing
              created through the UI carried resource_type = NULL. Tolerable for
              a pantry, where the category carries the meaning — not for housing,
              where the /housing shortcuts filter on exactly this column, so an
              affordable-housing listing with no type matches none of them. */}
          <div>
            <label className="label">Type</label>
            <select {...register('resource_type')} className="input">
              <option value="">Not specified</option>
              {RESOURCE_TYPE_OPTIONS.map(v => (
                <option key={v} value={v}>{RESOURCE_TYPE_LABEL[v] ?? v.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          {/* Access type. This is what lets a voucher programme or a
              confidential-address shelter be entered honestly: pick a
              non-walk-in type and the street address stops being required,
              and the row is saved as not map-ready rather than demanding
              coordinates it has no way to supply. */}
          <div>
            <label htmlFor="access_type" className="label">How people reach this</label>
            <select id="access_type" {...register('access_type')} className="input">
              {ACCESS_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea {...register('description')} className={`input min-h-[80px] resize-none ${errors.description ? 'input-error' : ''}`}
              placeholder="What services do you provide? Who do you serve?" />
            {errors.description && <p className="error-text">{errors.description.message}</p>}
          </div>
        </div>

        {/* Location */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Location</h2>
          <Field label="Street address" name="street" required placeholder="123 Main St" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" name="city" required placeholder="Los Angeles" />
            <Field label="State" name="state" required placeholder="CA" />
          </div>
          <Field label="ZIP code" name="zip" required placeholder="90001" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" name="lat" type="number" required placeholder="34.0522" />
            <Field label="Longitude" name="lng" type="number" required placeholder="-118.2437" />
          </div>
          <p className="text-xs text-gray-400">💡 Tip: Find lat/lng at maps.google.com — right-click any location → "What's here?"</p>
        </div>

        {/* Contact */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Contact Info</h2>
          <Field label="Phone" name="phone" type="tel" placeholder="(213) 555-0100" />
          <Field label="Email" name="email" type="email" placeholder="info@shelter.org" />
          <Field label="Website" name="website" placeholder="https://yourorg.org" />
        </div>

        {/* Availability */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Availability</h2>
          <div>
            <label className="label">Status *</label>
            <select {...register('availability_status')} className="input">
              {['available','limited','full','unknown','closed'].map(s =>
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total beds" name="beds_total" type="number" placeholder="50" />
            <Field label="Available beds" name="beds_available" type="number" placeholder="12" />
          </div>
          <div className="space-y-2.5">
            {([
              ['walk_ins_accepted', 'Walk-ins accepted'],
              ['requires_id',      'ID required'],
              ['requires_referral','Referral required'],
            ] as [keyof FormData, string][]).map(([field, label]) => (
              <label key={field} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...register(field)} className="w-4 h-4 accent-primary-600" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tags & Languages */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Search & Discovery</h2>
          <div>
            <label className="label">Languages spoken <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input {...register('languages_spoken')} className="input" placeholder="English, Spanish, Mandarin" />
          </div>
          <div>
            <label className="label">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input {...register('tags')} className="input" placeholder="veterans, families, lgbtq-friendly" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary flex-1">
            {save.isPending ? 'Saving…' : isNew ? 'Create Listing' : 'Save Changes'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => { if (confirm('Delete this listing? This cannot be undone.')) deleteListing.mutate() }}
              className="btn-danger btn-sm px-4"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Housing details live in their own table with their own RLS, so they
          save separately from the listing above. Renders nothing unless the
          category is housing. */}
      <HousingDetailsFields resourceId={isNew ? undefined : id} category={watch('category')} />
    </div>
  )
}
