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
// explicitly ("Friday hours?", "¿el domingo?"). Matched with \w* so common
// abbreviations and conjugated forms still hit ("tues", "miércoles").
const DAY_ALIASES: [RegExp, DayKey][] = [
  [/\bsun\w*\b|\bdomingo\b/i, 'sunday'],
  [/\bmon\w*\b|\blunes\b/i, 'monday'],
  [/\btue\w*\b|\bmartes\b/i, 'tuesday'],
  [/\bwed\w*\b|\bmi[eé]rcoles\b/i, 'wednesday'],
  [/\bthu\w*\b|\bjueves\b/i, 'thursday'],
  [/\bfri\w*\b|\bviernes\b/i, 'friday'],
  [/\bsat\w*\b|\bs[aá]bado\b/i, 'saturday'],
]

const TOMORROW_RE = /\btomorrow\b|\bma[ñn]ana\b/i
const YESTERDAY_RE = /\byesterday\b|\bayer\b/i

/**
 * The weekday a question is actually asking about, if it names one — either
 * explicitly ("Friday", "el domingo") or relatively ("tomorrow", "mañana").
 * `todayIndex` is `zonedNow`'s 0=Sunday..6=Saturday index, needed to resolve
 * the relative terms into an actual day.
 */
function requestedDay(question: string, todayIndex: number): DayKey | null {
  for (const [re, day] of DAY_ALIASES) {
    if (re.test(question)) return day
  }
  if (TOMORROW_RE.test(question)) return DAY_KEYS[(todayIndex + 1) % 7]
  if (YESTERDAY_RE.test(question)) return DAY_KEYS[(todayIndex + 6) % 7]
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
  if (!hasKnownHours(r) && !notes) return null

  const { dayIndex, minutes } = zonedNow(ctx.now)
  const todayKey = DAY_KEYS[dayIndex]

  // A specific day other than today was named ("Friday hours?") — answer
  // that day's own published window. "Right now" framing only makes sense
  // for the current day, so this branch never claims open/closed-right-now.
  const askedDay = requestedDay(question, dayIndex)
  if (askedDay && askedDay !== todayKey) {
    const win = windowFor(r, askedDay)
    const parts: string[] = []
    if (win?.closed) {
      parts.push(`They're closed on ${DAY_LABEL[askedDay]}.`)
    } else if (win?.open && win?.close) {
      parts.push(`On ${DAY_LABEL[askedDay]} they're open ${formatClock(win.open)}–${formatClock(win.close)}.`)
    } else if (hasKnownHours(r)) {
      parts.push(`No hours are published for ${DAY_LABEL[askedDay]}.`)
    }
    if (notes) parts.push(notes)
    return parts.length ? parts.join(' ') : null
  }

  const yesterdayKey = DAY_KEYS[(dayIndex + 6) % 7]
  const todayWin = windowFor(r, todayKey)
  const yesterdayWin = windowFor(r, yesterdayKey)

  // Mirrors mapFilters' isOpenNow: a window that opened yesterday and crosses
  // midnight can still be the one covering "now", so describe *that* window
  // rather than always narrating today's (possibly unrelated) hours.
  const openViaToday = coversMinute(todayWin, minutes, false)
  const openViaYesterday = !openViaToday && coversMinute(yesterdayWin, minutes, true)
  // A provider-set `closed` status is an operational override independent of
  // the weekly schedule (an unplanned closure, say), so it must win over a
  // schedule that would otherwise say "open right now".
  const openNow = (openViaToday || openViaYesterday) && r.availability_status !== 'closed'

  const parts: string[] = []
  if (openViaYesterday && yesterdayWin?.open && yesterdayWin?.close) {
    parts.push(
      `They opened yesterday (${DAY_LABEL[yesterdayKey]}) at ${formatClock(yesterdayWin.open)} and are open until ${formatClock(yesterdayWin.close)}${openNow ? ' — open right now.' : ', but they are currently marked closed.'}`,
    )
  } else if (todayWin?.closed) {
    parts.push(`They're closed today (${DAY_LABEL[todayKey]}).`)
  } else if (todayWin?.open && todayWin?.close) {
    parts.push(
      `Today (${DAY_LABEL[todayKey]}) they're open ${formatClock(todayWin.open)}–${formatClock(todayWin.close)} — ${openNow ? 'open right now.' : 'closed right now.'}`,
    )
  } else if (hasKnownHours(r)) {
    parts.push(`No hours are published for ${DAY_LABEL[todayKey]}.`)
  }
  if (notes) parts.push(notes)

  return parts.length ? parts.join(' ') : null
}

function distanceAnswer(r: Resource, ctx: FaqContext): string | null {
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
  const bits = [
    r.walk_ins_accepted ? 'Walk-ins are accepted' : 'No walk-ins — call ahead',
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
  }
  // A `closed` or `full` operational status can outlive a shelter's
  // last-known bed count (the two are saved independently), so both must be
  // checked before falling back to that count — a shelter marked closed or
  // full shouldn't still be told "beds available".
  if (r.availability_status === 'closed' || r.availability_status === 'full') {
    return labels[r.availability_status]!
  }
  if (r.category === 'shelter' && r.beds_total != null) {
    const avail = r.beds_available != null ? String(r.beds_available) : 'an unknown number of'
    return `${avail} of ${r.beds_total} beds are currently listed as available.`
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
    keywords: /\b(hours?|open(s|ing)?|close[sd]?|closing|late|schedule|horarios?|abr[ei]\w*|cierr\w*|cerrad\w*|tarde)\b/i,
    answer: hoursAnswer,
  },
  {
    key: 'availability',
    label: 'Availability',
    keywords: /\b(bed|beds|spot|spots|room|vacan\w*|availab\w*|cama\w*|lugar\w*|cupo\w*|disponib\w*)\b/i,
    answer: availabilityAnswer,
  },
  {
    key: 'distance',
    label: 'Distance',
    keywords: /\b(how far|distance|miles?|near(by|\s?me)?|qué tan lejos|que tan lejos|distancia|millas?|cerca)\b/i,
    answer: distanceAnswer,
  },
  {
    key: 'location',
    label: 'Location',
    keywords: /\b(where|address|located|location|directions|dónde|donde|direcci[oó]n|ubicad\w*|ubicaci[oó]n)\b/i,
    answer: locationAnswer,
  },
  {
    key: 'contact',
    label: 'Contact',
    keywords: /\b(phone|call|number|contact|reach|email|website|tel[eé]fono|llamar|n[uú]mero|contacto|correo|sitio\s?web)\b/i,
    answer: contactAnswer,
  },
  {
    key: 'eligibility',
    label: 'Who it serves',
    keywords: /\b(who can|eligib\w*|qualify|men\b|women\b|famil\w*|veteran\w*|lgbtq\w*|youth|senior\w*|age\b|ages\b|allowed|calificar|hombres|mujeres|j[oó]ven(es)?|edad\w*|permitid\w*)\b/i,
    answer: eligibilityAnswer,
  },
  {
    key: 'intake',
    label: 'Getting in',
    keywords: /\b(id\b|identification|referral|walk[\s-]?in\w*|appointment|call first|need to call|identificaci[oó]n|c[eé]dula|referencia|cita\w*|llamar antes)\b/i,
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
    keywords: /\b(pet\w*|dog\w*|cat\w*|mascotas?|perros?|gatos?)\b/i,
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
    keywords: /\b(bus\w*|transit|transportation|autob[uú]s\w*|transporte\w*)\b/i,
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
    keywords: /\b(what (is|do|are)|who (are|is)|about|services|qu[eé] es|qu[eé] hacen|acerca de|servicios)\b/i,
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

/** Suggestion chips shown before the visitor types anything. */
export const FAQ_SUGGESTIONS: { label: string; query: string }[] = [
  { label: 'Hours', query: 'What time do they open and close today?' },
  { label: 'Distance', query: 'How far is this from me?' },
  { label: 'Address', query: 'Where are they located?' },
  { label: 'Contact', query: 'What is their phone number?' },
  { label: 'Requirements', query: 'Do I need an ID or referral, or can I just walk in?' },
  { label: 'Availability', query: 'Do they have space available right now?' },
]
