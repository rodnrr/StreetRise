// ============================================================
// StreetRise — shared pieces of the housing directory UI
// ============================================================
//
// Small components rather than one big card, because the state page and
// the organization page show the same facts at different densities and
// the rules about HOW those facts are shown must not diverge between
// them.
//
// Body text is 16px minimum throughout (text-base and up, never
// text-xs/text-sm for content the reader has to act on) — this
// directory is read on old phones by people making a decision about
// where to sleep.

import { Link } from 'react-router-dom'
import { AlertTriangle, Check, HelpCircle, Minus, Phone, Globe, ShieldAlert } from 'lucide-react'
import {
  answerFor,
  freshnessFor,
  formatMoney,
  formatStay,
  formatAddress,
  RECORD_QUESTIONS,
  RULE_QUESTIONS,
  HOUSING_TYPE_LABELS,
  GENDER_LABELS,
} from '@/lib/housing'
import type { HousingProgram, HousingLocation, HousingOrganization } from '@/types'

// ------------------------------------------------------------
// One tri-state fact
// ------------------------------------------------------------

/**
 * Three visually distinct states. The unknown case is amber and carries
 * its own icon so it cannot be skimmed as a "no" — the whole point of
 * the nullable booleans is lost if yes/no/unknown look alike.
 */
export function TriFact({
  question,
  value,
  yes,
  no,
}: {
  question: string
  value: boolean | null
  yes: string
  no: string
}) {
  const answer = answerFor(value, { yes, no })

  const style = {
    yes:     { icon: Check,      cls: 'text-green-700 dark:text-green-400' },
    no:      { icon: Minus,      cls: 'text-slate-600 dark:text-slate-400' },
    unknown: { icon: HelpCircle, cls: 'text-amber-700 dark:text-amber-400' },
  }[answer.value]

  const Icon = style.icon

  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.cls}`} aria-hidden="true" />
      <p className="text-base text-slate-800 dark:text-slate-200">
        <span className="sr-only">{question}: </span>
        <span className={answer.value === 'unknown' ? style.cls : undefined}>{answer.label}</span>
      </p>
    </div>
  )
}

// ------------------------------------------------------------
// Freshness
// ------------------------------------------------------------

/**
 * A stale or never-checked listing keeps its place in the list and
 * wears a warning. It is never hidden: an old listing is still the best
 * lead somebody has, and quietly removing it reads as "there is nothing
 * in your city".
 */
export function FreshnessNote({ lastVerifiedAt }: { lastVerifiedAt: string | null }) {
  const f = freshnessFor(lastVerifiedAt)

  if (!f.isStale) {
    return (
      <p className="text-base text-slate-600 dark:text-slate-400">
        {f.label} by StreetRise.
      </p>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-500/10">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
      <p className="text-base text-amber-900 dark:text-amber-200">
        <strong className="font-semibold">{f.label}.</strong>{' '}
        {f.neverVerified
          ? 'We have not called this program to check these details. Call before you go.'
          : 'These details may have changed. Call before you go.'}
      </p>
    </div>
  )
}

// ------------------------------------------------------------
// Scam warning — required on every listing page
// ------------------------------------------------------------

export function ScamWarningLink({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 ${className ?? ''}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Before you pay anyone
          </h2>
          <p className="mt-1 text-base text-slate-700 dark:text-slate-300">
            People with records are targeted by fake housing listings. No real program asks for a
            deposit by gift card, cash app, or wire transfer.
          </p>
          <Link
            to="/housing/scams"
            className="mt-2 inline-block text-base font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
          >
            How to spot a fake listing
          </Link>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Contact block
// ------------------------------------------------------------

/**
 * `tel:` on the phone number: on the phone this is read on, the number
 * being tappable is the difference between a call made and a number
 * copied down wrong.
 */
export function ContactLines({
  phone,
  website,
  applicationUrl,
}: {
  phone?: string | null
  website?: string | null
  applicationUrl?: string | null
}) {
  if (!phone && !website && !applicationUrl) return null

  return (
    <ul className="mt-3 space-y-2">
      {phone && (
        <li className="flex items-center gap-2">
          <Phone className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
            className="text-base font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
          >
            {phone}
          </a>
        </li>
      )}
      {website && (
        <li className="flex items-center gap-2">
          <Globe className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all text-base text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
          >
            {website.replace(/^https?:\/\//, '')}
          </a>
        </li>
      )}
      {applicationUrl && applicationUrl !== website && (
        <li className="flex items-center gap-2">
          <Globe className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <a
            href={applicationUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-base font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
          >
            Apply online
          </a>
        </li>
      )}
    </ul>
  )
}

// ------------------------------------------------------------
// Program card
// ------------------------------------------------------------

export function ProgramCard({
  program,
  organization,
  locations,
  showOrgLink = true,
}: {
  program: HousingProgram
  organization: HousingOrganization
  locations: HousingLocation[]
  showOrgLink?: boolean
}) {
  const address =
    formatAddress(locations.find((l) => l.is_primary)) ?? formatAddress(locations[0])

  const cost = formatMoney(program.monthly_cost_cents)
  const deposit = formatMoney(program.deposit_cents)
  const stay = formatStay(program.max_stay_days)

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{program.name}</h3>
        <p className="mt-1 text-base text-slate-700 dark:text-slate-300">
          {showOrgLink ? (
            <Link
              to={`/housing/org/${organization.slug}`}
              className="font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
            >
              {organization.name}
            </Link>
          ) : (
            <span className="font-semibold">{organization.name}</span>
          )}
        </p>
        {address && (
          <p className="mt-1 text-base text-slate-600 dark:text-slate-400">{address}</p>
        )}
      </header>

      <p className="mt-3 text-base font-medium text-slate-800 dark:text-slate-200">
        {HOUSING_TYPE_LABELS[program.housing_type]}
        {program.gender_served && ` · ${GENDER_LABELS[program.gender_served]}`}
      </p>

      {(cost || deposit || stay || program.beds_total !== null) && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-base">
          {cost && (
            <div>
              <dt className="text-slate-600 dark:text-slate-400">Monthly cost</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{cost}</dd>
            </div>
          )}
          {deposit && (
            <div>
              <dt className="text-slate-600 dark:text-slate-400">Deposit</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{deposit}</dd>
            </div>
          )}
          {stay && (
            <div>
              <dt className="text-slate-600 dark:text-slate-400">Length of stay</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{stay}</dd>
            </div>
          )}
          {program.beds_total !== null && (
            <div>
              <dt className="text-slate-600 dark:text-slate-400">Beds</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{program.beds_total}</dd>
            </div>
          )}
        </dl>
      )}

      <section className="mt-4">
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          Who they will consider
        </h4>
        <div className="mt-1">
          {RECORD_QUESTIONS.map((q) => (
            <TriFact
              key={q.key}
              question={q.question}
              value={program[q.key]}
              yes={q.yes}
              no={q.no}
            />
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">House rules</h4>
        <div className="mt-1">
          {RULE_QUESTIONS.map((q) => (
            <TriFact
              key={q.key}
              question={q.question}
              value={program[q.key]}
              yes={q.yes}
              no={q.no}
            />
          ))}
        </div>
      </section>

      {program.notes && (
        <p className="mt-4 text-base text-slate-700 dark:text-slate-300">{program.notes}</p>
      )}

      <ContactLines
        phone={program.intake_phone ?? organization.phone}
        website={organization.website}
        applicationUrl={program.application_url}
      />

      <footer className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
        <FreshnessNote lastVerifiedAt={program.last_verified_at} />
      </footer>
    </article>
  )
}
