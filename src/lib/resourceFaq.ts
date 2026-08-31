// ============================================================
// StreetRise — Deterministic resource FAQ
// ============================================================
//
// Powers the "Ask a Question" instant-answer panel. Given a free-text
// question and a resource, this returns zero or more answers built only from
// fields already on the resource — hours, address, distance, contact info,
// eligibility, intake conditions, facilities. No network call, no model, no
// invented facts: a rule that has nothing to say returns null and is simply
// omitted, so this can never fabricate an answer the data doesn't support.
//
// This deliberately sits alongside the existing human-routed question form,
// not in place of it — anything not covered here (cost, specific intake
// steps, anything the data doesn't record) still goes to the provider.

import { distanceKm, formatDistance, type LatLng } from '@/lib/geo'
import {
  DAY_KEYS,
  GENDER_POLICY_LABEL,
  POPULATION_FOCUS_LABEL,
  coversMinute,
  hasKnownHours,
  windowFor,
  zonedNow,
  type DayKey,
} from '@/lib/mapFilters'
import type { Resource } from '@/types'

export interface FaqAnswer {
  key: string
  /** Short label for what was answered, e.g. "Hours". */
  label: string
  answer: string
}

export interface FaqContext {
  /** Visitor's location, when granted — powers the distance answer. */
  origin: LatLng | null
  now: Date
}

const DAY_LABEL: Record<DayKey, string> = {
  sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
}

// English and Spanish weekday names/abbreviations a visitor might name
// explicitly ("Friday hours?", "¿el domingo?"). Deliberately an explicit
// word list, not a prefix + \w* — "sun\w*" et al. also matched unrelated
// words like "sunrise", "friendly", "wedding", "monthly".
const DAY_ALIASES: [RegExp, DayKey][] = [
  [/\b(sun|sundays?|domingos?)\b/i, 'sunday'],
  [/\b(mon|mondays?|lunes)\b/i, 'monday'],
  [/\b(tues?|tuesdays?|martes)\b/i, 'tuesday'],
  [/\b(weds?|wednesdays?|mi[eé]rcoles)\b/i, 'wednesday'],
  [/\b(thu|thur|thurs|thursdays?|jueves)\b/i, 'thursday'],
  [/\b(fri|fridays?|viernes)\b/i, 'friday'],
  [/\b(sat|saturdays?|s[aá]bados?)\b/i, 'saturday'],
]

const TODAY_RE = /\btoday\b|\bhoy\b/i
const TOMORROW_RE = /\btomorrow\b|\bma[ñn]ana\b/i
const YESTERDAY_RE = /\byesterday\b|\bayer\b/i
// "mañana" is ambiguous in Spanish — bare it means "tomorrow", but "en/por/de
// la mañana" and "esta mañana" mean "(this) morning" and must NOT be read as
// a day shift ("¿A qué hora abren en la mañana?" is asking about today). A
// question can use both senses at once ("¿Abren mañana por la mañana?" —
// "open tomorrow morning?"), so morning phrases are stripped out (not just
// detected) before re-testing for a standalone "mañana" left over.
const MORNING_PHRASE_RE_G = /\b(en|por|de) la ma[ñn]ana\b|\besta ma[ñn]ana\b/gi

/**
 * The weekday a question is actually asking about, if it names one — either
 * explicitly ("Friday", "el domingo", "today", "hoy") or relatively
 * ("tomorrow", "mañana", "yesterday", "ayer"). `todayIndex` is `zonedNow`'s
 * 0=Sunday..6=Saturday index, needed to resolve the relative terms and
 * "today"/"hoy" into an actual day.
 */
function requestedDay(question: string, todayIndex: number): DayKey | null {
  for (const [re, day] of DAY_ALIASES) {
    if (re.test(question)) return day
  }
  if (TOMORROW_RE.test(question.replace(MORNING_PHRASE_RE_G, ''))) {
    return DAY_KEYS[(todayIndex + 1) % 7]
  }
  if (YESTERDAY_RE.test(question)) return DAY_KEYS[(todayIndex + 6) % 7]
  if (TODAY_RE.test(question)) return DAY_KEYS[todayIndex]
  return null
}

/** "18:00" → "6:00 PM". Falls back to the raw string if it isn't HH:MM. */
function formatClock(value: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return value
  let hour = Number(m[1])
  const minute = m[2]
  if (hour >= 24) return '11:59 PM'
  const suffix = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${suffix}`
}

function isConfidential(r: Resource): boolean {
  return r.access_type === 'confidential_address' || r.access_type === 'phone_intake'
}

function hidesAddress(r: Resource): boolean {
  return isConfidential(r) && (r.population_focus?.includes('domestic_violence') ?? false)
}

// ── Individual answer builders ──────────────────────────────────────

function hoursAnswer(r: Resource, ctx: FaqContext, question: string): string | null {
  const hours = r.hours_of_operation
  const notes = hours?.notes?.trim()
  // `summary` isn't in the HoursOfOperation type but is a real, commonly-seeded
  // field (see ResourceSheet's own hours display) — many listings carry only
  // this free-text sentence with no structured per-day windows at all.
  const summary = (hours as { summary?: string } | null | undefined)?.summary?.trim()
  if (!hasKnownHours(r) && !notes && !summary) return null

  const { dayIndex, minutes } = zonedNow(ctx.now)
  const todayKey = DAY_KEYS[dayIndex]
  // An operational `closed` status is independent of the weekly schedule (an
  // unplanned closure, say) and must be surfaced regardless of which day —
  // today or a named one — the schedule below describes.
  const closedNotice = r.availability_status === 'closed'
    ? "They're currently marked closed — check before planning around this schedule."
    : null

  // A specific day was named ("Friday hours?") — answer that day's own
  // published window, with no live "right now" framing (meaningless for a
  // day that isn't today).
  const askedDay = requestedDay(question, dayIndex)
  if (askedDay && askedDay !== todayKey) {
    const win = windowFor(r, askedDay)
    const parts: string[] = []
    if (closedNotice) parts.push(closedNotice)
    if (win?.closed) {
      parts.push(`They're closed on ${DAY_LABEL[askedDay]}.`)
    } else if (win?.open && win?.close) {
      parts.push(`On ${DAY_LABEL[askedDay]} they're open ${formatClock(win.open)}–${formatClock(win.close)}.`)
    } else if (hasKnownHours(r)) {
      parts.push(`No hours are published for ${DAY_LABEL[askedDay]}.`)
    } else if (summary) {
      parts.push(summary)
    }
    if (notes) parts.push(notes)
    return parts.length ? parts.join(' ') : null
  }

  const yesterdayKey = DAY_KEYS[(dayIndex + 6) % 7]
  const todayWin = windowFor(r, todayKey)
  const yesterdayWin = windowFor(r, yesterdayKey)

  // Mirrors mapFilters' isOpenNow: a window that opened yesterday and crosses
  // midnight can still be the one covering "now".
  const openViaToday = coversMinute(todayWin, minutes, false)
  const openViaYesterday = !openViaToday && coversMinute(yesterdayWin, minutes, true)
  const openNow = (openViaToday || openViaYesterday) && r.availability_status !== 'closed'
  const spilloverLine = openViaYesterday && yesterdayWin?.open && yesterdayWin?.close
    ? `They opened yesterday (${DAY_LABEL[yesterdayKey]}) at ${formatClock(yesterdayWin.open)} and are open until ${formatClock(yesterdayWin.close)}${openNow ? ' — open right now.' : ', but they are currently marked closed.'}`
    : null

  // "today"/"hoy" or a weekday name that happens to equal today were both
  // explicitly asking about the calendar day, so — like a different named
  // day — lead with today's OWN published window rather than a spillover
  // window from yesterday. Unlike a different day, live status still
  // applies, so it's appended rather than dropped: if last night's window is
  // what's actually keeping them open right now, say so as its own clause
  // instead of folding it into today's window (which, at 2am, it isn't).
  const namedToday = askedDay === todayKey

  const stillOpenFromLastNight = openViaYesterday && openNow
    ? `They're currently open from last night's hours, until ${formatClock(yesterdayWin!.close!)}.`
    : null

  const parts: string[] = []
  if (namedToday && todayWin?.closed) {
    parts.push(`They're closed today (${DAY_LABEL[todayKey]}).`)
    if (stillOpenFromLastNight) parts.push(stillOpenFromLastNight)
  } else if (namedToday && todayWin?.open && todayWin?.close) {
    const todayLine = `Today (${DAY_LABEL[todayKey]}) they're open ${formatClock(todayWin.open)}–${formatClock(todayWin.close)}`
    if (openViaToday && openNow) {
      parts.push(`${todayLine} — open right now.`)
    } else if (stillOpenFromLastNight) {
      parts.push(`${todayLine}. ${stillOpenFromLastNight}`)
    } else {
      parts.push(`${todayLine} — closed right now.`)
    }
  } else if (spilloverLine) {
    parts.push(spilloverLine)
  } else if (todayWin?.closed) {
    parts.push(`They're closed today (${DAY_LABEL[todayKey]}).`)
  } else if (todayWin?.open && todayWin?.close) {
    parts.push(
      `Today (${DAY_LABEL[todayKey]}) they're open ${formatClock(todayWin.open)}–${formatClock(todayWin.close)} — ${openNow ? 'open right now.' : 'closed right now.'}`,
    )
  } else if (hasKnownHours(r)) {
    parts.push(`No hours are published for ${DAY_LABEL[todayKey]}.`)
  } else if (summary) {
    if (closedNotice) parts.push(closedNotice)
    parts.push(summary)
  }
  if (notes) parts.push(notes)

  return parts.length ? parts.join(' ') : null
}

function distanceAnswer(r: Resource, ctx: FaqContext): string | null {
  // A phone-intake/confidential-address resource's coordinates are often an
  // administrative office or mobile-service base, not a walk-in destination —
  // ResourceSheet suppresses Directions for the same reason, so a distance
  // figure here would be equally misleading.
  if (isConfidential(r)) {
    return `This isn't a walk-in location, so distance doesn't apply — ${r.phone ? `call ${r.phone}` : 'contact them'} to get connected.`
  }
  if (r.lat == null || r.lng == null) return null
  if (!ctx.origin) {
    return "We don't have your location yet — share it on the map (the locate button) to see the distance here, or use Directions on the listing."
  }
  const km = distanceKm(ctx.origin, { lat: r.lat, lng: r.lng })
  return `${r.name} is about ${formatDistance(km)} from your current location.`
}

function locationAnswer(r: Resource): string | null {
  if (hidesAddress(r)) {
    return `For safety, this address isn't published — ${r.phone ? `call ${r.phone}` : 'contact them'} for the location and intake details.`
  }
  if (isConfidential(r)) {
    return `They don't publish a walk-in address — ${r.phone ? `call ${r.phone}` : 'contact them'} to get started.`
  }
  const addr = [r.address?.street, r.address?.city, r.address?.state, r.address?.zip].filter(Boolean).join(', ')
  return addr ? `They're located at ${addr}.` : null
}

function contactAnswer(r: Resource): string | null {
  const bits: string[] = []
  if (r.phone) bits.push(`call them at ${r.phone}`)
  if (r.email) bits.push(`email them at ${r.email}`)
  if (r.website) bits.push(`visit their website (${r.website.replace(/^https?:\/\//, '')})`)
  return bits.length ? `You can ${bits.join(' or ')}.` : null
}

function aboutAnswer(r: Resource): string | null {
  const d = r.description?.trim()
  return d ? d : null
}

function eligibilityAnswer(r: Resource): string | null {
  const bits: string[] = []
  if (r.gender_policy && r.gender_policy !== 'unknown') {
    bits.push(GENDER_POLICY_LABEL[r.gender_policy] ?? r.gender_policy)
  }
  if (r.population_focus?.length) {
    bits.push(`Serves: ${r.population_focus.map((t) => POPULATION_FOCUS_LABEL[t] ?? t).join(', ')}`)
  }
  if (r.age_min != null) {
    bits.push(`Ages ${r.age_min}${r.age_max ? `–${r.age_max}` : '+'}`)
  }
  return bits.length ? bits.join('. ') + '.' : null
}

function intakeAnswer(r: Resource): string {
  // "No walk-ins" shouldn't itself invent a phone call as the alternative —
  // some resources reject walk-ins but also don't require calling first
  // (access arranged through a website or another site instead), and saying
  // "call ahead" there would contradict the "no need to call first" bit below.
  const noWalkIns = r.phone_required_before_arrival
    ? 'No walk-ins — call ahead'
    : 'No walk-ins — contact them to arrange access'
  const bits = [
    r.walk_ins_accepted ? 'Walk-ins are accepted' : noWalkIns,
    r.requires_id ? 'ID is required' : 'No ID required',
    r.requires_referral ? 'A referral is required' : 'No referral needed',
    r.phone_required_before_arrival ? 'Call before visiting' : 'No need to call first',
  ]
  return bits.join('; ') + '.'
}

function availabilityAnswer(r: Resource): string | null {
  const labels: Partial<Record<Resource['availability_status'], string>> = {
    available: "They're currently marked open / available.",
    limited: 'Availability is currently marked as limited.',
    full: "They're currently marked full.",
    closed: "They're currently marked closed.",
    unknown: "Availability isn't currently confirmed for this listing.",
  }
  // A `closed`/`full`/`unknown` operational status can outlive a shelter's
  // last-known bed count (status and counts are saved independently in
  // ProviderListingEdit), so all three must be checked before falling back
  // to that count — a shelter marked unknown shouldn't still be told a
  // specific bed count as though it were confirmed current.
  if (r.availability_status === 'closed' || r.availability_status === 'full' || r.availability_status === 'unknown') {
    return labels[r.availability_status]!
  }
  if (r.category === 'shelter' && r.beds_total != null) {
    if (r.beds_available != null) {
      return `${r.beds_available} of ${r.beds_total} beds are currently listed as available.`
    }
    return `Bed availability isn't currently listed (${r.beds_total} beds total).`
  }
  return labels[r.availability_status] ?? null
}

function facilityAnswer(condition: boolean, yes: string, no: string): string {
  return condition ? yes : no
}

function languagesAnswer(r: Resource): string | null {
  return r.languages_spoken?.length ? `Languages spoken: ${r.languages_spoken.join(', ')}.` : null
}

// ── Rules ─────────────────────────────────────────────────────────
//
// Every rule whose keyword pattern matches the question runs; a question
// can trigger several at once ("hours and address?"). Order controls the
// order answers are shown in, not which ones fire.

interface FaqRule {
  key: string
  label: string
  keywords: RegExp
  /** `question` is the raw (trimmed) query — only `hoursAnswer` uses it, to spot a named weekday. */
  answer: (r: Resource, ctx: FaqContext, question: string) => string | null
}

// Keyword patterns match English and Spanish: the app's own UI (including this
// panel's placeholder) is bilingual per src/lib/i18n.ts, so a Spanish speaker
// typing a Spanish question must not fall through to "no instant answer" just
// because the rules only recognized English words.
const RULES: FaqRule[] = [
  {
    key: 'hours',
    label: 'Hours',
    // hora\w* covers hora/horas/horario/horarios. The verb forms of "open"
    // (abre/abren/abrimos/abrir/abriendo) are listed explicitly rather than
    // as abr\w* — that also matched unrelated "abr"-prefixed words like
    // "abrigo(s)" (coat/coats), and even a narrower abr[i]\w* would still
    // collide with "abrigo" since "abri" is a shared prefix.
    // open(?!\s+to\b) excludes "open to volunteers"/"open to referrals" etc.
    // — that sense of "open" (receptive/accepting) has nothing to do with
    // hours, but "Are you open?" (no "to" following) still matches.
    keywords: /\b(hours?|open(?!\s+to\b)(s|ing)?|close[sd]?|closing|late|schedule|hora\w*|abre|abren|abrimos|abrir|abriendo|abiert\w*|cierr\w*|cerrad\w*|tarde)\b/i,
    answer: hoursAnswer,
  },
  {
    key: 'availability',
    label: 'Availability',
    // Bare "lugar" ("place") is too generic — it matches any question about
    // the place at all, not just availability ("¿Qué tipo de lugar es
    // este?"). Restricted to the actual availability phrasing ("hay lugar",
    // "lugar disponible", "queda lugar" — "is there room/space?").
    keywords: /\b(bed|beds|spot|spots|room|vacan\w*|availab\w*|cama\w*|hay lugar|lugar disponible|queda\w* lugar|cupo\w*|disponib\w*)\b/i,
    answer: availabilityAnswer,
  },
  {
    key: 'distance',
    label: 'Distance',
    // Bare "near"/"nearby"/"cerca" fired on questions about some other
    // nearby amenity ("Is there a pharmacy nearby?"), answering with this
    // listing's own distance instead. Restricted to phrasing that compares
    // the listing to the visitor ("near me", "cerca de mí").
    keywords: /\b(how far|distance|miles?|near me|qué tan lejos|que tan lejos|distancia|millas?|cerca de m[ií])\b/i,
    answer: distanceAnswer,
  },
  {
    key: 'location',
    label: 'Location',
    // Bare "where"/"dónde" fired on any where-question ("Where can I
    // park?"), not just ones about the listing's own location.
    keywords: /\b(where (is|are|do) (it|this|they|you)|where('?s)? (it|this|they) located|address|located|location|directions|dónde (est[aá]n|est[aá]|queda|se encuentra)|direcci[oó]n|ubicad\w*|ubicaci[oó]n)\b/i,
    answer: locationAnswer,
  },
  {
    key: 'contact',
    label: 'Contact',
    // Bare "number"/"número" fired on any other numeric question ("What
    // number of beds are available?") whenever the resource had contact
    // data — "phone" alone already covers real phone-number questions.
    keywords: /\b(phone|call|contact|reach|email|website|tel[eé]fono|llamar|contacto|correo|sitio\s?web)\b/i,
    answer: contactAnswer,
  },
  {
    key: 'eligibility',
    label: 'Who it serves',
    // Bare "allowed"/"permitido" fired on any permission question ("Is
    // parking allowed?"), not just eligibility ones — the concrete
    // population/gender/age terms already cover real eligibility questions.
    // famil\w* also matched "familiar"/"familiarized" (staff being familiar
    // with something, not a family), so family forms are listed explicitly.
    keywords: /\b(who can|eligib\w*|qualify|men\b|women\b|famil(y|ies)|familias?|veteran\w*|lgbtq\w*|youth|senior\w*|age\b|ages\b|calificar|hombres|mujeres|j[oó]ven(es)?|edad\w*)\b/i,
    answer: eligibilityAnswer,
  },
  {
    key: 'intake',
    label: 'Getting in',
    // walk[\s-]?in\w* also matched "walking" ("walk" + "in" + "g" with the
    // separator matching zero-width) — restricted to the actual walk-in
    // forms, no trailing wildcard.
    keywords: /\b(id\b|identification|referral|walk[\s-]?ins?|appointment|call first|need to call|identificaci[oó]n|c[eé]dula|referencia|cita\w*|llamar antes)\b/i,
    answer: intakeAnswer,
  },
  {
    key: 'showers',
    label: 'Showers',
    keywords: /\b(shower\w*|duchas?|regaderas?)\b/i,
    answer: (r) => facilityAnswer(r.has_showers, 'Yes, showers are available.', "They don't list showers as available."),
  },
  {
    key: 'restrooms',
    label: 'Restrooms',
    keywords: /\b(restroom\w*|bathroom\w*|toilet\w*|ba[ñn]os?|sanitarios?)\b/i,
    answer: (r) => facilityAnswer(r.has_restrooms, 'Yes, restrooms are available.', "They don't list restrooms as available."),
  },
  {
    key: 'meals',
    label: 'Meals',
    keywords: /\b(meal\w*|food|eat\w*|lunch|dinner|breakfast|comidas?|almuerzo|cena|desayuno|comer)\b/i,
    answer: (r) => facilityAnswer(r.serves_meals, 'Yes, meals are served here.', "They don't list meals as served here."),
  },
  {
    key: 'laundry',
    label: 'Laundry',
    keywords: /\b(laundry|lavander[ií]a)\b/i,
    answer: (r) => facilityAnswer(r.has_laundry, 'Yes, laundry is available.', "They don't list laundry as available."),
  },
  {
    key: 'pets',
    label: 'Pets',
    // Whole words only — pet\w*/dog\w*/cat\w* also matched "petition",
    // "dogma", "catering", "category".
    keywords: /\b(pet|pets|dog|dogs|cat|cats|mascotas?|perros?|gatos?)\b/i,
    answer: (r) => facilityAnswer(r.pet_friendly, 'Yes, pets are welcome.', "They don't list themselves as pet-friendly."),
  },
  {
    key: 'accessibility',
    label: 'Accessibility',
    keywords: /\b(wheelchair\w*|accessib\w*|silla de ruedas|accesib\w*)\b/i,
    answer: (r) => facilityAnswer(r.wheelchair_accessible, 'Yes, this location is wheelchair accessible.', "They don't list wheelchair accessibility."),
  },
  {
    key: 'transit',
    label: 'Transit',
    // "bus" as a whole word, not a prefix — bus\w* also matched "business".
    keywords: /\b(bus|buses|bus stop|bus route|transit|transportation|autob[uú]s\w*|transporte\w*)\b/i,
    answer: (r) => facilityAnswer(r.public_transit_accessible, "Yes, it's near public transit.", "They don't list themselves as near public transit."),
  },
  {
    key: 'languages',
    label: 'Languages',
    keywords: /\blanguages?\b|\bspeak\w*\b|\bidiomas?\b|\bhablan?\b/i,
    answer: languagesAnswer,
  },
  {
    key: 'about',
    label: 'About',
    // Deliberately specific phrasing, not bare "what is"/"who is" — those
    // matched as a prefix of unrelated questions ("What is their phone
    // number?", "What are your Friday hours?"), firing this rule alongside
    // whichever one the visitor actually meant.
    keywords: /\b(tell me about|what (is|are) (this|it|they)\b|what do(es)? (they|this|it) do|who (are|is) (they|this)|about (this|them)\b|acerca de|qu[eé] hacen|cu[eé]ntame)\b/i,
    answer: aboutAnswer,
  },
]

/**
 * Match a free-text question against every rule and return the answers for
 * the rules that both match the question's keywords AND have something to
 * say. A rule matching keywords but returning null (data not recorded) is
 * dropped rather than shown as an empty or apologetic card.
 */
export function findFaqAnswers(resource: Resource, question: string, ctx: FaqContext): FaqAnswer[] {
  const q = question.trim()
  if (q.length < 2) return []

  const out: FaqAnswer[] = []
  for (const rule of RULES) {
    if (!rule.keywords.test(q)) continue
    const answer = rule.answer(resource, ctx, q)
    if (answer) out.push({ key: rule.key, label: rule.label, answer })
  }
  return out
}

/**
 * Keys for the suggestion chips shown before the visitor types anything.
 * Labels and example queries are localized (see `booking.faq.suggest.*` in
 * `@/lib/i18n`) rather than defined here, so a Spanish speaker's chip click
 * doesn't switch the panel back to English mid-conversation.
 */
export const FAQ_SUGGESTION_KEYS = ['hours', 'distance', 'address', 'contact', 'requirements', 'availability'] as const
