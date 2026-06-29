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
  requester_name:  z.string().min(2, 'Name required'),
  requester_phone: z.string().optional(),
  requester_email: z.string().email().optional().or(z.literal('')),
  adults:          z.coerce.number().int().min(1, 'At least 1 adult'),
  children:        z.coerce.number().int().min(0).default(0),
  check_in_date:   z.string().optional(),
  check_out_date:  z.string().optional(),
  notes:           z.string().max(500).optional(),
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
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { adults: 1, children: 0 } })

  const submit = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await db.bookings().insert({
        resource_id:     resourceId!,
        requester_name:  data.requester_name,
        requester_phone: data.requester_phone || null,
        requester_email: data.requester_email || null,
        adults:          data.adults,
        children:        data.children,
        check_in_date:   data.check_in_date || null,
        check_out_date:  data.check_out_date || null,
        notes:           data.notes || null,
        status:          'pending',
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
        <h1 className="font-bold text-gray-900 text-lg mb-4">{getBookingLabel(resource, isFull)}</h1>
        <p className="text-sm text-warning-700 bg-warning-50 rounded-xl p-3 mb-4">This is a request, not a confirmed reservation.</p>
        <form onSubmit={handleSubmit(d => submit.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Your name *</label>
            <input {...register('requester_name')} className={errors.requester_name ? 'input-error' : 'input'} placeholder="First name is fine" />
            {errors.requester_name && <p className="error-text">{errors.requester_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input {...register('requester_phone')} type="tel" className="input" placeholder="Phone number" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('requester_email')} type="email" className="input" placeholder="Email address" />
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
            <label className="label flex items-center gap-1.5"><MessageSquare size={14} /> Notes</label>
            <textarea {...register('notes')} className="input min-h-[70px] resize-none" />
          </div>
          <button type="submit" disabled={isSubmitting || submit.isPending} className="btn-primary w-full btn-lg">
            {submit.isPending ? 'Sending request…' : getBookingLabel(resource, isFull)}
          </button>
        </form>
      </div>
    </div>
  )
}