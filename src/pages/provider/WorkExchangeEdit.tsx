import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import type { WorkExchange } from '@/types'

const EXCHANGE_TYPES = ['volunteering', 'paid', 'skills_trade', 'internship'] as const

const schema = z.object({
  title:           z.string().min(3, 'Title required'),
  description:     z.string().min(10, 'Please add a short description'),
  exchange_type:   z.enum(EXCHANGE_TYPES),
  hours_per_week:  z.coerce.number().int().min(1).max(168).optional().nullable(),
  compensation:    z.string().optional(),
  skills_required: z.string().optional(), // comma-separated
  skills_gained:   z.string().optional(), // comma-separated
  street:          z.string().min(3, 'Street required'),
  city:            z.string().min(2, 'City required'),
  state:           z.string().length(2, '2-letter state code'),
  zip:             z.string().min(5, 'ZIP required'),
  lat:             z.coerce.number().min(-90).max(90).optional().nullable(),
  lng:             z.coerce.number().min(-180).max(180).optional().nullable(),
})

type FormData = z.infer<typeof schema>

const TYPE_LABELS: Record<string, string> = {
  volunteering: 'Volunteering',
  paid:         'Paid Position',
  skills_trade: 'Skills Trade',
  internship:   'Internship',
}

export default function WorkExchangeEdit() {
  const { id }         = useParams<{ id?: string }>()
  const isNew          = !id || id === 'new'
  const { providerId } = useAuthStore()
  const navigate       = useNavigate()
  const toast          = useToast()
  const qc             = useQueryClient()

  const { data: existing } = useQuery<WorkExchange | null>({
    queryKey: ['work-exchange', id],
    queryFn: async () => {
      if (isNew) return null
      const { data } = await db.work_exchanges().select('*').eq('id', id!).single()
      return data as unknown as WorkExchange
    },
    enabled: !isNew,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { exchange_type: 'volunteering' },
    })

  useEffect(() => {
    if (existing) {
      reset({
        title:           existing.title,
        description:     existing.description,
        exchange_type:   existing.exchange_type as typeof EXCHANGE_TYPES[number],
        hours_per_week:  existing.hours_per_week ?? undefined,
        compensation:    existing.compensation ?? '',
        skills_required: existing.skills_required?.join(', ') ?? '',
        skills_gained:   existing.skills_gained?.join(', ') ?? '',
        street:          (existing.address as { street?: string }).street ?? '',
        city:            existing.address?.city ?? '',
        state:           existing.address?.state ?? '',
        zip:             (existing.address as { zip?: string }).zip ?? '',
        lat:             existing.lat ?? undefined,
        lng:             existing.lng ?? undefined,
      })
    }
  }, [existing, reset])

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        provider_id:     providerId!,
        title:           data.title,
        description:     data.description,
        exchange_type:   data.exchange_type,
        hours_per_week:  data.hours_per_week ?? null,
        compensation:    data.compensation || null,
        skills_required: data.skills_required
          ? data.skills_required.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        skills_gained: data.skills_gained
          ? data.skills_gained.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        address: { street: data.street, city: data.city, state: data.state, zip: data.zip },
        lat:     data.lat ?? null,
        lng:     data.lng ?? null,
        is_active: true,
      }
      if (isNew) {
        const { error } = await db.work_exchanges().insert(payload)
        if (error) throw error
      } else {
        const { error } = await db.work_exchanges().update(payload).eq('id', id!)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(isNew ? 'Opportunity posted!' : 'Opportunity updated!')
      qc.invalidateQueries({ queryKey: ['provider-work-exchanges'] })
      navigate('/portal/work')
    },
    onError: (e: Error) => toast.error('Save failed', e.message),
  })

  const deleteListing = useMutation({
    mutationFn: async () => {
      const { error } = await db.work_exchanges().delete().eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Opportunity deleted')
      qc.invalidateQueries({ queryKey: ['provider-work-exchanges'] })
      navigate('/portal/work')
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Post Opportunity' : 'Edit Opportunity'}
          </h1>
          <p className="text-sm text-gray-500">
            {isNew ? 'Add a work exchange or volunteer opportunity' : 'Update this opportunity'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-5">

        {/* Basic info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Opportunity Details</h2>
          <Field label="Title" name="title" required placeholder="Kitchen Assistant Needed" />

          <div>
            <label className="label">Type *</label>
            <select {...register('exchange_type')} className={errors.exchange_type ? 'input-error' : 'input'}>
              {EXCHANGE_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            {errors.exchange_type && <p className="error-text">{errors.exchange_type.message}</p>}
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea
              {...register('description')}
              className={`input min-h-[80px] resize-none ${errors.description ? 'input-error' : ''}`}
              placeholder="What will volunteers/workers do? Who should apply?"
            />
            {errors.description && <p className="error-text">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hours per week" name="hours_per_week" type="number" placeholder="10" />
            <div>
              <label className="label">Compensation</label>
              <input
                {...register('compensation')}
                className="input"
                placeholder="Meals provided, $15/hr, Skills trade…"
              />
            </div>
          </div>

          <div>
            <label className="label">Skills required <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input {...register('skills_required')} className="input" placeholder="Cooking, Lifting, Driving" />
          </div>
          <div>
            <label className="label">Skills gained <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input {...register('skills_gained')} className="input" placeholder="Food safety, Customer service" />
          </div>
        </div>

        {/* Location */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Location</h2>
          <Field label="Street address" name="street" required placeholder="123 Main St" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" name="city" required placeholder="Tampa" />
            <Field label="State" name="state" required placeholder="FL" />
          </div>
          <Field label="ZIP code" name="zip" required placeholder="33602" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" name="lat" type="number" placeholder="27.9506" />
            <Field label="Longitude" name="lng" type="number" placeholder="-82.4572" />
          </div>
          <p className="text-xs text-gray-400">💡 Lat/lng optional — right-click on Google Maps → "What's here?" to find them</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || save.isPending}
            className="btn-primary flex-1"
          >
            {save.isPending ? 'Saving…' : isNew ? 'Post Opportunity' : 'Save Changes'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Delete this opportunity? This cannot be undone.'))
                  deleteListing.mutate()
              }}
              className="btn-danger btn-sm px-4"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
