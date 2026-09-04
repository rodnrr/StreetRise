import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import HousingDetailsFields from '@/components/housing/HousingDetailsFields'
import { NON_WALK_IN_ACCESS } from '@/lib/transport'
import { RESOURCE_TYPE_LABEL } from '@/lib/mapFilters'
import { getTrustInfo, TRUST_LEVEL_CLASSES } from '@/lib/mapFilters'
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

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const

const schema = z.object({
  name:                z.string().min(2),
  description:         z.string().min(5),
  category:            z.enum(CATEGORIES as [string, ...string[]]),
  resource_type:       z.string().optional(),
  access_type:         z.string().optional(),
  verification_status: z.enum(['pending','verified','rejected','suspended']),
  availability_status: z.enum(['available','limited','full','unknown','closed']),
  is_active:           z.boolean(),
  phone:               z.string().optional(),
  email:               z.string().email().optional().or(z.literal('')),
  website:             z.string().url().optional().or(z.literal('')),
  street:              z.string().optional().or(z.literal('')),
  city:                z.string().min(2),
  state:               z.string().length(2),
  zip:                 z.string().optional().or(z.literal('')),
  lat:                 z.coerce.number().min(-90).max(90).optional().nullable(),
  lng:                 z.coerce.number().min(-180).max(180).optional().nullable(),
  beds_total:          z.coerce.number().int().min(0).optional().nullable(),
  beds_available:      z.coerce.number().int().min(0).optional().nullable(),
  walk_ins_accepted:   z.boolean(),
  requires_id:         z.boolean(),
  requires_referral:   z.boolean(),
  languages_spoken:    z.string().optional(),
  tags:                z.string().optional(),
  // Hours — one open/close/closed per day
  mon_open: z.string().optional(), mon_close: z.string().optional(), mon_closed: z.boolean().optional(),
  tue_open: z.string().optional(), tue_close: z.string().optional(), tue_closed: z.boolean().optional(),
  wed_open: z.string().optional(), wed_close: z.string().optional(), wed_closed: z.boolean().optional(),
  thu_open: z.string().optional(), thu_close: z.string().optional(), thu_closed: z.boolean().optional(),
  fri_open: z.string().optional(), fri_close: z.string().optional(), fri_closed: z.boolean().optional(),
  sat_open: z.string().optional(), sat_close: z.string().optional(), sat_closed: z.boolean().optional(),
  sun_open: z.string().optional(), sun_close: z.string().optional(), sun_closed: z.boolean().optional(),
  hours_notes: z.string().optional(),
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

const DAY_PREFIX: Record<typeof DAYS[number], string> = {
  monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu',
  friday: 'fri', saturday: 'sat', sunday: 'sun',
}

export default function AdminResourceEdit() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast    = useToast()
  const qc       = useQueryClient()

  const { data: resource, isLoading } = useQuery<Resource | null>({
    queryKey: ['resource', id],
    queryFn: async () => {
      const { data } = await db.resources().select('*').eq('id', id!).single()
      return data as unknown as Resource
    },
    enabled: !!id,
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!resource) return
    const h = (resource.hours_of_operation ?? {}) as Record<string, { open?: string; close?: string; closed?: boolean }>
    reset({
      name:                resource.name,
      description:         resource.description,
      category:            resource.category,
      resource_type:       resource.resource_type ?? '',
      access_type:         resource.access_type ?? 'onsite',
      verification_status: resource.verification_status,
      availability_status: resource.availability_status,
      is_active:           resource.is_active,
      phone:               resource.phone ?? '',
      email:               resource.email ?? '',
      website:             resource.website ?? '',
      street:              (resource.address as { street?: string }).street ?? '',
      city:                resource.address.city,
      state:               resource.address.state,
      zip:                 (resource.address as { zip?: string }).zip ?? '',
      lat:                 resource.lat ?? undefined,
      lng:                 resource.lng ?? undefined,
      beds_total:          resource.beds_total ?? undefined,
      beds_available:      resource.beds_available ?? undefined,
      walk_ins_accepted:   resource.walk_ins_accepted,
      requires_id:         resource.requires_id,
      requires_referral:   resource.requires_referral,
      languages_spoken:    resource.languages_spoken?.join(', ') ?? '',
      tags:                resource.tags?.join(', ') ?? '',
      mon_open: h.monday?.open, mon_close: h.monday?.close, mon_closed: h.monday?.closed,
      tue_open: h.tuesday?.open, tue_close: h.tuesday?.close, tue_closed: h.tuesday?.closed,
      wed_open: h.wednesday?.open, wed_close: h.wednesday?.close, wed_closed: h.wednesday?.closed,
      thu_open: h.thursday?.open, thu_close: h.thursday?.close, thu_closed: h.thursday?.closed,
      fri_open: h.friday?.open, fri_close: h.friday?.close, fri_closed: h.friday?.closed,
      sat_open: h.saturday?.open, sat_close: h.saturday?.close, sat_closed: h.saturday?.closed,
      sun_open: h.sunday?.open, sun_close: h.sunday?.close, sun_closed: h.sunday?.closed,
      hours_notes: (h as { notes?: string }).notes ?? '',
    })
  }, [resource, reset])

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const hours_of_operation: Record<string, unknown> = {}
      for (const day of DAYS) {
        const p = DAY_PREFIX[day]
        const open   = data[`${p}_open`  as keyof FormData] as string | undefined
        const close  = data[`${p}_close` as keyof FormData] as string | undefined
        const closed = data[`${p}_closed` as keyof FormData] as boolean | undefined
        if (open || close || closed) {
          hours_of_operation[day] = { open: open ?? '', close: close ?? '', closed: !!closed }
        }
      }
      if (data.hours_notes) hours_of_operation.notes = data.hours_notes

      const { error } = await db.resources().update({
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
                               : resource?.is_map_ready ?? true,
        verification_status: data.verification_status as Resource['verification_status'],
        availability_status: data.availability_status as Resource['availability_status'],
        is_active:           data.is_active,
        phone:               data.phone || null,
        email:               data.email || null,
        website:             data.website || null,
        address:             { street: data.street ?? '', city: data.city, state: data.state, zip: data.zip ?? '' },
        lat:                 data.lat ?? null,
        lng:                 data.lng ?? null,
        beds_total:          data.beds_total ?? null,
        beds_available:      data.beds_available ?? null,
        walk_ins_accepted:   data.walk_ins_accepted,
        requires_id:         data.requires_id,
        requires_referral:   data.requires_referral,
        languages_spoken:    data.languages_spoken ? data.languages_spoken.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags:                data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        hours_of_operation,
      }).eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Resource updated')
      qc.invalidateQueries({ queryKey: ['admin-resources'] })
      qc.invalidateQueries({ queryKey: ['resource', id] })
      navigate('/admin/resources')
    },
    onError: (e: Error) => toast.error('Save failed', e.message),
  })

  // Explicit, separate from the general save above: admins editing an
  // unrelated field (e.g. fixing a typo) shouldn't silently clear the
  // "may be outdated" warning. This is a deliberate "I've confirmed this
  // is current" action — the same freshness signal a provider gives by
  // updating their bed count (see BedCountUpdater.tsx).
  const renewTrust = useMutation({
    mutationFn: async () => {
      const { error } = await db.resources()
        .update({ last_provider_update_at: new Date().toISOString() })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Marked as current', 'The "may be outdated" warning is cleared')
      qc.invalidateQueries({ queryKey: ['admin-resources'] })
      qc.invalidateQueries({ queryKey: ['resource', id] })
    },
    onError: (e: Error) => toast.error('Failed to update', e.message),
  })

  if (isLoading) return <div className="skeleton h-96 w-full" />
  if (!resource) return <p className="text-gray-400">Resource not found.</p>

  const isShelter = watch('category') === 'shelter'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/resources')} className="btn-icon text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Resource</h1>
          <p className="text-sm text-gray-400">{resource.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-5">

        {/* Status controls — top priority for admin */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Status & Moderation</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-gray-300">Verification status</label>
              <select {...register('verification_status')} className="input bg-gray-700 border-gray-600 text-white">
                {['pending','verified','rejected','suspended'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-gray-300">Availability</label>
              <select {...register('availability_status')} className="input bg-gray-700 border-gray-600 text-white">
                {['available','limited','full','unknown','closed'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('is_active')} className="w-4 h-4 accent-primary-600" />
            <span className="text-sm text-gray-300">Listing is active (visible on map)</span>
          </label>

          {/* Freshness / trust — last_provider_update_at drives the public
              "may be outdated" label (getTrustInfo, mapFilters.ts). Nothing
              else in the app writes this field, so without this control it
              can only ever get more stale, never less. */}
          {(() => {
            const trust = getTrustInfo(resource)
            return (
              <div className="flex items-center justify-between rounded-xl bg-gray-700/50 p-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Freshness</p>
                  <span className={clsx('inline-flex items-center text-xs rounded-full px-2 py-0.5', TRUST_LEVEL_CLASSES[trust.level])}>
                    {trust.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => renewTrust.mutate()}
                  disabled={renewTrust.isPending}
                  className="btn-secondary btn-sm gap-1.5"
                >
                  <RefreshCw size={13} className={renewTrust.isPending ? 'animate-spin' : ''} />
                  Mark as Current
                </button>
              </div>
            )
          })()}
        </div>

        {/* Basic info */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Basic Information</h2>
          <div>
            <label className="label text-gray-300">Name *</label>
            <input {...register('name')} className={`input bg-gray-700 border-gray-600 text-white ${errors.name ? 'border-red-500' : ''}`} />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label text-gray-300">Category *</label>
            <select {...register('category')} className="input bg-gray-700 border-gray-600 text-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          {/* Resource type. Neither form exposed this before, so every listing
              created through the UI carried resource_type = NULL. Tolerable for
              a pantry, where the category carries the meaning — not for housing,
              where the /housing shortcuts filter on exactly this column, so an
              affordable-housing listing with no type matches none of them. */}
          <div>
            <label className="label text-gray-300">Type</label>
            <select {...register('resource_type')} className="input bg-gray-700 border-gray-600 text-white">
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
            <label htmlFor="access_type" className="label text-gray-300">How people reach this</label>
            <select id="access_type" {...register('access_type')} className="input bg-gray-700 border-gray-600 text-white">
              {ACCESS_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-gray-300">Description *</label>
            <textarea {...register('description')} className="input bg-gray-700 border-gray-600 text-white min-h-[80px] resize-none" />
            {errors.description && <p className="error-text">{errors.description.message}</p>}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Contact Info</h2>
          {[
            { label: 'Phone', name: 'phone' as const, type: 'tel' },
            { label: 'Email', name: 'email' as const, type: 'email' },
            { label: 'Website', name: 'website' as const, type: 'text' },
          ].map(({ label, name, type }) => (
            <div key={name}>
              <label className="label text-gray-300">{label}</label>
              <input {...register(name)} type={type} className="input bg-gray-700 border-gray-600 text-white" />
              {errors[name] && <p className="error-text">{String(errors[name]?.message)}</p>}
            </div>
          ))}
        </div>

        {/* Location */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Location</h2>
          <div>
            <label className="label text-gray-300">Street *</label>
            <input {...register('street')} className="input bg-gray-700 border-gray-600 text-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label text-gray-300">City *</label>
              <input {...register('city')} className="input bg-gray-700 border-gray-600 text-white" />
            </div>
            <div>
              <label className="label text-gray-300">State *</label>
              <input {...register('state')} className="input bg-gray-700 border-gray-600 text-white" placeholder="FL" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-gray-300">ZIP *</label>
              <input {...register('zip')} className="input bg-gray-700 border-gray-600 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-gray-300">Latitude</label>
              <input {...register('lat')} type="number" step="any" className="input bg-gray-700 border-gray-600 text-white" />
            </div>
            <div>
              <label className="label text-gray-300">Longitude</label>
              <input {...register('lng')} type="number" step="any" className="input bg-gray-700 border-gray-600 text-white" />
            </div>
          </div>
        </div>

        {/* Beds — shelter only */}
        {isShelter && (
          <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-white">Bed Availability</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-gray-300">Total beds</label>
                <input {...register('beds_total')} type="number" className="input bg-gray-700 border-gray-600 text-white" />
              </div>
              <div>
                <label className="label text-gray-300">Available beds</label>
                <input {...register('beds_available')} type="number" className="input bg-gray-700 border-gray-600 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Intake rules */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-white">Intake Requirements</h2>
          {([
            ['walk_ins_accepted', 'Walk-ins accepted'],
            ['requires_id',      'ID required'],
            ['requires_referral','Referral required'],
          ] as [keyof FormData, string][]).map(([field, label]) => (
            <label key={field} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register(field)} className="w-4 h-4 accent-primary-600" />
              <span className="text-sm text-gray-300">{label}</span>
            </label>
          ))}
        </div>

        {/* Hours of operation */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-white">Hours of Operation</h2>
          <div className="space-y-2">
            {DAYS.map(day => {
              const p = DAY_PREFIX[day]
              const isClosed = watch(`${p}_closed` as keyof FormData)
              return (
                <div key={day} className="grid grid-cols-[90px_1fr_1fr_80px] gap-2 items-center">
                  <span className="text-sm text-gray-400 capitalize">{day.slice(0,3)}</span>
                  <input
                    {...register(`${p}_open` as keyof FormData)}
                    type="time"
                    disabled={!!isClosed}
                    className="input bg-gray-700 border-gray-600 text-white text-sm disabled:opacity-40"
                  />
                  <input
                    {...register(`${p}_close` as keyof FormData)}
                    type="time"
                    disabled={!!isClosed}
                    className="input bg-gray-700 border-gray-600 text-white text-sm disabled:opacity-40"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" {...register(`${p}_closed` as keyof FormData)} className="w-3.5 h-3.5" />
                    Closed
                  </label>
                </div>
              )
            })}
          </div>
          <div>
            <label className="label text-gray-300">Hours notes</label>
            <input {...register('hours_notes')} className="input bg-gray-700 border-gray-600 text-white" placeholder="e.g. Call ahead on holidays" />
          </div>
        </div>

        {/* Tags & languages */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Search & Discovery</h2>
          <div>
            <label className="label text-gray-300">Languages spoken <span className="text-gray-500">(comma-separated)</span></label>
            <input {...register('languages_spoken')} className="input bg-gray-700 border-gray-600 text-white" placeholder="English, Spanish" />
          </div>
          <div>
            <label className="label text-gray-300">Tags <span className="text-gray-500">(comma-separated)</span></label>
            <input {...register('tags')} className="input bg-gray-700 border-gray-600 text-white" placeholder="veterans, families" />
          </div>
        </div>

        <div className="flex gap-3 pb-8">
          <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary flex-1">
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate('/admin/resources')} className="btn-secondary px-6">
            Cancel
          </button>
        </div>
      </form>

      {/* Same shared section the provider portal mounts — one housing editor,
          two places it appears. */}
      <HousingDetailsFields resourceId={id} category={watch('category')} dark />
    </div>
  )
}
