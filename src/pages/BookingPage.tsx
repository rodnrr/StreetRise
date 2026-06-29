import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, ArrowLeft, Users, Calendar, MessageSquare, BedDouble } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import type { Resource } from '@/types'

const schema = z.object({
  requester_name:  z.string().trim().min(2, 'Name required'),
  requester_phone: z.string().trim().optional(),
  requester_email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  contact_preference: z.enum(['phone', 'email', 'either']),
  best_contact_time: z.string().trim().max(120).optional(),
  contact_consent: z.boolean().refine(Boolean, 'Contact consent is required'),
  adults:          z.coerce.number().int().min(1, 'At least 1 adult'),
  children:        z.coerce.number().int().min(0).default(0),
  check_in_date:   z.string().optional(),
  check_out_date:  z.string().optional(),
  notes:           z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (!data.requester_phone && !data.requester_email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['requester_phone'], message: 'Phone or email required' })
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['requester_email'], message: 'Phone or email required' })
  }
})
type FormData = z.infer<typeof schema>

const STATUS_STYLE: Record<string, string> = {
  available: 'text-success-600 bg-success-50',
  limited:   'text-warning-600 bg-warning-50',
  full:      'text-danger-600 bg-danger-50',
  unknown:   'text-gray-500 bg-gray-100',
  closed:    'text-gray-500 bg-gray-100',
}

const STATUS_LABEL: Record<string, string> = {
  available: 'Open Now',
  limited:   'Limited Availability',
  full:      'Unavailable',
  unknown:   'Availability Unknown',
  closed:    'Closed',
}

function getBookingLabel(resource: Resource, isFull: boolean): string {
  if (isFull) return 'Join the Waitlist'
  return resource.category === 'shelter' ? 'Request a Spot' : 'Request Help'
}

export default function BookingPage() {
  const { resourceId }  = useParams<{ resourceId: string }>()
  const [done, setDone] = useState(false)
  const toast           = useToast()

  const { data: resource } = useQuery<Resource | null>({
    queryKey: ['resource', resourceId],
    queryFn: async () => {
      const { data } = await db.resources().select('*').eq('id', resourceId!).single()
      return data as unknown as Resource
    },
    enabled: !!resourceId,
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { adults: 1, children: 0, contact_preference: 'either', contact_consent: false },
    })

  const submit = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await db.bookings().insert({
        resource_id:          resourceId!,
        requester_name:       data.requester_name,
        requester_phone:      data.requester_phone || null,
        requester_email:      data.requester_email || null,
        contact_preference:   data.contact_preference,
        best_contact_time:    data.best_contact_time || null,
        contact_consent:      data.contact_consent,
        adults:               data.adults,
        children:             data.children,
        check_in_date:        data.check_in_date || null,
        check_out_date:       data.check_out_date || null,
        notes:                data.notes || null,
        status:               'pending',
      })
      if (error) throw error
    },
    onSuccess: () => setDone(true),
    onError:   (e: Error) => toast.error('Request failed', e.message),
  })

  if (done) return (
    <div className="max-w-md mx-auto pt-20 text-center px-4">
      <CheckCircle size={60} className="text-success-600 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Request sent!</h1>
      <p className="text-gray-500 mb-2">Your request has been sent to <strong>{resource?.name}</strong>.</p>
      <p className="text-gray-400 text-sm mb-8">This is a request, not a confirmed reservation.</p>
      <div className="flex flex-col gap-3">
        <Link to="/map" className="btn-primary">Find More Resources</Link>
        <Link to="/" className="btn-secondary">Return Home</Link>
      </div>
    </div>
  )

  if (!resource) return (
    <div className="max-w-md mx-auto pt-20 text-center px-4">
      <div className="skeleton h-64 w-full rounded-2xl" />
    </div>
  )

  const isFull = resource.availability_status === 'full' || resource.availability_status === 'closed'

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link to={`/resources/${resourceId}`} className="flex items-center gap-2 text-sm text-gray-500 mb-5 hover:text-gray-700">
        <ArrowLeft size={16} /> Back to {resource.name}
      </Link>
      <div className="card mb-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900">{resource.name}</h2>
            <p className="text-sm text-gray-500">{resource.address.city}, {resource.address.state}</p>
          </div>
          <span className={`badge ${STATUS_STYLE[resource.availability_status]}`}>
            {STATUS_LABEL[resource.availability_status] ?? resource.availability_status}
          </span>
        </div>
        {resource.category === 'shelter' && resource.beds_total != null && (
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
            <BedDouble size={15} />
            <span><strong>{resource.beds_available ?? '?'}</strong> of <strong>{resource.beds_total}</strong> beds available</span>
          </div>
        )}
      </div>
      <div className="card">
        <h1 className="font-bold text-gray-900 text-lg mb-2">{getBookingLabel(resource, isFull)}</h1>
        <p className="text-sm text-warning-700 bg-warning-50 rounded-xl p-3 mb-4">This is a request, not a confirmed reservation.</p>
        <form onSubmit={handleSubmit(d => submit.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Your name *</label>
            <input {...register('requester_name')} className={errors.requester_name ? 'input-error' : 'input'} placeholder="First and last name" />
            {errors.requester_name && <p className="error-text">{errors.requester_name.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input {...register('requester_phone')} type="tel" className={errors.requester_phone ? 'input-error' : 'input'} placeholder="Phone number" />
              {errors.requester_phone && <p className="error-text">{errors.requester_phone.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('requester_email')} type="email" className={errors.requester_email ? 'input-error' : 'input'} placeholder="Email address" />
              {errors.requester_email && <p className="error-text">{errors.requester_email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Contact preference *</label>
              <select {...register('contact_preference')} className="input">
                <option value="either">Either</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className="label">Best contact time</label>
              <input {...register('best_contact_time')} className="input" placeholder="Weekdays after 3 PM" />
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Users size={14} /> Party size *</label>
            <div className="grid grid-cols-2 gap-3">
              <input {...register('adults')} type="number" min={1} className={errors.adults ? 'input-error' : 'input'} />
              <input {...register('children')} type="number" min={0} className="input" />
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Calendar size={14} /> Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <input {...register('check_in_date')} type="date" className="input" />
              <input {...register('check_out_date')} type="date" className="input" />
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><MessageSquare size={14} /> Needs / details</label>
            <textarea {...register('notes')} className="input min-h-[70px] resize-none" />
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            <input {...register('contact_consent')} type="checkbox" className="mt-1" />
            <span>
              I agree that StreetRise or the listed provider may contact me using the phone number or email I provide about this request.
              {errors.contact_consent && <span className="error-text block mt-1">{errors.contact_consent.message}</span>}
            </span>
          </label>
          <button type="submit" disabled={isSubmitting || submit.isPending} className="btn-primary w-full btn-lg">
            {submit.isPending ? 'Sending request…' : getBookingLabel(resource, isFull)}
          </button>
        </form>
      </div>
    </div>
  )
}