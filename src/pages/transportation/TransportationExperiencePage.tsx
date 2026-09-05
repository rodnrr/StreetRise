import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  Check,
  ChevronRight,
  Crosshair,
  ExternalLink,
  HelpCircle,
  Lock,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  SearchX,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import {
  RIDE_ELIGIBILITY,
  RIDE_MODES,
  RIDE_WHEN,
  RIDE_KIND_LABEL_KEY,
  COUNTY_LABEL_KEY,
  countyForCity,
  fetchRideAssistance,
  rankRideOptions,
  rideFacet,
  type RideAnswers,
  type RideEligibility,
  type RideMode,
  type RideOption,
  type RideWhen,
} from '@/lib/rideOptions'
import {
  TRAVEL_MODES,
  canRouteTo,
  destinationParam,
  googleMapsUrl,
  type TripOrigin,
} from '@/lib/transport'
import { setTransportationRequestDraft } from '@/lib/transportationRequestDraft'
import { useI18n } from '@/lib/i18n'
import { useMapStore, useToast } from '@/lib/store'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import type { LatLng } from '@/lib/geo'
import type { Resource } from '@/types'

type Stage = 'trip' | 'needs' | 'results'

const STAGES: Stage[] = ['trip', 'needs', 'results']

const FIT_BADGE: Record<RideOption['fit'], { classes: string; labelKey: string }> = {
  best:       { classes: 'bg-emerald-50 text-emerald-700', labelKey: 'ride.fit.best' },
  possible:   { classes: 'bg-blue-50 text-blue-700',       labelKey: 'ride.fit.possible' },
  check:      { classes: 'bg-gray-100 text-gray-600',      labelKey: 'ride.fit.check' },
  other_area: { classes: 'bg-amber-50 text-amber-700',     labelKey: 'ride.fit.other_area' },
}

const COPY = {
  en: {
    title: 'How do you need to get there?',
    intro: 'Plan the trip, find help paying for it, or find accessible transportation.',
    trip: 'My trip',
    needs: 'What I need',
    options: 'My options',
    from: 'From',
    to: 'To',
    when: 'When',
    locationReady: 'Current location is ready for routing.',
    useLocation: 'Use my location',
    originPlaceholder: 'Or enter a starting address or city',
    continue: 'Choose what I need',
    chooseNeeds: 'Choose any transportation options that could work for you.',
    eligibilityTitle: 'Optional: match programs I may qualify for',
    eligibilityHint: 'Skip anything you do not want to answer. These choices stay on this screen.',
    privacy: 'Eligibility choices are not saved or put in the URL.',
    showOptions: 'Show my options',
    routeTitle: 'Plan this trip',
    routeHint: 'StreetRise sends the trip to your map app for current routing.',
    assistanceTitle: 'Ride and fare help',
    assistanceHint: 'Programs are ranked from what they publish. Only the program can confirm eligibility.',
    why: 'Why this may work',
    before: 'Before you call',
    request: 'Request help',
    requestHint: 'This sends StreetRise the trip details for follow-up. It does not book a ride.',
    otherArea: 'Programs in other service areas',
    directory: 'Browse transportation programs',
    directoryHint: 'Fare assistance and paratransit often serve an area rather than a walk-in address.',
    startOver: 'Start over',
    noDestination: 'Enter where you are going to continue.',
    notRoutable: 'This destination does not publish a walk-in location. Contact the provider for location or intake details.',
  },
  es: {
    title: '¿Cómo necesita llegar?',
    intro: 'Planifique el viaje, encuentre ayuda para pagarlo o busque transporte accesible.',
    trip: 'Mi viaje',
    needs: 'Lo que necesito',
    options: 'Mis opciones',
    from: 'Desde',
    to: 'Hasta',
    when: 'Cuándo',
    locationReady: 'Su ubicación actual está lista para las indicaciones.',
    useLocation: 'Usar mi ubicación',
    originPlaceholder: 'O ingrese una dirección o ciudad de origen',
    continue: 'Elegir lo que necesito',
    chooseNeeds: 'Elija cualquier opción de transporte que pueda funcionarle.',
    eligibilityTitle: 'Opcional: encontrar programas para los que podría calificar',
    eligibilityHint: 'Omita cualquier cosa que no quiera responder. Estas opciones permanecen en esta pantalla.',
    privacy: 'Las opciones de elegibilidad no se guardan ni se colocan en la URL.',
    showOptions: 'Mostrar mis opciones',
    routeTitle: 'Planificar este viaje',
    routeHint: 'StreetRise envía el viaje a su aplicación de mapas para obtener rutas actuales.',
    assistanceTitle: 'Ayuda con viajes y pasajes',
    assistanceHint: 'Los programas se ordenan según lo que publican. Solo el programa puede confirmar elegibilidad.',
    why: 'Por qué podría funcionar',
    before: 'Antes de llamar',
    request: 'Solicitar ayuda',
    requestHint: 'Esto envía a StreetRise los detalles del viaje para seguimiento. No reserva un viaje.',
    otherArea: 'Programas en otras áreas de servicio',
    directory: 'Explorar programas de transporte',
    directoryHint: 'La ayuda de pasajes y el paratránsito suelen servir un área en lugar de una dirección para visitas.',
    startOver: 'Comenzar de nuevo',
    noDestination: 'Ingrese adónde va para continuar.',
    notRoutable: 'Este destino no publica una ubicación para visitas. Comuníquese con el proveedor para conocer la ubicación o el proceso.',
  },
} as const

interface Destination {
  label: string
  routeTo: string | null
  city: string | null
  resourceId: string | null
}

function destinationFromResource(resource: Resource): Destination {
  return {
    label: resource.name,
    routeTo: canRouteTo(resource) ? destinationParam(resource) : null,
    city: resource.address?.city ?? null,
    resourceId: resource.id,
  }
}

function destinationFromText(value: string): Destination {
  const label = value.trim()
  const parts = [label, ...label.split(',').map((part) => part.trim())]
  const city = parts.find((part) => countyForCity(part) !== null) ?? null
  return { label, routeTo: label || null, city, resourceId: null }
}

function StagePill({ active, complete, children }: {
  active: boolean
  complete: boolean
  children: React.ReactNode
}) {
  return (
    <span className={clsx(
      'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
      active ? 'bg-primary-600 text-white' : complete ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
    )}>
      {complete && !active && <Check size={13} aria-hidden="true" />}
      {children}
    </span>
  )
}

function ChoiceCard({ selected, onClick, label, icon }: {
  selected: boolean
  onClick: () => void
  label: string
  icon?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        selected
          ? 'border-primary-600 bg-primary-50 text-primary-800 shadow-sm'
          : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      {icon && <span className="text-xl" aria-hidden>{icon}</span>}
      <span className="flex-1">{label}</span>
      <span className={clsx(
        'flex h-5 w-5 items-center justify-center rounded-full border',
        selected ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 text-transparent',
      )} aria-hidden="true">
        <Check size={12} />
      </span>
    </button>
  )
}

function ProgramCard({ option, destination, onRequest }: {
  option: RideOption
  destination: Destination | null
  onRequest: (resource: Resource) => void
}) {
  const { t, lang } = useI18n()
  const copy = COPY[lang]
  const resource = option.resource
  const fit = FIT_BADGE[option.fit]
  const kinds = rideFacet(resource, 'kind')
  const areas = rideFacet(resource, 'area')
  const wheelchair = rideFacet(resource, 'mode').includes('wheelchair')

  return (
    <article className="card overflow-hidden p-0">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={clsx('badge', fit.classes)}>{t(fit.labelKey)}</span>
          {kinds.map((kind) => (
            <span key={kind} className="badge bg-gray-100 text-gray-600">
              {RIDE_KIND_LABEL_KEY[kind] ? t(RIDE_KIND_LABEL_KEY[kind]) : kind.replace(/_/g, ' ')}
            </span>
          ))}
          {wheelchair && <span className="badge bg-violet-50 text-violet-700">♿ {t('ride.mode.wheelchair')}</span>}
        </div>

        <h3 className="mt-3 text-lg font-bold text-gray-900">{resource.name}</h3>
        {areas.length > 0 && (
          <p className="mt-1 text-xs font-medium text-gray-500">
            {areas.map((area) => COUNTY_LABEL_KEY[area] ? t(COUNTY_LABEL_KEY[area]) : area).join(' · ')}
          </p>
        )}
        {resource.description && <p lang="en" className="mt-2 text-sm leading-relaxed text-gray-600">{resource.description}</p>}

        {option.reasons.length > 0 && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{copy.why}</p>
            <ul className="mt-2 space-y-1.5">
              {option.reasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-sm text-emerald-900">
                  <Check size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {option.cautions.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{copy.before}</p>
            <ul className="mt-2 space-y-1.5">
              {option.cautions.map((caution) => (
                <li key={caution} className="flex gap-2 text-sm text-amber-900"><span aria-hidden>!</span><span>{caution}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-gray-50 p-3 sm:px-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {resource.phone ? (
            <a href={`tel:${resource.phone}`} className="btn-primary min-h-11 gap-2">
              <Phone size={15} /> {t('ride.callProgram')}
            </a>
          ) : resource.website ? (
            <a href={resource.website} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-11 gap-2">
              <ExternalLink size={15} /> {t('ride.programWebsite')}
            </a>
          ) : (
            <Link to={`/resources/${resource.id}`} className="btn-primary min-h-11 gap-2">
              {t('resourceSheet.fullDetails')} <ArrowRight size={14} />
            </Link>
          )}
          <button
            type="button"
            className="btn-secondary min-h-11 gap-2"
            onClick={() => onRequest(resource)}
            disabled={!destination}
          >
            <HelpCircle size={15} /> {copy.request}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">{copy.requestHint}</p>
      </div>
    </article>
  )
}

export default function TransportationExperiencePage() {
  const { t, lang } = useI18n()
  const copy = COPY[lang]
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setSearchParams] = useSearchParams()
  const storedLocation = useMapStore((state) => state.userLocation)

  const destinationId = params.get('to')
  const preselectWheelchair = params.get('mode') === 'wheelchair'

  const { data: destinationResource } = useQuery<Resource | null>({
    queryKey: ['transportation-destination', destinationId],
    queryFn: async () => {
      const { data, error } = await db.resources().select('*').eq('id', destinationId!).maybeSingle()
      if (error) throw error
      return (data as unknown as Resource | null) ?? null
    },
    enabled: !!destinationId,
  })

  const { data: programs, isLoading, isError } = useQuery({
    queryKey: ['ride-assistance'],
    queryFn: fetchRideAssistance,
    staleTime: 1000 * 60 * 5,
  })

  const [stage, setStage] = useState<Stage>('trip')
  const [destinationText, setDestinationText] = useState('')
  const [origin, setOrigin] = useState<LatLng | null>(storedLocation)
  const [originText, setOriginText] = useState('')
  const [when, setWhen] = useState<RideWhen>('now')
  const [modes, setModes] = useState<RideMode[]>(preselectWheelchair ? ['wheelchair'] : [])
  const [eligibility, setEligibility] = useState<RideEligibility[]>([])
  const [locating, setLocating] = useState(false)

  const destination = destinationResource
    ? destinationFromResource(destinationResource)
    : destinationText.trim()
      ? destinationFromText(destinationText)
      : null

  const tripOrigin: TripOrigin = origin ?? (originText.trim() || null)
  const answers: RideAnswers = useMemo(() => ({ modes, eligibility, when }), [modes, eligibility, when])

  const ranked = useMemo(
    () => rankRideOptions(programs ?? [], answers, {
      destinationCity: destination?.city,
      originText,
      originProvided: !!origin || !!originText.trim(),
      t,
    }),
    // `t` is a fresh closure on render; language is the actual dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [programs, answers, destination?.city, originText, origin, lang],
  )

  const inArea = ranked.filter((option) => option.fit !== 'other_area')
  const otherArea = ranked.filter((option) => option.fit === 'other_area')
  const stageIndex = STAGES.indexOf(stage)

  const toggle = <T,>(list: T[], value: T, setter: (next: T[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error(t('ride.locationUnsupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocating(false)
        toast.error(t('ride.locationDenied'))
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  const restart = () => {
    if (params.has('to') || params.has('mode')) setSearchParams(new URLSearchParams(), { replace: true })
    setStage('trip')
    setDestinationText('')
    setOrigin(null)
    setOriginText('')
    setWhen('now')
    setModes([])
    setEligibility([])
  }

  const requestHelp = (program: Resource) => {
    if (!destination) return
    setTransportationRequestDraft({
      destinationResourceId: destination.resourceId,
      originText: originText.trim(),
      destinationText: destination.label,
      when,
      modes,
      wheelchairRequired: modes.includes('wheelchair'),
    })
    const query = destination.resourceId ? `?to=${encodeURIComponent(destination.resourceId)}` : ''
    navigate(`/transportation/request/${program.id}${query}`)
  }

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead title={t('transportation.title')} description={t('transportation.metaDescription')} path="/transportation">
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Transportation Assistance', path: '/transportation' },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-5 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <Navigation size={28} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-500 dark:text-slate-400">{copy.intro}</p>
      </Section>

      <Section containerSize="prose" className="pt-0">
        <div className="mb-5 flex items-center justify-center gap-2 overflow-x-auto pb-1">
          <StagePill active={stage === 'trip'} complete={stageIndex > 0}>1 · {copy.trip}</StagePill>
          <ChevronRight size={14} className="shrink-0 text-gray-300" aria-hidden="true" />
          <StagePill active={stage === 'needs'} complete={stageIndex > 1}>2 · {copy.needs}</StagePill>
          <ChevronRight size={14} className="shrink-0 text-gray-300" aria-hidden="true" />
          <StagePill active={stage === 'results'} complete={false}>3 · {copy.options}</StagePill>
        </div>

        {stage === 'trip' && (
          <div className="card overflow-hidden p-0">
            <div className="border-b border-gray-100 bg-gradient-to-br from-primary-50 to-white p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-700">{copy.trip}</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">{t('ride.q.destination')}</h2>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <label className="label" htmlFor="transport-destination">{copy.to}</label>
                {destinationResource ? (
                  <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3">
                    <MapPin size={19} className="shrink-0 text-primary-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-900">{destinationResource.name}</p>
                      {destinationResource.address?.city && (
                        <p className="text-sm text-gray-500">{destinationResource.address.city}, {destinationResource.address.state}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <input
                    id="transport-destination"
                    className="input min-h-12"
                    value={destinationText}
                    onChange={(event) => setDestinationText(event.target.value)}
                    placeholder={t('ride.q.destinationPlaceholder')}
                    autoComplete="off"
                  />
                )}
                {!destination && <p className="mt-1 text-xs text-amber-700">{copy.noDestination}</p>}
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{copy.from}</p>
                    {origin && <p className="mt-0.5 text-xs text-emerald-700">{copy.locationReady}</p>}
                  </div>
                  <button type="button" onClick={locate} disabled={locating} className="btn-secondary btn-sm min-h-10 gap-2 disabled:opacity-60">
                    <Crosshair size={15} /> {locating ? t('ride.locating') : copy.useLocation}
                  </button>
                </div>
                <label className="sr-only" htmlFor="transport-origin">{copy.originPlaceholder}</label>
                <input
                  id="transport-origin"
                  className="input mt-3"
                  value={originText}
                  onChange={(event) => {
                    setOriginText(event.target.value)
                    if (event.target.value) setOrigin(null)
                  }}
                  placeholder={copy.originPlaceholder}
                  autoComplete="off"
                />
              </div>

              <div>
                <p className="label">{copy.when}</p>
                <div className="grid grid-cols-3 gap-2">
                  {RIDE_WHEN.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setWhen(item.key)}
                      aria-pressed={when === item.key}
                      className={clsx(
                        'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold',
                        when === item.key ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      {t(item.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {destination && !destination.routeTo && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{copy.notRoutable}</p>}

              <button type="button" className="btn-primary min-h-12 w-full gap-2" onClick={() => setStage('needs')} disabled={!destination}>
                {copy.continue} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {stage === 'needs' && (
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-700">{copy.needs}</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">{t('ride.q.modes')}</h2>
                  <p className="mt-1 text-sm text-gray-500">{copy.chooseNeeds}</p>
                </div>
                <button type="button" onClick={() => setStage('trip')} className="btn-secondary btn-sm gap-1.5">
                  <ArrowLeft size={14} /> {t('ride.back')}
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {RIDE_MODES.map((mode) => (
                  <ChoiceCard
                    key={mode.key}
                    selected={modes.includes(mode.key)}
                    onClick={() => toggle(modes, mode.key, setModes)}
                    icon={mode.icon}
                    label={t(mode.labelKey)}
                  />
                ))}
                <ChoiceCard selected={modes.length === 0} onClick={() => setModes([])} label={t('ride.mode.any')} />
              </div>
            </div>

            <div className="card">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <ShieldCheck size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold text-gray-900">{copy.eligibilityTitle}</h2>
                  <p className="mt-1 text-sm text-gray-500">{copy.eligibilityHint}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {RIDE_ELIGIBILITY.map((item) => (
                  <ChoiceCard
                    key={item.key}
                    selected={eligibility.includes(item.key)}
                    onClick={() => toggle(eligibility, item.key, setEligibility)}
                    label={t(item.labelKey)}
                  />
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {copy.privacy}
              </p>
            </div>

            <button type="button" className="btn-primary min-h-12 w-full gap-2" onClick={() => setStage('results')}>
              <Sparkles size={16} /> {copy.showOptions}
            </button>
          </div>
        )}

        {stage === 'results' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStage('needs')} className="btn-secondary btn-sm gap-1.5">
                <ArrowLeft size={14} /> {t('ride.back')}
              </button>
              <button type="button" onClick={restart} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
                <RotateCcw size={14} /> {copy.startOver}
              </button>
            </div>

            {destination?.routeTo && (
              <div className="card overflow-hidden p-0">
                <div className="flex items-start gap-3 bg-slate-900 p-5 text-white">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Navigation size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold">{copy.routeTitle}</h2>
                    <p className="mt-1 text-sm text-slate-300">{copy.routeHint}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
                  {TRAVEL_MODES.map((mode) => (
                    <a
                      key={mode.mode}
                      href={googleMapsUrl(destination.routeTo!, mode.mode, tripOrigin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      <span aria-hidden>{mode.icon}</span> {t(mode.labelKey)}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <Bus size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{copy.assistanceTitle}</h2>
                  <p className="mt-1 text-sm text-gray-500">{copy.assistanceHint}</p>
                </div>
              </div>

              {isLoading && <div className="space-y-3">{[0, 1].map((item) => <div key={item} className="skeleton h-56" />)}</div>}
              {isError && <EmptyState icon={SearchX} title={t('map.loadError')} description={t('map.loadErrorHint')} />}
              {!isLoading && !isError && inArea.length === 0 && otherArea.length === 0 && (
                <EmptyState
                  icon={SearchX}
                  title={t('ride.noProgramsTitle')}
                  description={t('ride.noProgramsBody')}
                  action={<Button to="/map">{t('categoryPage.viewFullMap')}</Button>}
                />
              )}

              <div className="space-y-4">
                {inArea.map((option) => (
                  <ProgramCard key={option.resource.id} option={option} destination={destination} onRequest={requestHelp} />
                ))}
              </div>

              {otherArea.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-bold text-gray-700">{copy.otherArea}</p>
                  <div className="space-y-4 opacity-90">
                    {otherArea.map((option) => (
                      <ProgramCard key={option.resource.id} option={option} destination={destination} onRequest={requestHelp} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {stage !== 'results' && (
        <Section tone="gray" containerSize="prose">
          <SectionHeading title={copy.directory} subtitle={copy.directoryHint} />
          {isLoading && <div className="space-y-3">{[0, 1].map((item) => <div key={item} className="skeleton h-24" />)}</div>}
          {isError && <EmptyState icon={SearchX} title={t('map.loadError')} description={t('map.loadErrorHint')} />}
          {!isLoading && !isError && (programs?.length ?? 0) === 0 && (
            <EmptyState icon={SearchX} title={t('ride.noProgramsTitle')} description={t('ride.noProgramsBody')} />
          )}
          <div className="space-y-3">
            {(programs ?? []).map((resource) => {
              const areas = rideFacet(resource, 'area')
              return (
                <Link key={resource.id} to={`/resources/${resource.id}`} className="card-hover flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Bus size={20} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">{resource.name}</p>
                    {areas.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {areas.map((area) => COUNTY_LABEL_KEY[area] ? t(COUNTY_LABEL_KEY[area]) : area).join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-gray-300" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
