import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, ArrowRight, Bus, Crosshair, ExternalLink, Lock,
  Phone, RotateCcw, SearchX,
} from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import {
  RIDE_ELIGIBILITY, RIDE_MODES, RIDE_WHEN, RIDE_KIND_LABEL_KEY, COUNTY_LABEL_KEY,
  countyForCity, fetchRideAssistance, rankRideOptions, rideFacet,
  type RideAnswers, type RideEligibility, type RideMode, type RideOption, type RideWhen,
} from '@/lib/rideOptions'
import { TRAVEL_MODES, googleMapsUrl, type TripOrigin } from '@/lib/transport'
import { useMapStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/lib/store'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import type { LatLng } from '@/lib/geo'
import type { Resource } from '@/types'

/**
 * /transportation — the Ride Assistance Finder and the transportation directory.
 *
 * Two things live on one route on purpose. The directory is the page's stable,
 * indexable content: every fare-assistance, paratransit and travel-training
 * programme StreetRise knows about. The finder is the same data, ranked against
 * five plain questions, and it is what someone who tapped "Need help getting
 * there?" on a listing actually wants.
 *
 * `?to=<resourceId>` prefills the destination from the listing they came from;
 * `?mode=wheelchair` preselects accessible transportation. Nothing else is ever
 * put in the URL — see the privacy note below.
 *
 * ── What this page does NOT do ───────────────────────────────────
 * It does not plan a route, quote a fare, or estimate a trip time. Those come
 * from a real transit app, which this page hands the trip to. It also never
 * tells anyone they qualify for a programme: the strongest thing it says is
 * "you may qualify", next to the requirement the programme publishes.
 *
 * ── Privacy ──────────────────────────────────────────────────────
 * The eligibility step asks about income, disability, Medicaid and veteran
 * status. Those answers live in React state for the length of this visit and
 * nowhere else: no Supabase write, no URL parameter, no persisted store, no
 * analytics call. Closing the tab is all it takes to erase them. If that ever
 * needs to change, it changes as an opt-in on an account the person created —
 * not as a default.
 */

type Step = 'destination' | 'origin' | 'when' | 'modes' | 'eligibility' | 'results'

const STEP_ORDER: Step[] = ['destination', 'origin', 'when', 'modes', 'eligibility', 'results']

const FIT_BADGE: Record<RideOption['fit'], { classes: string; labelKey: string }> = {
  best:       { classes: 'bg-emerald-50 text-emerald-700', labelKey: 'ride.fit.best' },
  possible:   { classes: 'bg-blue-50 text-blue-700',       labelKey: 'ride.fit.possible' },
  check:      { classes: 'bg-gray-100 text-gray-600',      labelKey: 'ride.fit.check' },
  other_area: { classes: 'bg-amber-50 text-amber-700',     labelKey: 'ride.fit.other_area' },
}

/** A destination is either a StreetRise listing or free text someone typed. */
interface Destination {
  label: string
  /** What a map app should route to — coordinates when we have them. */
  routeTo: string | null
  /** City name, used only to resolve a county for service-area matching. */
  city: string | null
}

function destinationFromResource(r: Resource): Destination {
  // Confidential-address and phone-intake listings store an address that is not
  // where the service reaches the public, so they get a name and a county but
  // never a routable target. Same gate as ResourceSheet and transport.ts.
  const routable = r.access_type !== 'confidential_address' && r.access_type !== 'phone_intake'
  const street = [r.address?.street, r.address?.city, r.address?.state, r.address?.zip]
    .filter(Boolean).join(', ')
  return {
    label: r.name,
    routeTo: routable ? (r.lat != null && r.lng != null ? `${r.lat},${r.lng}` : street || null) : null,
    city: r.address?.city ?? null,
  }
}

/**
 * Best-effort city extraction from free text.
 *
 * Tries the whole string first, then each comma-separated part, so both
 * "Clearwater" and "1059 N Hercules Ave, Clearwater, FL" resolve. An
 * unrecognised city yields null, and a null county is treated as "maybe"
 * rather than "no" by the matcher — nothing is excluded on a failed guess.
 */
function destinationFromText(text: string): Destination {
  const trimmed = text.trim()
  const parts = [trimmed, ...trimmed.split(',').map((p) => p.trim())]
  const city = parts.find((p) => countyForCity(p) !== null) ?? null
  return { label: trimmed, routeTo: trimmed || null, city }
}

function StepShell({
  title, hint, children, onBack, onNext, nextLabel, nextDisabled,
}: {
  title: string
  hint?: string
  children: React.ReactNode
  onBack?: () => void
  onNext: () => void
  nextLabel: string
  nextDisabled?: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="card">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
      <div className="mt-4">{children}</div>
      <div className="mt-6 flex items-center gap-3">
        {onBack && (
          <button type="button" onClick={onBack} className="btn-secondary btn-sm gap-1.5">
            <ArrowLeft size={15} /> {t('ride.back')}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="btn-primary gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {nextLabel} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

/** A multi-select chip. Selecting nothing always means "any", never "none". */
function ChoiceChip({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
        selected
          ? 'border-primary-600 bg-primary-600 text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      {children}
    </button>
  )
}

function OptionCard({ option }: { option: RideOption }) {
  const { t } = useI18n()
  const r = option.resource
  const badge = FIT_BADGE[option.fit]
  const kinds = rideFacet(r, 'kind')

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={clsx('badge', badge.classes)}>{t(badge.labelKey)}</span>
        {kinds.map((k) => (
          <span key={k} className="badge bg-gray-100 text-gray-600">
            {RIDE_KIND_LABEL_KEY[k] ? t(RIDE_KIND_LABEL_KEY[k]) : k}
          </span>
        ))}
        <span className={r.verification_status === 'verified' ? 'badge-verified' : 'badge-pending'}>
          {r.verification_status === 'verified' ? t('badge.staffVerified') : t('badge.communityListed')}
        </span>
      </div>

      <h3 className="mt-2 font-bold text-gray-900">{r.name}</h3>
      {r.description && (
        <p lang="en" className="mt-1 text-sm leading-relaxed text-gray-600">{r.description}</p>
      )}

      {option.reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {option.reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-sm text-gray-700">
              <span aria-hidden className="text-emerald-600">✓</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      {option.cautions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {option.cautions.map((caution) => (
            <li key={caution} className="flex gap-2 text-sm text-amber-700">
              <span aria-hidden>!</span>
              <span>{caution}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {r.phone && (
          <a href={`tel:${r.phone}`} className="btn-primary btn-sm gap-1.5">
            <Phone size={14} /> {t('ride.callProgram')}
          </a>
        )}
        {r.website && (
          <a
            href={r.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
          >
            <ExternalLink size={14} /> {t('ride.programWebsite')}
          </a>
        )}
        <Link
          to={`/resources/${r.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          {t('resourceSheet.fullDetails')} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

export default function TransportationPage() {
  const { t, lang } = useI18n()
  const toast = useToast()
  const [params, setSearchParams] = useSearchParams()
  const storedLocation = useMapStore((s) => s.userLocation)

  const destinationId = params.get('to')
  const preselectWheelchair = params.get('mode') === 'wheelchair'

  // ── The destination listing, when we arrived from one ──
  const { data: destinationResource } = useQuery<Resource | null>({
    queryKey: ['transportation-destination', destinationId],
    queryFn: async () => {
      const { data } = await db.resources().select('*').eq('id', destinationId!).single()
      return (data as unknown as Resource) ?? null
    },
    enabled: !!destinationId,
  })

  const { data: programs, isLoading, isError } = useQuery({
    queryKey: ['ride-assistance'],
    queryFn: fetchRideAssistance,
    staleTime: 1000 * 60 * 5,
  })

  // ── Wizard state. None of this is persisted anywhere. ──
  const [step, setStep] = useState<Step>('destination')
  const [destinationText, setDestinationText] = useState('')
  const [origin, setOrigin] = useState<LatLng | null>(storedLocation)
  const [originText, setOriginText] = useState('')
  const [when, setWhen] = useState<RideWhen>('now')
  const [modes, setModes] = useState<RideMode[]>(preselectWheelchair ? ['wheelchair'] : [])
  const [eligibility, setEligibility] = useState<RideEligibility[]>([])
  const [locating, setLocating] = useState(false)

  const destination: Destination | null = destinationResource
    ? destinationFromResource(destinationResource)
    : destinationText.trim()
      ? destinationFromText(destinationText)
      : null

  // Coordinates win when the browser gave them; otherwise whatever address was
  // typed is handed to the map app, which can geocode it far better than we can.
  const tripOrigin: TripOrigin = origin ?? (originText.trim() || null)

  const answers: RideAnswers = useMemo(() => ({ modes, eligibility, when }), [modes, eligibility, when])

  const ranked = useMemo(
    () => rankRideOptions(programs ?? [], answers, {
      destinationCity: destination?.city,
      originText,
      // Geolocation answers "where are you now" without yielding a city, so
      // the ranking is told a starting point EXISTS even when it cannot be
      // placed. That is a different unknown from skipping the question, and
      // scores differently — see rideOptions' ScoreContext.originProvided.
      originProvided: !!origin || !!originText.trim(),
      t,
    }),
    // `lang`, not `t`: the translator is a fresh closure every render, so
    // depending on it would recompute the whole ranking each time. The active
    // language is the thing that actually changes the output — every reason and
    // caution below is a translated sentence, and without this a visitor who
    // switched EN↔ES on the results screen kept the previous language's
    // explanations under freshly re-rendered headings (caught in review on
    // PR #100).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [programs, answers, destination?.city, originText, origin, lang],
  )

  const inArea = ranked.filter((o) => o.fit !== 'other_area')
  const otherArea = ranked.filter((o) => o.fit === 'other_area')

  const stepIndex = STEP_ORDER.indexOf(step)
  const goTo = (next: Step) => setStep(next)

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('ride.locationUnsupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Deliberately does NOT clear what they typed. Coordinates are the
        // better routing target, but only the text can be resolved to a county
        // for service-area matching — there is no reverse geocoder here — so
        // clearing it threw away the one input the ranking could actually use
        // (caught in review on PR #100). Both are kept: coordinates win for the
        // map link, text drives the matching.
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
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
    // `?to=` has to go, not just the typed text. It is what populates
    // `destinationResource`, so leaving it in place returned the wizard to the
    // destination step still showing the original listing as a fixed value,
    // with no way to search for anywhere else — and that is the entry path
    // almost everyone arrives by, from the Get There panel (caught in review
    // on PR #100). `replace` keeps this out of the back-button history.
    if (params.has('to') || params.has('mode')) {
      setSearchParams(new URLSearchParams(), { replace: true })
    }
    setStep('destination')
    setDestinationText('')
    setOriginText('')
    setOrigin(null)
    setWhen('now')
    setModes([])
    setEligibility([])
  }

  const description = t('transportation.metaDescription')

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead title={t('transportation.title')} description={description} path="/transportation">
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Transportation Assistance', path: '/transportation' },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-4 text-center">
        <span className="text-4xl" aria-hidden>🚌</span>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
          {t('transportation.h1')}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{t('transportation.intro')}</p>
      </Section>

      {/* ── The finder ── */}
      <Section containerSize="prose" className="pt-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
            {t('ride.stepCounter')
              .replace('{current}', String(Math.min(stepIndex + 1, STEP_ORDER.length - 1)))
              .replace('{total}', String(STEP_ORDER.length - 1))}
          </p>
          {step === 'results' && (
            <button type="button" onClick={restart} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <RotateCcw size={14} /> {t('ride.startOver')}
            </button>
          )}
        </div>

        {step === 'destination' && (
          <StepShell
            title={t('ride.q.destination')}
            hint={t('ride.q.destinationHint')}
            onNext={() => goTo('origin')}
            nextLabel={t('ride.next')}
            nextDisabled={!destination}
          >
            {destinationResource ? (
              <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-800">
                <span className="font-semibold">{destinationResource.name}</span>
                {destinationResource.address?.city && (
                  <span className="text-gray-500"> · {destinationResource.address.city}</span>
                )}
              </p>
            ) : (
              <>
                <label className="label" htmlFor="ride-destination">{t('ride.q.destination')}</label>
                <input
                  id="ride-destination"
                  className="input"
                  value={destinationText}
                  onChange={(e) => setDestinationText(e.target.value)}
                  placeholder={t('ride.q.destinationPlaceholder')}
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('ride.q.destinationFromMap')}{' '}
                  <Link to="/map" className="font-semibold text-primary-600 hover:underline">
                    {t('ride.q.destinationOpenMap')}
                  </Link>
                </p>
              </>
            )}
          </StepShell>
        )}

        {step === 'origin' && (
          <StepShell
            title={t('ride.q.origin')}
            hint={t('ride.q.originHint')}
            onBack={() => goTo('destination')}
            onNext={() => goTo('when')}
            nextLabel={t('ride.next')}
          >
            <div className="space-y-3">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="btn-secondary gap-2 disabled:opacity-60"
              >
                <Crosshair size={15} /> {locating ? t('ride.locating') : t('ride.useMyLocation')}
              </button>
              {origin && (
                <p className="text-sm text-emerald-700">{t('ride.locationSet')}</p>
              )}
              <div>
                <label className="label" htmlFor="ride-origin">{t('ride.q.originAddress')}</label>
                <input
                  id="ride-origin"
                  className="input"
                  value={originText}
                  onChange={(e) => { setOriginText(e.target.value); if (e.target.value) setOrigin(null) }}
                  placeholder={t('ride.q.originPlaceholder')}
                  autoComplete="off"
                />
              </div>
            </div>
          </StepShell>
        )}

        {step === 'when' && (
          <StepShell
            title={t('ride.q.when')}
            hint={t('ride.q.whenHint')}
            onBack={() => goTo('origin')}
            onNext={() => goTo('modes')}
            nextLabel={t('ride.next')}
          >
            <div className="flex flex-wrap gap-2">
              {RIDE_WHEN.map((w) => (
                <ChoiceChip key={w.key} selected={when === w.key} onClick={() => setWhen(w.key)}>
                  {t(w.labelKey)}
                </ChoiceChip>
              ))}
            </div>
          </StepShell>
        )}

        {step === 'modes' && (
          <StepShell
            title={t('ride.q.modes')}
            hint={t('ride.q.modesHint')}
            onBack={() => goTo('when')}
            onNext={() => goTo('eligibility')}
            nextLabel={t('ride.next')}
          >
            <div className="flex flex-wrap gap-2">
              {RIDE_MODES.map((m) => (
                <ChoiceChip
                  key={m.key}
                  selected={modes.includes(m.key)}
                  onClick={() => toggle(modes, m.key, setModes)}
                >
                  <span aria-hidden>{m.icon}</span> {t(m.labelKey)}
                </ChoiceChip>
              ))}
              <ChoiceChip selected={modes.length === 0} onClick={() => setModes([])}>
                {t('ride.mode.any')}
              </ChoiceChip>
            </div>
          </StepShell>
        )}

        {step === 'eligibility' && (
          <StepShell
            title={t('ride.q.eligibility')}
            hint={t('ride.q.eligibilityHint')}
            onBack={() => goTo('modes')}
            onNext={() => goTo('results')}
            nextLabel={t('ride.showOptions')}
          >
            <div className="flex flex-wrap gap-2">
              {RIDE_ELIGIBILITY.map((e) => (
                <ChoiceChip
                  key={e.key}
                  selected={eligibility.includes(e.key)}
                  onClick={() => toggle(eligibility, e.key, setEligibility)}
                >
                  {t(e.labelKey)}
                </ChoiceChip>
              ))}
              <ChoiceChip selected={eligibility.length === 0} onClick={() => setEligibility([])}>
                {t('ride.elig.none')}
              </ChoiceChip>
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
              <Lock size={14} className="mt-0.5 shrink-0 text-gray-400" />
              {t('ride.privacyNote')}
            </p>
          </StepShell>
        )}

        {step === 'results' && (
          <div className="space-y-4">
            {/* Plan the trip yourself. StreetRise does not compute the route —
                it hands the destination to an app that knows the timetable. */}
            {destination?.routeTo && (
              <div className="card">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                  <Bus size={16} className="text-gray-400" />
                  {t('ride.planTripTitle').replace('{destination}', destination.label)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">{t('ride.planTripHint')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TRAVEL_MODES.map((m) => (
                    <a
                      key={m.mode}
                      href={googleMapsUrl(destination.routeTo!, m.mode, tripOrigin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-200"
                    >
                      <span aria-hidden>{m.icon}</span> {t(m.labelKey)}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {isLoading && [0, 1].map((i) => <div key={i} className="skeleton h-40" />)}

            {isError && (
              <EmptyState
                icon={SearchX}
                title={t('map.loadError')}
                description={t('map.loadErrorHint')}
              />
            )}

            {!isLoading && !isError && inArea.length === 0 && otherArea.length === 0 && (
              <EmptyState
                icon={SearchX}
                title={t('ride.noProgramsTitle')}
                description={t('ride.noProgramsBody')}
                action={<Button to="/map">{t('categoryPage.viewFullMap')}</Button>}
              />
            )}

            {inArea.length > 0 && (
              <>
                <p className="text-sm font-semibold text-gray-700">
                  {t('ride.resultsCount').replace('{count}', String(inArea.length))}
                </p>
                {inArea.map((o) => <OptionCard key={o.resource.id} option={o} />)}
              </>
            )}

            {otherArea.length > 0 && (
              <>
                <p className="pt-2 text-sm font-semibold text-gray-700">{t('ride.otherAreasTitle')}</p>
                <p className="text-sm text-gray-500">{t('ride.otherAreasBody')}</p>
                {otherArea.map((o) => <OptionCard key={o.resource.id} option={o} />)}
              </>
            )}

            <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
              {t('ride.confirmDisclaimer')}
            </p>
          </div>
        )}
      </Section>

      {/* ── The directory. Always rendered, so the page is useful (and
          indexable) before anyone answers a single question. ── */}
      {step !== 'results' && (
        <Section tone="gray" containerSize="prose">
          <SectionHeading
            title={t('transportation.directoryTitle')}
            subtitle={t('transportation.directorySubtitle')}
          />
          {isLoading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-24" />)}</div>}
          {!isLoading && (programs?.length ?? 0) === 0 && (
            <EmptyState
              icon={SearchX}
              title={t('ride.noProgramsTitle')}
              description={t('ride.noProgramsBody')}
              action={<Button to="/map">{t('categoryPage.viewFullMap')}</Button>}
            />
          )}
          <div className="space-y-3">
            {(programs ?? []).map((r) => {
              const areas = rideFacet(r, 'area')
              return (
                <Link key={r.id} to={`/resources/${r.id}`} className="card-hover block">
                  <p className="font-bold text-gray-900">{r.name}</p>
                  {areas.length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {areas.map((a) => (COUNTY_LABEL_KEY[a] ? t(COUNTY_LABEL_KEY[a]) : a)).join(', ')}
                    </p>
                  )}
                  {r.description && (
                    <p lang="en" className="mt-1 line-clamp-2 text-sm text-gray-600">{r.description}</p>
                  )}
                </Link>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
