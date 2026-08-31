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
//
// Rule *labels* and generated *answer sentences* are localized via i18n's
// `faq.*` keys (matching the active locale) — only `aboutAnswer`, which is
// literally the provider-authored `description` field, stays untranslated,
// consistent with resource descriptions being English-only DB content
// elsewhere in the app. gender_policy/population_focus labels also stay
// English-only, matching how those badges render everywhere else (map
// chips, ResourceSheet, category pages).

import { distanceKm, formatDistance, type LatLng } from '@/lib/geo'
import { translate, type Lang } from '@/lib/i18n'
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
  /** Active UI locale — drives both the rule label and the answer text. */
  lang: Lang
}

/** `translate` plus `{placeholder}` substitution for the FAQ's templated strings. */
function t(lang: Lang, key: string, vars: Record<string, string> = {}): string {
  let s = translate(lang, key)
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v)
  return s
}

const DAY_KEY_TO_I18N: Record<DayKey, string> = {
  sunday: 'faq.day.sunday', monday: 'faq.day.monday', tuesday: 'faq.day.tuesday',
  wednesday: 'faq.day.wednesday', thursday: 'faq.day.thursday', friday: 'faq.day.friday',
  saturday: 'faq.day.saturday',
}
const dayLabel = (lang: Lang, day: DayKey) => translate(lang, DAY_KEY_TO_I18N[day])

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

/** "call {phone}" or "contact them" — shared by distance/location answers. */
function contactFragment(lang: Lang, phone: string | undefined): string {
  return phone ? t(lang, 'faq.common.callPhone', { phone }) : t(lang, 'faq.common.contactThem')
}

// ── Individual answer builders ──────────────────────────────────────

function hoursAnswer(r: Resource, ctx: FaqContext, question: string): string | null {
  const { lang } = ctx
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
  const closedNotice = r.availability_status === 'closed' ? t(lang, 'faq.hours.closedNotice') : null

  // A specific day was named ("Friday hours?") — answer that day's own
  // published window, with no live "right now" framing (meaningless for a
  // day that isn't today).
  const askedDay = requestedDay(question, dayIndex)
  if (askedDay && askedDay !== todayKey) {
    const win = windowFor(r, askedDay)
    const day = dayLabel(lang, askedDay)
    const parts: string[] = []
    if (closedNotice) parts.push(closedNotice)
    if (win?.closed) {
      parts.push(t(lang, 'faq.hours.closedOn', { day }))
    } else if (win?.open && win?.close) {
      parts.push(t(lang, 'faq.hours.openOn', { day, open: formatClock(win.open), close: formatClock(win.close) }))
    } else if (hasKnownHours(r)) {
      parts.push(t(lang, 'faq.hours.noHoursFor', { day }))
    } else if (summary) {
      parts.push(summary)
    }
    if (notes) parts.push(notes)
    return parts.length ? parts.join(' ') : null
  }

  const yesterdayKey = DAY_KEYS[(dayIndex + 6) % 7]
  const todayWin = windowFor(r, todayKey)
  const yesterdayWin = windowFor(r, yesterdayKey)
  const todayName = dayLabel(lang, todayKey)
  const yesterdayName = dayLabel(lang, yesterdayKey)

  // Mirrors mapFilters' isOpenNow: a window that opened yesterday and crosses
  // midnight can still be the one covering "now".
  const openViaToday = coversMinute(todayWin, minutes, false)
  const openViaYesterday = !openViaToday && coversMinute(yesterdayWin, minutes, true)
  const openNow = (openViaToday || openViaYesterday) && r.availability_status !== 'closed'
  const spilloverLine = openViaYesterday && yesterdayWin?.open && yesterdayWin?.close
    ? t(lang, 'faq.hours.openedYesterday', { day: yesterdayName, open: formatClock(yesterdayWin.open), close: formatClock(yesterdayWin.close) })
      + (openNow ? t(lang, 'faq.hours.rightNowOpen') : t(lang, 'faq.hours.yesterdayClosedSuffix'))
    : null

  // "today"/"hoy" or a weekday name that happens to equal today were both
  // explicitly asking about the calendar day, so — like a different named
  // day — lead with today's OWN published window rather than a spillover
  // window from yesterday. Unlike a different day, live status still
  // applies, so it's appended rather than dropped: if last night's window is
  // what's actually keeping them open right now, say so as its own clause
  // instead of folding it into today's window (which, at 2am, it isn't).
  const namedToday = askedDay === todayKey

  const stillOpenFromLastNight = openViaYesterday && openNow && yesterdayWin?.close
    ? t(lang, 'faq.hours.stillOpenLastNight', { close: formatClock(yesterdayWin.close) })
    : null

  const parts: string[] = []
  if (namedToday && todayWin?.closed) {
    parts.push(t(lang, 'faq.hours.closedToday', { day: todayName }))
    if (stillOpenFromLastNight) parts.push(stillOpenFromLastNight)
  } else if (namedToday && todayWin?.open && todayWin?.close) {
    const todayLine = t(lang, 'faq.hours.todayWindow', { day: todayName, open: formatClock(todayWin.open), close: formatClock(todayWin.close) })
    if (openViaToday && openNow) {
      parts.push(`${todayLine}${t(lang, 'faq.hours.rightNowOpen')}`)
    } else if (stillOpenFromLastNight) {
      parts.push(`${todayLine}. ${stillOpenFromLastNight}`)
    } else {
      parts.push(`${todayLine}${t(lang, 'faq.hours.rightNowClosed')}`)
    }
  } else if (spilloverLine) {
    parts.push(spilloverLine)
  } else if (todayWin?.closed) {
    parts.push(t(lang, 'faq.hours.closedToday', { day: todayName }))
  } else if (todayWin?.open && todayWin?.close) {
    const todayLine = t(lang, 'faq.hours.todayWindow', { day: todayName, open: formatClock(todayWin.open), close: formatClock(todayWin.close) })
    parts.push(`${todayLine}${openNow ? t(lang, 'faq.hours.rightNowOpen') : t(lang, 'faq.hours.rightNowClosed')}`)
  } else if (hasKnownHours(r)) {
    if (closedNotice) parts.push(closedNotice)
    parts.push(t(lang, 'faq.hours.noHoursFor', { day: todayName }))
  } else if (summary) {
    if (closedNotice) parts.push(closedNotice)
    parts.push(summary)
  }
  if (notes) parts.push(notes)

  return parts.length ? parts.join(' ') : null
}

function distanceAnswer(r: Resource, ctx: FaqContext): string | null {
  const { lang } = ctx
  // A phone-intake/confidential-address resource's coordinates are often an
  // administrative office or mobile-service base, not a walk-in destination —
  // ResourceSheet suppresses Directions for the same reason, so a distance
  // figure here would be equally misleading.
  if (isConfidential(r)) {
    return t(lang, 'faq.distance.confidential', { contact: contactFragment(lang, r.phone) })
  }
  if (r.lat == null || r.lng == null) return null
  if (!ctx.origin) return t(lang, 'faq.distance.noOrigin')
  const km = distanceKm(ctx.origin, { lat: r.lat, lng: r.lng })
  return t(lang, 'faq.distance.result', { name: r.name, distance: formatDistance(km) })
}

function locationAnswer(r: Resource, ctx: FaqContext): string | null {
  const { lang } = ctx
  if (hidesAddress(r)) {
    return t(lang, 'faq.location.hidden', { contact: contactFragment(lang, r.phone) })
  }
  if (isConfidential(r)) {
    return t(lang, 'faq.location.noWalkInAddress', { contact: contactFragment(lang, r.phone) })
  }
  const addr = [r.address?.street, r.address?.city, r.address?.state, r.address?.zip].filter(Boolean).join(', ')
  return addr ? t(lang, 'faq.location.result', { address: addr }) : null
}

function contactAnswer(r: Resource, ctx: FaqContext): string | null {
  const { lang } = ctx
  const bits: string[] = []
  if (r.phone) bits.push(t(lang, 'faq.contact.callPhone', { phone: r.phone }))
  if (r.email) bits.push(t(lang, 'faq.contact.emailThem', { email: r.email }))
  if (r.website) bits.push(t(lang, 'faq.contact.visitWebsite', { website: r.website.replace(/^https?:\/\//, '') }))
  if (!bits.length) return null
  return t(lang, 'faq.contact.wrap', { bits: bits.join(` ${t(lang, 'faq.contact.or')} `) })
}

function aboutAnswer(r: Resource): string | null {
  // Provider-authored DB content — stays English-only like resource
  // descriptions elsewhere in the app (see i18n.ts's own scope comment).
  const d = r.description?.trim()
  return d ? d : null
}

function eligibilityAnswer(r: Resource, ctx: FaqContext): string | null {
  const { lang } = ctx
  const bits: string[] = []
  if (r.gender_policy && r.gender_policy !== 'unknown') {
    bits.push(GENDER_POLICY_LABEL[r.gender_policy] ?? r.gender_policy)
  }
  if (r.population_focus?.length) {
    const tags = r.population_focus.map((tag) => POPULATION_FOCUS_LABEL[tag] ?? tag).join(', ')
    bits.push(t(lang, 'faq.eligibility.serves', { tags }))
  }
  if (r.age_min != null) {
    const range = `${r.age_min}${r.age_max ? `–${r.age_max}` : '+'}`
    bits.push(t(lang, 'faq.eligibility.ages', { range }))
  }
  return bits.length ? bits.join('. ') + '.' : null
}

function intakeAnswer(r: Resource, ctx: FaqContext): string {
  const { lang } = ctx
  // "No walk-ins" shouldn't itself invent a phone call as the alternative —
  // some resources reject walk-ins but also don't require calling first
  // (access arranged through a website or another site instead), and saying
  // "call ahead" there would contradict the "no need to call first" bit below.
  const noWalkIns = r.phone_required_before_arrival
    ? t(lang, 'faq.intake.noWalkInsCallAhead')
    : t(lang, 'faq.intake.noWalkInsContact')
  const bits = [
    r.walk_ins_accepted ? t(lang, 'faq.intake.walkInsAccepted') : noWalkIns,
    r.requires_id ? t(lang, 'faq.intake.idRequired') : t(lang, 'faq.intake.noIdRequired'),
    r.requires_referral ? t(lang, 'faq.intake.referralRequired') : t(lang, 'faq.intake.noReferralRequired'),
    r.phone_required_before_arrival ? t(lang, 'faq.intake.callBeforeVisiting') : t(lang, 'faq.intake.noNeedToCallFirst'),
  ]
  return bits.join('; ') + '.'
}

function availabilityAnswer(r: Resource, ctx: FaqContext): string | null {
  const { lang } = ctx
  const statusKeys: Partial<Record<Resource['availability_status'], string>> = {
    available: 'faq.availability.available',
    limited: 'faq.availability.limited',
    full: 'faq.availability.full',
    closed: 'faq.availability.closed',
    unknown: 'faq.availability.unknown',
  }
  // A `closed`/`full`/`unknown` operational status can outlive a shelter's
  // last-known bed count (status and counts are saved independently in
  // ProviderListingEdit), so all three must be checked before falling back
  // to that count — a shelter marked unknown shouldn't still be told a
  // specific bed count as though it were confirmed current.
  if (r.availability_status === 'closed' || r.availability_status === 'full' || r.availability_status === 'unknown') {
    return t(lang, statusKeys[r.availability_status]!)
  }
  if (r.category === 'shelter' && r.beds_total != null) {
    if (r.beds_available != null) {
      return t(lang, 'faq.availability.bedsKnown', { available: String(r.beds_available), total: String(r.beds_total) })
    }
    // No current count, but availability_status (only 'available' or
    // 'limited' can reach here — closed/full/unknown already returned
    // above) is saved independently in ProviderListingEdit and may still
    // say something real, so don't discard it in favor of a bare "not
    // listed" — a listing marked available shouldn't read as unknown.
    const total = String(r.beds_total)
    return r.availability_status === 'limited'
      ? t(lang, 'faq.availability.limitedNoCount', { total })
      : t(lang, 'faq.availability.availableNoCount', { total })
  }
  const key = statusKeys[r.availability_status]
  return key ? t(lang, key) : null
}

function facilityAnswer(lang: Lang, condition: boolean, yesKey: string, noKey: string): string {
  return t(lang, condition ? yesKey : noKey)
}

function languagesAnswer(r: Resource, ctx: FaqContext): string | null {
  if (!r.languages_spoken?.length) return null
  return t(ctx.lang, 'faq.languages.spoken', { list: r.languages_spoken.join(', ') })
}

// ── Rules ─────────────────────────────────────────────────────────
//
// Every rule whose keyword pattern matches the question runs; a question
// can trigger several at once ("hours and address?"). Order controls the
// order answers are shown in, not which ones fire.

interface FaqRule {
  key: string
  labelKey: string
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
    labelKey: 'faq.label.hours',
    // hora\w* covers hora/horas/horario/horarios. The verb forms of "open"
    // (abre/abren/abrimos/abrir/abriendo) are listed explicitly rather than
    // as abr\w* — that also matched unrelated "abr"-prefixed words like
    // "abrigo(s)" (coat/coats), and even a narrower abr[i]\w* would still
    // collide with "abrigo" since "abri" is a shared prefix.
    // open(?!\s+to\b) excludes "open to volunteers"/"open to referrals" etc.
    // — that sense of "open" (receptive/accepting) has nothing to do with
    // hours, but "Are you open?" (no "to" following) still matches.
    // (?<!how )close[sd]? excludes "How close is this to me?" (proximity,
    // not hours) — that phrasing belongs to the distance rule instead.
    // "schedule" is ambiguous between the noun (hours) and verb (booking)
    // senses, and the verb sense takes too many determiners ("schedule
    // an/a/my/the/our appointment") to exclude by enumeration — a negative
    // lookahead for just "a"/"an" still let "schedule my/the X" through.
    // Flipped to a positive match instead: only "your/their/the schedule"
    // (asking about it as a noun) fires this rule.
    // Bare "late"/"tarde" fired on non-schedule uses ("Do you accept late
    // arrivals?", "¿Aceptan llegadas tarde?") — "tarde" is doubly ambiguous
    // since it also means "afternoon". Restricted to "how late"/"open late".
    keywords: /\b(hours?|open(?!\s+to\b)(s|ing)?|(?<!how )close[sd]?|closing|how late|open late|(your|their|the) schedule\b|hora\w*|abre|abren|abrimos|abrir|abriendo|abiert\w*|cierr\w*|cerrad\w*)\b/i,
    answer: hoursAnswer,
  },
  {
    key: 'availability',
    labelKey: 'faq.label.availability',
    // Bare "lugar" ("place") is too generic — it matches any question about
    // the place at all, not just availability ("¿Qué tipo de lugar es
    // este?"). Restricted to the actual availability phrasing ("hay lugar",
    // "lugar disponible", "queda lugar" — "is there room/space?").
    // (?<!parking )spots? excludes "parking spot(s)" — a question about
    // parking, not this shelter's own space availability.
    keywords: /\b(bed|beds|(?<!parking )spots?|room|vacan\w*|availab\w*|cama\w*|hay lugar|lugar disponible|queda\w* lugar|cupo\w*|disponib\w*)\b/i,
    answer: availabilityAnswer,
  },
  {
    key: 'distance',
    labelKey: 'faq.label.distance',
    // Bare "near"/"nearby"/"cerca" fired on questions about some other
    // nearby amenity ("Is there a pharmacy nearby?"), answering with this
    // listing's own distance instead. Restricted to phrasing that compares
    // the listing to the visitor ("near me", "cerca de mí").
    keywords: /\b(how far|how close|distance|miles?|near me|qué tan lejos|que tan lejos|distancia|millas?|cerca de m[ií])\b/i,
    answer: distanceAnswer,
  },
  {
    key: 'location',
    labelKey: 'faq.label.location',
    // Bare "where"/"dónde" fired on any where-question ("Where can I
    // park?"), not just ones about the listing's own location. Bare
    // "located" had the same problem the other way ("Are the showers
    // located downstairs?") — restricted to phrasing whose subject is the
    // listing itself.
    // ubicad\w* had the same problem as English "located" ("¿Las duchas
    // están ubicadas abajo?") — Spanish's dropped-subject grammar makes a
    // reliable positive restriction hard, so it's dropped in favor of
    // keywords that already require the listing as subject ("dónde
    // están...") or are unambiguous nouns ("ubicación").
    // Bare "address" fired on its verb sense ("Can you address dietary
    // restrictions?") — restricted to noun-phrase usage.
    keywords: /\b(where (is|are|do) (it|this|they|you)|where('?s)? (it|this|they) located|(you|it|they|this)( is| are)? located|(the|your|their|an?) address|location|directions|dónde (est[aá]n|est[aá]|queda|se encuentra)|direcci[oó]n|ubicaci[oó]n)\b/i,
    answer: locationAnswer,
  },
  {
    key: 'contact',
    labelKey: 'faq.label.contact',
    // Bare "number"/"número" fired on any other numeric question ("What
    // number of beds are available?") whenever the resource had contact
    // data — "phone" alone already covers real phone-number questions.
    // Bare "reach" fired on physical-route questions ("Can I reach this
    // shelter by bus?") — restricted to the contact sense ("reach them/you").
    keywords: /\b(phone|call|contact|reach (them|you)|email|website|tel[eé]fono|llamar|contacto|correo|sitio\s?web)\b/i,
    answer: contactAnswer,
  },
  {
    key: 'eligibility',
    labelKey: 'faq.label.eligibility',
    // Bare "allowed"/"permitido" fired on any permission question ("Is
    // parking allowed?"), not just eligibility ones — the concrete
    // population/gender/age terms already cover real eligibility questions.
    // famil\w* also matched "familiar"/"familiarized" (staff being familiar
    // with something, not a family), so family forms are listed explicitly.
    // Bare "who can" fired on unrelated questions with their own next verb
    // ("Who can I call about intake?") — restricted to service-access verbs.
    keywords: /\b(who can (stay|use|access|come|apply|get)|eligib\w*|qualify|men\b|women\b|famil(y|ies)|familias?|veteran\w*|lgbtq\w*|youth|senior\w*|age\b|ages\b|calificar|hombres|mujeres|j[oó]ven(es)?|edad\w*)\b/i,
    answer: eligibilityAnswer,
  },
  {
    key: 'intake',
    labelKey: 'faq.label.intake',
    // walk[\s-]?in\w* also matched "walking" ("walk" + "in" + "g" with the
    // separator matching zero-width) — restricted to the actual walk-in
    // forms, no trailing wildcard.
    keywords: /\b(id\b|identification|referral|walk[\s-]?ins?|appointment|call first|need to call|identificaci[oó]n|c[eé]dula|referencia|cita\w*|llamar antes)\b/i,
    answer: intakeAnswer,
  },
  {
    key: 'showers',
    labelKey: 'faq.label.showers',
    keywords: /\b(shower\w*|duchas?|regaderas?)\b/i,
    answer: (r, ctx) => facilityAnswer(ctx.lang, r.has_showers, 'faq.facility.showersYes', 'faq.facility.showersNo'),
  },
  {
    key: 'restrooms',
    labelKey: 'faq.label.restrooms',
    keywords: /\b(restroom\w*|bathroom\w*|toilet\w*|ba[ñn]os?|sanitarios?)\b/i,
    answer: (r, ctx) => facilityAnswer(ctx.lang, r.has_restrooms, 'faq.facility.restroomsYes', 'faq.facility.restroomsNo'),
  },
  {
    key: 'meals',
    labelKey: 'faq.label.meals',
    keywords: /\b(meal\w*|food|eat\w*|lunch|dinner|breakfast|comidas?|almuerzo|cena|desayuno|comer)\b/i,
    answer: (r, ctx) => facilityAnswer(ctx.lang, r.serves_meals, 'faq.facility.mealsYes', 'faq.facility.mealsNo'),
  },
  {
    key: 'laundry',
    labelKey: 'faq.label.laundry',
    keywords: /\b(laundry|lavander[ií]a)\b/i,
    answer: (r, ctx) => facilityAnswer(ctx.lang, r.has_laundry, 'faq.facility.laundryYes', 'faq.facility.laundryNo'),
  },
  {
    key: 'pets',
    labelKey: 'faq.label.pets',
    // Whole words only — pet\w*/dog\w*/cat\w* also matched "petition",
    // "dogma", "catering", "category".
    keywords: /\b(pet|pets|dog|dogs|cat|cats|mascotas?|perros?|gatos?)\b/i,
    answer: (r, ctx) => facilityAnswer(ctx.lang, r.pet_friendly, 'faq.facility.petsYes', 'faq.facility.petsNo'),
  },
  {
    key: 'accessibility',
    labelKey: 'faq.label.accessibility',
    keywords: /\b(wheelchair\w*|accessib\w*|silla de ruedas|accesib\w*)\b/i,
    answer: (r, ctx) => facilityAnswer(ctx.lang, r.wheelchair_accessible, 'faq.facility.accessibilityYes', 'faq.facility.accessibilityNo'),
  },
  {
    key: 'transit',
    labelKey: 'faq.label.transit',
    // "bus" as a whole word, not a prefix — bus\w* also matched "business".
    // Bare "transportation"/"transporte" fired on a service-offering
    // question ("Do you provide transportation?") that this field (public
    // transit *proximity*, not rides the org offers) can't actually answer.
    keywords: /\b(bus|buses|bus stop|bus route|transit|public transportation|autob[uú]s\w*|transporte p[uú]blico)\b/i,
    answer: (r, ctx) => facilityAnswer(ctx.lang, r.public_transit_accessible, 'faq.facility.transitYes', 'faq.facility.transitNo'),
  },
  {
    key: 'languages',
    labelKey: 'faq.label.languages',
    // speak(?!\s+(to|with)\b) excludes "Can I speak to/with a counselor?"
    // (wanting human contact) while "Do you speak Spanish?" still matches.
    keywords: /\blanguages?\b|\bspeak(?!\s+(to|with)\b)\w*\b|\bidiomas?\b|\bhablan?\b/i,
    answer: languagesAnswer,
  },
  {
    key: 'about',
    labelKey: 'faq.label.about',
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
    if (answer) out.push({ key: rule.key, label: translate(ctx.lang, rule.labelKey), answer })
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
