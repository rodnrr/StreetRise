// ============================================================
// StreetRise — housing eligibility, rendered honestly
// ============================================================
//
// Used on the map's resource sheet and on /resources/:id. Renders nothing at
// all for a non-housing resource, so it can sit unconditionally in both.
//
// The whole point of this component is the three-way distinction. A "yes", a
// "no" and a "nobody told us" must never look alike: someone scanning this on
// a phone, deciding whether to spend a bus fare, will read a grey dash as a
// no. So unknown gets its own colour, its own icon, and a sentence with an
// instruction in it.

import { Check, HelpCircle, Minus, AlertTriangle, Clock } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import {
  answerFor,
  RECORD_QUESTIONS,
  RULE_QUESTIONS,
  formatCostRange,
  formatMoney,
  waitlistAgeDays,
  waitlistIsStale,
  WAITLIST_LABEL_KEY,
} from '@/lib/housing'
import type { Resource, ResourceHousingDetails } from '@/types'

function TriRow({ value, yes, no }: { value: boolean | null; yes: string; no: string }) {
  const { t } = useI18n()
  const a = answerFor(value, { yes, no })
  const style = {
    yes: { Icon: Check, cls: 'text-green-700 dark:text-green-400' },
    no: { Icon: Minus, cls: 'text-slate-600 dark:text-slate-400' },
    unknown: { Icon: HelpCircle, cls: 'text-amber-700 dark:text-amber-400' },
  }[a.value]
  const { Icon, cls } = style

  return (
    <li className="flex items-start gap-2 py-1">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} aria-hidden="true" />
      <span className={`text-base ${a.value === 'unknown' ? cls : 'text-slate-800 dark:text-slate-200'}`}>
        {t(a.labelKey)}
      </span>
    </li>
  )
}

/**
 * Waitlist state, always with its check date.
 *
 * An "open" nobody has confirmed for months is not evidence that a waitlist is
 * open today, so a stale one is downgraded in the copy rather than repeated as
 * fact. This is the same instinct as the map's "Open right now" filter: a
 * positive claim has to be supportable.
 */
function Waitlist({ details }: { details: ResourceHousingDetails }) {
  const { t } = useI18n()
  if (!details.waitlist_status) return null

  const age = waitlistAgeDays(details.waitlist_last_checked_at)
  const stale = waitlistIsStale(details.waitlist_last_checked_at)
  const open = details.waitlist_status === 'open'

  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg p-3 ${
        stale
          ? 'bg-amber-50 dark:bg-amber-500/10'
          : open
            ? 'bg-green-50 dark:bg-green-500/10'
            : 'bg-slate-100 dark:bg-slate-800'
      }`}
    >
      {stale
        ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
        : <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" aria-hidden="true" />}
      <p className="text-base text-slate-800 dark:text-slate-200">
        <strong className="font-semibold">{t(WAITLIST_LABEL_KEY[details.waitlist_status])}</strong>
        {' '}
        {age === null
          ? t('housing.waitlist.neverChecked')
          : stale
            ? t('housing.waitlist.staleNote').replace('{days}', String(age))
            : t('housing.waitlist.checkedNote').replace('{days}', String(age))}
      </p>
    </div>
  )
}

export default function HousingEligibility({
  resource,
  compact = false,
}: {
  resource: Resource
  compact?: boolean
}) {
  const { t } = useI18n()
  if (resource.category !== 'housing') return null

  const h = resource.housing
  // A housing listing with no detail row is not an error — it means nobody has
  // filled the housing fields in yet. Say so, rather than rendering an empty
  // box that reads as "no restrictions".
  if (!h) {
    return (
      <section className="mt-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('housing.eligibility.heading')}
        </h3>
        <p className="mt-1 text-base text-amber-700 dark:text-amber-400">
          {t('housing.eligibility.none')}
        </p>
      </section>
    )
  }

  const cost = formatCostRange(h.minimum_monthly_cost_cents, h.maximum_monthly_cost_cents)
  const deposit = formatMoney(h.deposit_cents)

  return (
    <section className="mt-4">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
        {t('housing.eligibility.heading')}
      </h3>

      <ul className="mt-1">
        {RECORD_QUESTIONS.map((q) => (
          <TriRow key={q.field} value={h[q.field]} yes={q.yes} no={q.no} />
        ))}
      </ul>

      {!compact && (
        <>
          <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
            {t('housing.rules.heading')}
          </h3>
          <ul className="mt-1">
            {RULE_QUESTIONS.map((q) => (
              <TriRow key={q.field} value={h[q.field]} yes={q.yes} no={q.no} />
            ))}
          </ul>
        </>
      )}

      {(cost || deposit) && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-base">
          {cost && (
            <div>
              <dt className="text-slate-600 dark:text-slate-400">{t('housing.cost.monthly')}</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{cost}</dd>
            </div>
          )}
          {deposit && (
            <div>
              <dt className="text-slate-600 dark:text-slate-400">{t('housing.cost.deposit')}</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{deposit}</dd>
            </div>
          )}
        </dl>
      )}

      <Waitlist details={h} />

      {!compact && h.eligibility_notes && (
        <p className="mt-3 text-base text-slate-700 dark:text-slate-300">{h.eligibility_notes}</p>
      )}
    </section>
  )
}
