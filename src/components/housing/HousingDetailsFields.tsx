// ============================================================
// Housing details editor — used by BOTH admin and provider
// ============================================================
//
// There is no housing portal. A provider maintains housing details on the
// listing they already own, in the editor they already use; an admin does the
// same in theirs. This component is the shared section both pages mount when
// the listing's category is `housing`.
//
// It owns its own load and save rather than joining the parent form's state.
// That is deliberate: housing details live in a separate table with their own
// RLS, and saving them is a distinct write. It also means neither parent form
// had to be restructured to accommodate a second table.
//
// ── The default that matters ────────────────────────────────────
// Every tri-state select opens on "Not stated", and "Not stated" is the FIRST
// option. A hurried entry therefore leaves a field unknown — which renders as
// "call to ask" — rather than recording a confident "no" that turns somebody
// away at an intake desk over a question nobody asked.

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import type { ResourceHousingDetails, WaitlistStatus } from '@/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const table = () => (supabase as any).from('resource_housing_details')
/* eslint-enable @typescript-eslint/no-explicit-any */

type TriField =
  | 'accepts_felony' | 'accepts_violent_offense' | 'accepts_sex_offense'
  | 'accepts_vouchers' | 'requires_sobriety' | 'has_curfew'
  | 'income_restricted' | 'is_subsidized' | 'is_public_housing'

const RECORD_FIELDS: { field: TriField; label: string }[] = [
  { field: 'accepts_felony',          label: 'Considers felony records' },
  { field: 'accepts_violent_offense', label: 'Considers violent offense records' },
  { field: 'accepts_sex_offense',     label: 'Considers sex offense records' },
]

const RULE_FIELDS: { field: TriField; label: string }[] = [
  { field: 'accepts_vouchers',  label: 'Accepts Section 8 / Housing Choice Vouchers' },
  { field: 'requires_sobriety', label: 'Sobriety required' },
  { field: 'has_curfew',        label: 'Has a curfew' },
]

const PROGRAMME_FIELDS: { field: TriField; label: string }[] = [
  { field: 'income_restricted', label: 'Income restricted' },
  { field: 'is_subsidized',     label: 'Subsidized' },
  { field: 'is_public_housing', label: 'Public housing' },
]

type FormState = {
  [K in TriField]: boolean | null
} & {
  minimum_monthly_cost_cents: number | null
  maximum_monthly_cost_cents: number | null
  deposit_cents: number | null
  max_stay_days: number | null
  application_url: string
  intake_phone: string
  eligibility_notes: string
  waitlist_status: WaitlistStatus | ''
  waitlist_last_checked_at: string | null
}

const BLANK: FormState = {
  accepts_felony: null, accepts_violent_offense: null, accepts_sex_offense: null,
  accepts_vouchers: null, requires_sobriety: null, has_curfew: null,
  income_restricted: null, is_subsidized: null, is_public_housing: null,
  minimum_monthly_cost_cents: null, maximum_monthly_cost_cents: null,
  deposit_cents: null, max_stay_days: null,
  application_url: '', intake_phone: '', eligibility_notes: '',
  waitlist_status: '', waitlist_last_checked_at: null,
}

function TriSelect({
  id, label, value, onChange, dark,
}: {
  id: string; label: string; value: boolean | null
  onChange: (v: boolean | null) => void; dark?: boolean
}) {
  const str = value === null || value === undefined ? '' : value ? 'yes' : 'no'
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select
        id={id}
        className={dark ? 'input bg-gray-700 border-gray-600 text-white' : 'input'}
        value={str}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'yes')}
      >
        {/* First and default. See the header note. */}
        <option value="">Not stated — shows as “call to ask”</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  )
}

function dollarsToCents(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const n = Number(t.replace(/[$,]/g, ''))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}
const centsToDollars = (c: number | null) => (c === null || c === undefined ? '' : String(c / 100))
function intOrNull(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const n = parseInt(t, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function HousingDetailsFields({
  resourceId,
  category,
  dark = false,
}: {
  resourceId: string | undefined
  category: string | undefined
  dark?: boolean
}) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(BLANK)
  /**
   * Explicit "I checked the waitlist again today" flag.
   *
   * The save below only stamps waitlist_last_checked_at when the STATUS
   * changes, which is deliberate — editing the rent must not silently claim
   * the waitlist was re-verified. But that alone made the freshness one-way:
   * a waitlist that stays open and gets confirmed as still open never got its
   * date refreshed, so after WAITLIST_TRUST_DAYS it dropped out of the
   * "waitlist open" search with no way to put it back. This is the missing
   * affirmative act — a human saying the unchanged answer is still true.
   */
  const [reconfirmWaitlist, setReconfirmWaitlist] = useState(false)

  const enabled = category === 'housing' && !!resourceId

  const { data, isLoading, isError, isSuccess, refetch } = useQuery({
    queryKey: ['housing-details', resourceId],
    queryFn: async () => {
      const { data, error } = await table().select('*').eq('resource_id', resourceId).maybeSingle()
      if (error) throw error
      return (data ?? null) as ResourceHousingDetails | null
    },
    enabled,
  })

  // Reset whenever the query resolves, INCLUDING when it resolves to no row.
  //
  // Returning early on a null left the previous resource's values in the form.
  // With the editor mounted across a route change from one listing to another,
  // navigating to a housing listing that has no details row yet would show —
  // and, since the query reports success and re-enables Save, let somebody
  // save — the FIRST listing's eligibility, costs and waitlist onto the
  // second. `resourceId` is in the dependency list for the same reason: the
  // clear has to happen on the switch, not only when new data lands.
  useEffect(() => {
    if (!data) {
      setForm(BLANK)
      setReconfirmWaitlist(false)
      return
    }
    setForm({
      accepts_felony: data.accepts_felony,
      accepts_violent_offense: data.accepts_violent_offense,
      accepts_sex_offense: data.accepts_sex_offense,
      accepts_vouchers: data.accepts_vouchers,
      requires_sobriety: data.requires_sobriety,
      has_curfew: data.has_curfew,
      income_restricted: data.income_restricted,
      is_subsidized: data.is_subsidized,
      is_public_housing: data.is_public_housing,
      minimum_monthly_cost_cents: data.minimum_monthly_cost_cents,
      maximum_monthly_cost_cents: data.maximum_monthly_cost_cents,
      deposit_cents: data.deposit_cents,
      max_stay_days: data.max_stay_days,
      application_url: data.application_url ?? '',
      intake_phone: data.intake_phone ?? '',
      eligibility_notes: data.eligibility_notes ?? '',
      waitlist_status: data.waitlist_status ?? '',
      waitlist_last_checked_at: data.waitlist_last_checked_at,
    })
  }, [data, resourceId])

  const save = useMutation({
    mutationFn: async () => {
      const previous = data?.waitlist_status ?? null
      const next = form.waitlist_status || null
      // Stamp the check date whenever the waitlist is touched. The status is
      // never shown without it, so a status saved with no date would render as
      // "we have not checked this" — which would be true, and useless.
      const checkedAt =
        next !== null && (next !== previous || reconfirmWaitlist)
          ? new Date().toISOString()
          : form.waitlist_last_checked_at

      const { error } = await table().upsert({
        resource_id: resourceId,
        ...form,
        waitlist_status: next,
        waitlist_last_checked_at: checkedAt,
        application_url: form.application_url.trim() || null,
        intake_phone: form.intake_phone.trim() || null,
        eligibility_notes: form.eligibility_notes.trim() || null,
        housing_details_last_checked_at: new Date().toISOString(),
      }, { onConflict: 'resource_id' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['housing-details', resourceId] })
      setReconfirmWaitlist(false)
      toast.success('Housing details saved')
    },
    onError: (e: Error) => toast.error('Could not save housing details', e.message),
  })

  if (category !== 'housing') return null

  if (!resourceId) {
    return (
      <section className="card mt-6">
        <h2 className="text-lg font-bold">Housing details</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Save the listing first, then add its housing details.
        </p>
      </section>
    )
  }

  const inputCls = dark ? 'input bg-gray-700 border-gray-600 text-white' : 'input'

  return (
    <section className="card mt-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold">Housing details</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Leave anything you are unsure about as <strong>Not stated</strong>. It shows
          publicly as “call to ask”, which is true — a wrong “no” turns someone away at
          the door.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="label">Criminal record</legend>
        {RECORD_FIELDS.map((f) => (
          <TriSelect
            key={f.field} id={`h-${f.field}`} label={f.label} dark={dark}
            value={form[f.field]}
            onChange={(v) => setForm({ ...form, [f.field]: v })}
          />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="label">Vouchers and house rules</legend>
        {RULE_FIELDS.map((f) => (
          <TriSelect
            key={f.field} id={`h-${f.field}`} label={f.label} dark={dark}
            value={form[f.field]}
            onChange={(v) => setForm({ ...form, [f.field]: v })}
          />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="label">Programme type</legend>
        {PROGRAMME_FIELDS.map((f) => (
          <TriSelect
            key={f.field} id={`h-${f.field}`} label={f.label} dark={dark}
            value={form[f.field]}
            onChange={(v) => setForm({ ...form, [f.field]: v })}
          />
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="h-min" className="label">Lowest monthly cost ($)</label>
          <input id="h-min" className={inputCls} inputMode="decimal"
            value={centsToDollars(form.minimum_monthly_cost_cents)}
            onChange={(e) => setForm({ ...form, minimum_monthly_cost_cents: dollarsToCents(e.target.value) })} />
        </div>
        <div>
          <label htmlFor="h-max" className="label">Highest monthly cost ($)</label>
          <input id="h-max" className={inputCls} inputMode="decimal"
            value={centsToDollars(form.maximum_monthly_cost_cents)}
            onChange={(e) => setForm({ ...form, maximum_monthly_cost_cents: dollarsToCents(e.target.value) })} />
        </div>
        <div>
          <label htmlFor="h-dep" className="label">Deposit ($)</label>
          <input id="h-dep" className={inputCls} inputMode="decimal"
            value={centsToDollars(form.deposit_cents)}
            onChange={(e) => setForm({ ...form, deposit_cents: dollarsToCents(e.target.value) })} />
        </div>
        <div>
          <label htmlFor="h-stay" className="label">Max stay (days)</label>
          <input id="h-stay" className={inputCls} inputMode="numeric"
            value={form.max_stay_days ?? ''}
            onChange={(e) => setForm({ ...form, max_stay_days: intOrNull(e.target.value) })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="h-waitlist" className="label">Waitlist</label>
          <select id="h-waitlist" className={inputCls} value={form.waitlist_status}
            onChange={(e) => setForm({ ...form, waitlist_status: e.target.value as WaitlistStatus | '' })}>
            <option value="">Not applicable</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="temporarily_closed">Temporarily closed</option>
            <option value="unknown">Unknown</option>
          </select>
          {form.waitlist_last_checked_at && (
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Last checked {new Date(form.waitlist_last_checked_at).toLocaleDateString('en-US')}
            </p>
          )}
          {/* Re-verification without a status change. Saving the form does not
              refresh this date on its own, so that editing the rent cannot
              masquerade as a waitlist check. */}
          {form.waitlist_status && form.waitlist_last_checked_at && (
            reconfirmWaitlist ? (
              <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">
                Will be marked checked today when you save.
              </p>
            ) : (
              <button
                type="button"
                className="btn-secondary btn-sm mt-2"
                onClick={() => setReconfirmWaitlist(true)}
              >
                I checked this again today
              </button>
            )
          )}
        </div>
        <div>
          <label htmlFor="h-phone" className="label">Intake phone</label>
          <input id="h-phone" className={inputCls} type="tel" value={form.intake_phone}
            onChange={(e) => setForm({ ...form, intake_phone: e.target.value })} />
        </div>
      </div>

      <div>
        <label htmlFor="h-url" className="label">Application URL</label>
        <input id="h-url" className={inputCls} type="url" placeholder="https://"
          value={form.application_url}
          onChange={(e) => setForm({ ...form, application_url: e.target.value })} />
      </div>

      <div>
        <label htmlFor="h-notes" className="label">Eligibility notes</label>
        <textarea id="h-notes" className={inputCls} rows={3} value={form.eligibility_notes}
          onChange={(e) => setForm({ ...form, eligibility_notes: e.target.value })} />
      </div>

      {/* Saving requires a SUCCESSFUL read first — not merely "not loading".
          `form` starts as BLANK and is only populated from the query result, so
          a save that lands before it would upsert nulls over every eligibility,
          cost and waitlist value already recorded, silently converting a
          filled-in listing back to "not stated".
          Gating on isLoading alone was not enough: a failed read also leaves
          isLoading false with the form still blank, so a transient network
          error would have re-armed exactly the same data loss. */}
      {isError && (
        <div role="alert" className="rounded-lg bg-amber-50 p-3 dark:bg-amber-500/10">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            We could not load the existing housing details, so saving is disabled — otherwise
            this form would overwrite them with blanks.
          </p>
          <button type="button" className="btn-secondary btn-sm mt-2" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}

      <button
        type="button"
        className="btn-primary inline-flex items-center gap-2"
        onClick={() => save.mutate()}
        disabled={save.isPending || !isSuccess}
      >
        <Save className="h-4 w-4" aria-hidden="true" />
        {isLoading ? 'Loading…' : save.isPending ? 'Saving…' : 'Save housing details'}
      </button>
    </section>
  )
}
