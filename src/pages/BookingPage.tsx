import { useMemo, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, ArrowLeft, Users, Calendar, MessageSquare, BedDouble } from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import type { Resource } from '@/types'

const baseSchema = z.object({
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
})

/**
 * `?intent=question` reaches this form from the map's "Ask a Question" action.
 * It is the same request record — a provider still replies through the same
 * queue — but party size and dates are meaningless for a question, and the
 * question itself becomes the required field.
 */
function makeSchema(isQuestion: boolean) {
  return baseSchema.superRefine((data, ctx) => {
    if (!data.requester_phone && !data.requester_email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['requester_phone'], message: 'Phone or email required' })
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['requester_email'], message: 'Phone or email required' })
    }
    if (isQuestion && !data.notes?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['notes'], message: 'Type your question so the provider can answer it' })
    }
  })
}

type FormData = z.infer<typeof baseSchema>

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

/** Returns an i18n key for the primary action label. */
function getBookingLabelKey(resource: Resource, isFull: boolean): string {
  if (isFull) return 'booking.joinWaitlist'
  return resource.category === 'shelter' ? 'booking.requestSpot' : 'booking.requestHelp'
}

export default function BookingPage() {
  const { resourceId }  = useParams<{ resourceId: string }>()
  const [searchParams]  = useSearchParams()
  const [done, setDone] = useState(false)
  const toast           = useToast()
  const { t }           = useI18n()

  const isQuestion = searchParams.get('intent') === 'question'
  const schema = useMemo(() => makeSchema(isQuestion), [isQuestion])

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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{isQuestion ? t('booking.questionSent') : t('booking.requestSent')}</h1>
      <p className="text-gray-500 mb-2">
        {isQuestion ? t('booking.sentToQuestion') : t('booking.sentToRequest')} <strong>{resource?.name}</strong>.
      </p>
      <p className="text-gray-400 text-sm mb-8">
        {isQuestion ? t('booking.replyNotInstant') : t('booking.requestNotice')}
      </p>
      <div className="flex flex-col gap-3">
        <Link to="/map" className="btn-primary">{t('booking.findMore')}</Link>
        <Link to="/" className="btn-secondary">{t('booking.returnHome')}</Link>
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
        <ArrowLeft size={16} /> {t('booking.backTo')} {resource.name}
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
        <h1 className="font-bold text-gray-900 text-lg mb-2">
          {isQuestion ? t('booking.askQuestion') : t(getBookingLabelKey(resource, isFull))}
        </h1>
        <p className="text-sm text-warning-600 bg-warning-50 rounded-xl p-3 mb-4">
          {isQuestion ? t('booking.questionNotice') : t('booking.requestNotice')}
        </p>
        <form onSubmit={handleSubmit(d => submit.mutate(d))} className="space-y-4">
          <div>
            <label className="label">{t('booking.yourName')} *</label>
            <input {...register('requester_name')} className={errors.requester_name ? 'input-error' : 'input'} placeholder={t('booking.namePlaceholder')} />
            {errors.requester_name && <p className="error-text">{errors.requester_name.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t('booking.phone')}</label>
              <input {...register('requester_phone')} type="tel" className={errors.requester_phone ? 'input-error' : 'input'} placeholder={t('booking.phonePlaceholder')} />
              {errors.requester_phone && <p className="error-text">{errors.requester_phone.message}</p>}
            </div>
            <div>
              <label className="label">{t('booking.email')}</label>
              <input {...register('requester_email')} type="email" className={errors.requester_email ? 'input-error' : 'input'} placeholder={t('booking.emailPlaceholder')} />
              {errors.requester_email && <p className="error-text">{errors.requester_email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t('booking.contactPreference')} *</label>
              <select {...register('contact_preference')} className="input">
                <option value="either">{t('booking.either')}</option>
                <option value="phone">{t('booking.phone')}</option>
                <option value="email">{t('booking.email')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('booking.bestContactTime')}</label>
              <input {...register('best_contact_time')} className="input" placeholder={t('booking.bestContactPlaceholder')} />
            </div>
          </div>
          {!isQuestion && (
            <>
              <div>
                <label className="label flex items-center gap-1.5"><Users size={14} /> {t('booking.partySize')} *</label>
                <div className="grid grid-cols-2 gap-3">
                  <input {...register('adults')} type="number" min={1} className={errors.adults ? 'input-error' : 'input'} />
                  <input {...register('children')} type="number" min={0} className="input" />
                </div>
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><Calendar size={14} /> {t('booking.dates')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <input {...register('check_in_date')} type="date" className="input" />
                  <input {...register('check_out_date')} type="date" className="input" />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="label flex items-center gap-1.5">
              <MessageSquare size={14} /> {isQuestion ? `${t('booking.yourQuestion')} *` : t('booking.needsDetails')}
            </label>
            <textarea
              {...register('notes')}
              className={clsx('min-h-[70px] resize-none', errors.notes ? 'input-error' : 'input')}
              placeholder={isQuestion ? t('booking.questionPlaceholder') : undefined}
            />
            {errors.notes && <p className="error-text">{errors.notes.message}</p>}
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            <input {...register('contact_consent')} type="checkbox" className="mt-1" />
            <span>
              {t('booking.consent')}
              {errors.contact_consent && <span className="error-text block mt-1">{errors.contact_consent.message}</span>}
            </span>
          </label>
          <button type="submit" disabled={isSubmitting || submit.isPending} className="btn-primary w-full btn-lg">
            {submit.isPending
              ? (isQuestion ? t('booking.sendingQuestion') : t('booking.sendingRequest'))
              : (isQuestion ? t('booking.sendQuestion') : t(getBookingLabelKey(resource, isFull)))}
          </button>
        </form>
      </div>
    </div>
  )
}
