import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle, Crosshair, Lock, MapPin, Navigation, PhoneCall } from 'lucide-react'
import { db, supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/lib/store'
import SeoHead from '@/lib/seo/SeoHead'
import {
  clearTransportationRequestDraft,
  getTransportationRequestDraft,
} from '@/lib/transportationRequestDraft'
import type { RideMode } from '@/lib/rideOptions'
import type { Resource } from '@/types'

const COPY = {
  en: {
    title: 'Request transportation help',
    connectedIntro: 'Send the trip details to this provider through its StreetRise request queue.',
    mediatedIntro: 'Send the trip details to the StreetRise team so we can help connect you with this program. The agency is not connected to StreetRise yet.',
    connectedDelivery: 'This request will be available to the listed provider in StreetRise.',
    mediatedDelivery: 'This request goes to the StreetRise team for follow-up. It is not sent directly to the agency through StreetRise.',
    notBooked: 'This is a request for assistance. It does not confirm, schedule, or dispatch a ride.',
    trip: 'Your trip',
    from: 'Where should the trip start?',
    to: 'Where are you going?',
    when: 'When do you need to travel?',
    whenHint: 'Use a date and time if you know it, or describe the window below.',
    timeWindow: 'Time window',
    timePlaceholder: 'Tomorrow morning, after 3 PM, flexible',
    asap: 'As soon as possible',
    today: 'Today',
    currentLocationTitle: 'Use the current device location I selected',
    currentLocationBody: 'If you select this, the precise coordinates from the finder will be included in the private request when you submit it. They are not saved before submission.',
    currentLocationActive: 'Current device location will be shared with this request.',
    originOrLocation: 'Enter a pickup address or choose the current device location above.',
    need: 'What kind of help do you need?',
    ride: 'A ride',
    accessible: 'Wheelchair-accessible ride',
    fare: 'Bus fare / transportation assistance',
    notSure: 'Not sure — help me figure it out',
    mobility: 'Mobility or accessibility notes',
    mobilityPlaceholder: 'Wheelchair type, transfer help, service animal, or anything the program should know',
    contact: 'How can they reach you?',
    name: 'Your name',
    phone: 'Phone',
    email: 'Email',
    preference: 'Contact preference',
    either: 'Either',
    bestTime: 'Best contact time',
    notes: 'Anything else they should know?',
    consent: 'I agree that StreetRise or the listed provider may contact me about this transportation request.',
    submit: 'Request transportation help',
    sending: 'Sending request…',
    sent: 'Transportation request received',
    connectedSentBody: 'Your request is in the provider’s StreetRise queue. It is still not a confirmed ride; the provider must follow up and confirm eligibility or scheduling.',
    mediatedSentBody: 'StreetRise received your request for follow-up. It was not sent directly to the agency through StreetRise and it is not a confirmed ride.',
    back: 'Back to transportation options',
    program: 'Program',
    missingProgram: 'This transportation program is not available.',
    requiredContact: 'Enter a phone number or email address.',
    requiredConsent: 'Contact consent is required.',
    genericError: 'We could not send the transportation request. Try again or contact the program directly.',
    privacy: 'Trip details are only saved when you submit this form. Device coordinates are included only if you explicitly choose to share them above.',
  },
  es: {
    title: 'Solicitar ayuda de transporte',
    connectedIntro: 'Envíe los detalles del viaje a este proveedor mediante su cola de solicitudes de StreetRise.',
    mediatedIntro: 'Envíe los detalles del viaje al equipo de StreetRise para que podamos ayudarle a conectarse con este programa. La agencia todavía no está conectada a StreetRise.',
    connectedDelivery: 'Esta solicitud estará disponible para el proveedor indicado en StreetRise.',
    mediatedDelivery: 'Esta solicitud llega al equipo de StreetRise para seguimiento. StreetRise no la envía directamente a la agencia.',
    notBooked: 'Esta es una solicitud de ayuda. No confirma, programa ni despacha un viaje.',
    trip: 'Su viaje',
    from: '¿Dónde debe comenzar el viaje?',
    to: '¿Adónde va?',
    when: '¿Cuándo necesita viajar?',
    whenHint: 'Use una fecha y hora si la sabe, o describa el horario abajo.',
    timeWindow: 'Horario aproximado',
    timePlaceholder: 'Mañana por la mañana, después de las 3 p. m., flexible',
    asap: 'Lo antes posible',
    today: 'Hoy',
    currentLocationTitle: 'Usar la ubicación actual del dispositivo que seleccioné',
    currentLocationBody: 'Si selecciona esto, las coordenadas precisas del buscador se incluirán en la solicitud privada cuando la envíe. No se guardan antes del envío.',
    currentLocationActive: 'La ubicación actual del dispositivo se compartirá con esta solicitud.',
    originOrLocation: 'Ingrese una dirección de recogida o elija la ubicación actual del dispositivo arriba.',
    need: '¿Qué tipo de ayuda necesita?',
    ride: 'Un viaje',
    accessible: 'Viaje accesible para silla de ruedas',
    fare: 'Pasaje de autobús / ayuda de transporte',
    notSure: 'No estoy seguro — ayúdeme a decidir',
    mobility: 'Notas de movilidad o accesibilidad',
    mobilityPlaceholder: 'Tipo de silla de ruedas, ayuda para transferirse, animal de servicio u otra información importante',
    contact: '¿Cómo pueden comunicarse con usted?',
    name: 'Su nombre',
    phone: 'Teléfono',
    email: 'Correo electrónico',
    preference: 'Preferencia de contacto',
    either: 'Cualquiera',
    bestTime: 'Mejor horario para contactar',
    notes: '¿Algo más que deban saber?',
    consent: 'Acepto que StreetRise o el proveedor indicado se comunique conmigo sobre esta solicitud de transporte.',
    submit: 'Solicitar ayuda de transporte',
    sending: 'Enviando solicitud…',
    sent: 'Solicitud de transporte recibida',
    connectedSentBody: 'Su solicitud está en la cola de StreetRise del proveedor. Aún no es un viaje confirmado; el proveedor debe darle seguimiento y confirmar elegibilidad o programación.',
    mediatedSentBody: 'StreetRise recibió su solicitud para darle seguimiento. StreetRise no la envió directamente a la agencia y no es un viaje confirmado.',
    back: 'Volver a las opciones de transporte',
    program: 'Programa',
    missingProgram: 'Este programa de transporte no está disponible.',
    requiredContact: 'Ingrese un número de teléfono o correo electrónico.',
    requiredConsent: 'Se requiere consentimiento para contactarle.',
    genericError: 'No pudimos enviar la solicitud de transporte. Inténtelo de nuevo o comuníquese directamente con el programa.',
    privacy: 'Los detalles del viaje solo se guardan cuando envía este formulario. Las coordenadas del dispositivo solo se incluyen si elige compartirlas arriba.',
  },
} as const

type RequestKind = 'ride' | 'accessible_ride' | 'fare_assistance' | 'not_sure'

type ProgramWithProvider = Resource & {
  provider?: {
    organization_name?: string | null
    claim_status?: string | null
  } | null
}

function makeSchema(requiredContact: string, requiredConsent: string, originOrLocation: string) {
  return z.object({
    origin_text: z.string().trim().max(500).optional(),
    share_current_location: z.boolean().default(false),
    destination_text: z.string().trim().min(2).max(500),
    requested_trip_at: z.string().optional(),
    requested_time_window: z.string().trim().max(160).optional(),
    requested_kind: z.enum(['ride', 'accessible_ride', 'fare_assistance', 'not_sure']),
    mobility_notes: z.string().trim().max(1000).optional(),
    requester_name: z.string().trim().min(2),
    requester_phone: z.string().trim().optional(),
    requester_email: z.string().trim().email().optional().or(z.literal('')),
    contact_preference: z.enum(['phone', 'email', 'either']),
    best_contact_time: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).optional(),
    contact_consent: z.boolean().refine(Boolean, requiredConsent),
  }).superRefine((data, ctx) => {
    if (!data.share_current_location && (!data.origin_text || data.origin_text.trim().length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['origin_text'], message: originOrLocation })
    }
    if (!data.requester_phone && !data.requester_email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['requester_phone'], message: requiredContact })
    }
  })
}

type FormData = z.infer<ReturnType<typeof makeSchema>>

function formatSummary(data: FormData, modes: RideMode[], submittedOrigin: string): string {
  const when = data.requested_trip_at
    ? new Date(data.requested_trip_at).toLocaleString()
    : data.requested_time_window || 'Not specified'
  return [
    '[Transportation request]',
    `From: ${submittedOrigin}`,
    `To: ${data.destination_text}`,
    `When: ${when}`,
    `Request: ${data.requested_kind.replace(/_/g, ' ')}`,
    modes.length > 0 ? `Modes: ${modes.join(', ')}` : null,
    data.requested_kind === 'accessible_ride' ? 'Wheelchair-accessible transportation requested' : null,
    data.mobility_notes ? `Mobility notes: ${data.mobility_notes}` : null,
    data.notes ? `\nAdditional notes: ${data.notes}` : null,
  ].filter(Boolean).join('\n')
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST202' || error.code === '42883' || /submit_transportation_request/i.test(error.message ?? '')
}

export default function TransportationRequestPage() {
  const { programId } = useParams<{ programId: string }>()
  const [params] = useSearchParams()
  const { lang } = useI18n()
  const copy = COPY[lang]
  const toast = useToast()
  const [done, setDone] = useState(false)
  const draft = useMemo(() => getTransportationRequestDraft(), [])
  const destinationId = params.get('to') ?? draft?.destinationResourceId ?? null
  const modes = draft?.modes ?? []
  const hasCurrentLocation = !!draft?.originCoordinate

  const schema = useMemo(
    () => makeSchema(copy.requiredContact, copy.requiredConsent, copy.originOrLocation),
    [copy],
  )

  const { data: program, isLoading: programLoading } = useQuery<ProgramWithProvider | null>({
    queryKey: ['transport-request-program', programId],
    queryFn: async () => {
      const { data, error } = await db.resources()
        .select('*, provider:providers(organization_name, claim_status)')
        .eq('id', programId!)
        .eq('category', 'transportation')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as ProgramWithProvider | null) ?? null
    },
    enabled: !!programId,
  })

  const { data: destinationResource } = useQuery<Resource | null>({
    queryKey: ['transport-request-destination', destinationId],
    queryFn: async () => {
      const { data, error } = await db.resources().select('*').eq('id', destinationId!).maybeSingle()
      if (error) throw error
      return (data as unknown as Resource | null) ?? null
    },
    enabled: !!destinationId,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      origin_text: draft?.originText ?? '',
      share_current_location: false,
      destination_text: draft?.destinationText ?? '',
      requested_kind: draft?.wheelchairRequired ? 'accessible_ride' : 'not_sure',
      requested_time_window: draft?.when === 'now' ? copy.asap : draft?.when === 'today' ? copy.today : '',
      contact_preference: 'either',
      contact_consent: false,
    },
  })

  const shareCurrentLocation = watch('share_current_location')

  useEffect(() => {
    if (!draft?.destinationText && destinationResource) {
      setValue('destination_text', destinationResource.name)
    }
  }, [destinationResource, draft?.destinationText, setValue])

  const providerConnected = program?.provider?.claim_status === 'claimed'
  const pageIntro = providerConnected ? copy.connectedIntro : copy.mediatedIntro
  const deliveryCopy = providerConnected ? copy.connectedDelivery : copy.mediatedDelivery
  const sentBody = providerConnected ? copy.connectedSentBody : copy.mediatedSentBody

  const submit = useMutation({
    mutationFn: async (data: FormData) => {
      const coordinate = draft?.originCoordinate
      const submittedOrigin = data.share_current_location && coordinate
        ? `Current device location (${coordinate.lat.toFixed(6)}, ${coordinate.lng.toFixed(6)})`
        : data.origin_text?.trim() ?? ''

      if (submittedOrigin.length < 2) throw new Error('pickup location required')

      const requestedTripAt = data.requested_trip_at
        ? new Date(data.requested_trip_at).toISOString()
        : null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('submit_transportation_request', {
        p_resource_id: programId,
        p_destination_resource_id: destinationId,
        p_origin_text: submittedOrigin,
        p_destination_text: data.destination_text,
        p_requested_trip_at: requestedTripAt,
        p_requested_time_window: data.requested_time_window || null,
        p_requested_modes: modes,
        p_wheelchair_required: data.requested_kind === 'accessible_ride' ? true : draft?.wheelchairRequired ?? null,
        p_mobility_notes: data.mobility_notes || null,
        p_requested_kind: data.requested_kind,
        p_requester_name: data.requester_name,
        p_requester_phone: data.requester_phone || null,
        p_requester_email: data.requester_email || null,
        p_contact_preference: data.contact_preference,
        p_best_contact_time: data.best_contact_time || null,
        p_contact_consent: data.contact_consent,
        p_notes: data.notes || null,
      })

      if (!error) return
      if (!isMissingRpc(error)) throw error

      const { error: fallbackError } = await db.bookings().insert({
        resource_id: programId!,
        requester_name: data.requester_name,
        requester_phone: data.requester_phone || null,
        requester_email: data.requester_email || null,
        contact_preference: data.contact_preference,
        best_contact_time: data.best_contact_time || null,
        contact_consent: data.contact_consent,
        notes: formatSummary(data, modes, submittedOrigin),
        status: 'pending',
        adults: 1,
        children: 0,
      })
      if (fallbackError) throw fallbackError
    },
    onSuccess: () => {
      clearTransportationRequestDraft()
      setDone(true)
    },
    onError: () => toast.error(copy.genericError),
  })

  if (programLoading) {
    return <div className="mx-auto max-w-lg px-4 py-10"><div className="skeleton h-96 w-full" /></div>
  }

  if (!program) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <SeoHead title={copy.title} description={copy.notBooked} path="/transportation/request" noindex />
        <p className="text-gray-600">{copy.missingProgram}</p>
        <Link to="/transportation" className="btn-primary mt-5">{copy.back}</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <SeoHead title={copy.title} description={copy.notBooked} path={`/transportation/request/${program.id}`} noindex />
        <CheckCircle className="mx-auto h-14 w-14 text-success-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{copy.sent}</h1>
        <p className="mt-2 text-gray-600">{sentBody}</p>
        <div className="mt-6 flex flex-col gap-3">
          {program.phone && (
            <a href={`tel:${program.phone}`} className="btn-primary gap-2">
              <PhoneCall size={16} /> {program.phone}
            </a>
          )}
          <Link to="/transportation" className="btn-secondary">{copy.back}</Link>
        </div>
      </div>
    )
  }

  const kinds: { value: RequestKind; label: string }[] = [
    { value: 'ride', label: copy.ride },
    { value: 'accessible_ride', label: copy.accessible },
    { value: 'fare_assistance', label: copy.fare },
    { value: 'not_sure', label: copy.notSure },
  ]

  return (
    <div className="mx-auto max-w-xl px-4 py-8 pb-24">
      <SeoHead title={copy.title} description={copy.notBooked} path={`/transportation/request/${program.id}`} noindex />

      <Link to="/transportation" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> {copy.back}
      </Link>

      <div className="mt-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <Navigation size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">{copy.title}</h1>
        <p className="mt-2 text-gray-600">{pageIntro}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">{copy.notBooked}</p>
        <p className="mt-1">{deliveryCopy}</p>
      </div>

      <div className="mt-5 card">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{copy.program}</p>
        <p className="mt-1 font-bold text-gray-900">{program.name}</p>
        {program.provider?.organization_name && <p className="mt-0.5 text-sm text-gray-500">{program.provider.organization_name}</p>}
        {program.description && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{program.description}</p>}
      </div>

      <form onSubmit={handleSubmit((data) => submit.mutate(data))} className="mt-5 space-y-5">
        <section className="card space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <MapPin size={18} className="text-primary-600" aria-hidden="true" /> {copy.trip}
          </h2>

          {hasCurrentLocation && (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50 p-4">
              <input type="checkbox" {...register('share_current_location')} className="mt-1 h-4 w-4 accent-primary-600" />
              <span>
                <span className="flex items-center gap-2 font-semibold text-primary-900">
                  <Crosshair size={16} aria-hidden="true" /> {copy.currentLocationTitle}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-primary-700">{copy.currentLocationBody}</span>
                {shareCurrentLocation && <span className="mt-2 block text-xs font-semibold text-emerald-700">{copy.currentLocationActive}</span>}
              </span>
            </label>
          )}

          <div>
            <label className="label" htmlFor="tr-origin">{copy.from} *</label>
            <input
              id="tr-origin"
              {...register('origin_text')}
              className={errors.origin_text ? 'input-error' : 'input'}
              autoComplete="street-address"
              disabled={shareCurrentLocation}
            />
            {errors.origin_text && <p className="error-text">{errors.origin_text.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="tr-destination">{copy.to} *</label>
            <input id="tr-destination" {...register('destination_text')} className={errors.destination_text ? 'input-error' : 'input'} />
          </div>
          <div>
            <label className="label" htmlFor="tr-when">{copy.when}</label>
            <input id="tr-when" type="datetime-local" {...register('requested_trip_at')} className="input" />
            <p className="mt-1 text-xs text-gray-500">{copy.whenHint}</p>
          </div>
          <div>
            <label className="label" htmlFor="tr-window">{copy.timeWindow}</label>
            <input id="tr-window" {...register('requested_time_window')} className="input" placeholder={copy.timePlaceholder} />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-lg font-bold text-gray-900">{copy.need}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {kinds.map((kind) => (
              <label key={kind.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50 has-[:checked]:text-primary-800">
                <input type="radio" value={kind.value} {...register('requested_kind')} className="h-4 w-4 accent-primary-600" />
                {kind.label}
              </label>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="tr-mobility">{copy.mobility}</label>
            <textarea id="tr-mobility" {...register('mobility_notes')} className="input min-h-24 resize-y" placeholder={copy.mobilityPlaceholder} />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-lg font-bold text-gray-900">{copy.contact}</h2>
          <div>
            <label className="label" htmlFor="tr-name">{copy.name} *</label>
            <input id="tr-name" {...register('requester_name')} className={errors.requester_name ? 'input-error' : 'input'} autoComplete="name" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tr-phone">{copy.phone}</label>
              <input id="tr-phone" type="tel" {...register('requester_phone')} className={errors.requester_phone ? 'input-error' : 'input'} autoComplete="tel" />
              {errors.requester_phone && <p className="error-text">{errors.requester_phone.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="tr-email">{copy.email}</label>
              <input id="tr-email" type="email" {...register('requester_email')} className={errors.requester_email ? 'input-error' : 'input'} autoComplete="email" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tr-pref">{copy.preference}</label>
              <select id="tr-pref" {...register('contact_preference')} className="input">
                <option value="either">{copy.either}</option>
                <option value="phone">{copy.phone}</option>
                <option value="email">{copy.email}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tr-best">{copy.bestTime}</label>
              <input id="tr-best" {...register('best_contact_time')} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="tr-notes">{copy.notes}</label>
            <textarea id="tr-notes" {...register('notes')} className="input min-h-20 resize-y" />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            <input type="checkbox" {...register('contact_consent')} className="mt-0.5 h-4 w-4 accent-primary-600" />
            <span>{copy.consent}</span>
          </label>
          {errors.contact_consent && <p className="error-text">{errors.contact_consent.message}</p>}
          <p className="flex items-start gap-2 text-xs text-gray-500">
            <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {copy.privacy}
          </p>
        </section>

        <button type="submit" className="btn-primary min-h-12 w-full text-base" disabled={submit.isPending}>
          {submit.isPending ? copy.sending : copy.submit}
        </button>
      </form>
    </div>
  )
}
