// ============================================================
// /admin/housing/:id — organization, locations, programs
// ============================================================
//
// One page for the whole organization rather than three nested routes:
// entering a listing is a single sitting — you are on the phone with
// the program, and the address, the rent, and the record questions all
// arrive in the same conversation.
//
// The tri-state selects default to "Not stated". That default is the
// entire safety property of this form: a hurried entry leaves a field
// unknown, which renders as "call to ask", rather than leaving it a
// confident "no" that turns somebody away at the door.

import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, PhoneCall, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast, useAuthStore } from '@/lib/store'
import { ORG_TYPE_LABELS, HOUSING_TYPE_LABELS, GENDER_LABELS, freshnessFor } from '@/lib/housing'
import type {
  HousingOrganization, HousingLocation, HousingProgram,
  HousingOrgType, HousingType, HousingGenderServed,
  HousingVerificationMethod, HousingVerificationOutcome,
} from '@/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = {
  orgs:          () => (supabase as any).from('housing_organizations'),
  locations:     () => (supabase as any).from('housing_locations'),
  programs:      () => (supabase as any).from('housing_programs'),
  verifications: () => (supabase as any).from('housing_verifications'),
  states:        () => (supabase as any).from('housing_states'),
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ------------------------------------------------------------
// Tri-state control
// ------------------------------------------------------------

/**
 * `null` is a first-class option and it is the default. It is listed
 * first so the safe answer is the one your thumb lands on.
 */
function TriSelect({
  id, label, value, onChange,
}: {
  id: string
  label: string
  value: boolean | null
  onChange: (v: boolean | null) => void
}) {
  const asString = value === null || value === undefined ? '' : value ? 'yes' : 'no'
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select
        id={id}
        className="input"
        value={asString}
        onChange={(e) =>
          onChange(e.target.value === '' ? null : e.target.value === 'yes')
        }
      >
        <option value="">Not stated (shows as “call to ask”)</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  )
}

/** Dollars in the box, cents in the column. Empty stays null, not 0. */
function dollarsToCents(v: string): number | null {
  const trimmed = v.trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(/[$,]/g, ''))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}
function centsToDollars(c: number | null): string {
  return c === null || c === undefined ? '' : String(c / 100)
}
function intOrNull(v: string): number | null {
  const trimmed = v.trim()
  if (!trimmed) return null
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const BLANK_PROGRAM = {
  name: '',
  housing_type: 'transitional' as HousingType,
  gender_served: null as HousingGenderServed | null,
  accepts_felony: null as boolean | null,
  accepts_violent_offense: null as boolean | null,
  accepts_sex_offense: null as boolean | null,
  accepts_vouchers: null as boolean | null,
  requires_sobriety: null as boolean | null,
  has_curfew: null as boolean | null,
  monthly_cost_cents: null as number | null,
  deposit_cents: null as number | null,
  max_stay_days: null as number | null,
  beds_total: null as number | null,
  application_url: '',
  intake_phone: '',
  notes: '',
  is_published: false,
}

export default function AdminHousingEdit() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { userEmail } = useAuthStore()

  // ── Organization form ──
  const [org, setOrg] = useState({
    slug: '', name: '', org_type: 'transitional_housing' as HousingOrgType,
    website: '', phone: '', email: '', description: '', is_published: false,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-housing-org', id],
    queryFn: async () => {
      const { data, error } = await T.orgs()
        .select(`*, locations:housing_locations ( * ), programs:housing_programs ( * )`)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as (HousingOrganization & {
        locations: HousingLocation[]
        programs: HousingProgram[]
      }) | null
    },
    enabled: !isNew && !!id,
  })

  const { data: states } = useQuery({
    queryKey: ['housing-states-admin'],
    queryFn: async () => {
      const { data, error } = await T.states().select('code, name').order('name')
      if (error) throw error
      return (data ?? []) as { code: string; name: string }[]
    },
    staleTime: 1000 * 60 * 60,
  })

  useEffect(() => {
    if (!data) return
    setOrg({
      slug: data.slug, name: data.name, org_type: data.org_type,
      website: data.website ?? '', phone: data.phone ?? '', email: data.email ?? '',
      description: data.description ?? '', is_published: data.is_published,
    })
  }, [data])

  const saveOrg = useMutation({
    mutationFn: async () => {
      const payload = {
        slug: org.slug.trim(),
        name: org.name.trim(),
        org_type: org.org_type,
        website: org.website.trim() || null,
        phone: org.phone.trim() || null,
        email: org.email.trim() || null,
        description: org.description.trim() || null,
        is_published: org.is_published,
      }
      if (isNew) {
        const { data, error } = await T.orgs().insert(payload).select('id').single()
        if (error) throw error
        return data.id as string
      }
      const { error } = await T.orgs().update(payload).eq('id', id)
      if (error) throw error
      return id as string
    },
    onSuccess: (newId) => {
      qc.invalidateQueries({ queryKey: ['admin-housing-orgs'] })
      qc.invalidateQueries({ queryKey: ['admin-housing-org', id] })
      toast.success('Saved')
      if (isNew) navigate(`/admin/housing/${newId}`, { replace: true })
    },
    onError: (e: Error) => toast.error('Could not save', e.message),
  })

  // ── Locations ──
  const [newLoc, setNewLoc] = useState({
    address_line1: '', address_line2: '', city: '', state_code: '', postal_code: '', is_primary: false,
  })

  const addLocation = useMutation({
    mutationFn: async () => {
      const { error } = await T.locations().insert({
        organization_id: id,
        address_line1: newLoc.address_line1.trim() || null,
        address_line2: newLoc.address_line2.trim() || null,
        city: newLoc.city.trim() || null,
        state_code: newLoc.state_code || null,
        postal_code: newLoc.postal_code.trim() || null,
        is_primary: newLoc.is_primary,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-housing-org', id] })
      setNewLoc({ address_line1: '', address_line2: '', city: '', state_code: '', postal_code: '', is_primary: false })
      toast.success('Location added')
    },
    onError: (e: Error) => toast.error('Could not add location', e.message),
  })

  const deleteLocation = useMutation({
    mutationFn: async (locId: string) => {
      const { error } = await T.locations().delete().eq('id', locId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-housing-org', id] })
      toast.success('Location removed')
    },
    onError: (e: Error) => toast.error('Could not remove location', e.message),
  })

  // ── Programs ──
  const [editing, setEditing] = useState<(typeof BLANK_PROGRAM) & { id?: string } | null>(null)

  const saveProgram = useMutation({
    mutationFn: async () => {
      if (!editing) return
      const payload = {
        organization_id: id,
        name: editing.name.trim(),
        housing_type: editing.housing_type,
        gender_served: editing.gender_served,
        accepts_felony: editing.accepts_felony,
        accepts_violent_offense: editing.accepts_violent_offense,
        accepts_sex_offense: editing.accepts_sex_offense,
        accepts_vouchers: editing.accepts_vouchers,
        requires_sobriety: editing.requires_sobriety,
        has_curfew: editing.has_curfew,
        monthly_cost_cents: editing.monthly_cost_cents,
        deposit_cents: editing.deposit_cents,
        max_stay_days: editing.max_stay_days,
        beds_total: editing.beds_total,
        application_url: editing.application_url.trim() || null,
        intake_phone: editing.intake_phone.trim() || null,
        notes: editing.notes.trim() || null,
        is_published: editing.is_published,
      }
      if (editing.id) {
        const { error } = await T.programs().update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await T.programs().insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-housing-org', id] })
      setEditing(null)
      toast.success('Program saved')
    },
    onError: (e: Error) => toast.error('Could not save program', e.message),
  })

  const deleteProgram = useMutation({
    mutationFn: async (pid: string) => {
      const { error } = await T.programs().delete().eq('id', pid)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-housing-org', id] })
      toast.success('Program deleted')
    },
    onError: (e: Error) => toast.error('Could not delete program', e.message),
  })

  /**
   * Log a check against a program.
   *
   * Only 'confirmed' moves last_verified_at — the database trigger from
   * migration 056 decides that, not this form, so the rule cannot drift
   * between the admin UI and any other writer.
   */
  const logVerification = useMutation({
    mutationFn: async (args: {
      programId: string
      method: HousingVerificationMethod
      outcome: HousingVerificationOutcome
    }) => {
      const { error } = await T.verifications().insert({
        program_id: args.programId,
        method: args.method,
        outcome: args.outcome,
        verified_by: userEmail ?? 'admin',
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-housing-org', id] })
      toast.success('Verification logged')
    },
    onError: (e: Error) => toast.error('Could not log verification', e.message),
  })

  if (!isNew && isLoading) {
    return <div className="skeleton h-64" />
  }

  return (
    <div className="max-w-3xl">
      <Link
        to="/admin/housing"
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All organizations
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
        {isNew ? 'New organization' : org.name || 'Organization'}
      </h1>

      {/* ── Organization ── */}
      <form
        className="card mt-5 space-y-4"
        onSubmit={(e) => { e.preventDefault(); saveOrg.mutate() }}
      >
        <div>
          <label htmlFor="org-name" className="label">Name</label>
          <input
            id="org-name" className="input" required value={org.name}
            onChange={(e) => setOrg({ ...org, name: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="org-slug" className="label">
            URL slug <span className="font-normal text-gray-500">— becomes /housing/org/…</span>
          </label>
          <input
            id="org-slug" className="input" required value={org.slug}
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers and hyphens only"
            onChange={(e) => setOrg({ ...org, slug: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="org-type" className="label">Type</label>
          <select
            id="org-type" className="input" value={org.org_type}
            onChange={(e) => setOrg({ ...org, org_type: e.target.value as HousingOrgType })}
          >
            {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="org-phone" className="label">Phone</label>
            <input
              id="org-phone" className="input" type="tel" value={org.phone}
              onChange={(e) => setOrg({ ...org, phone: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="org-email" className="label">Email</label>
            <input
              id="org-email" className="input" type="email" value={org.email}
              onChange={(e) => setOrg({ ...org, email: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="org-website" className="label">Website</label>
          <input
            id="org-website" className="input" type="url" placeholder="https://"
            value={org.website}
            onChange={(e) => setOrg({ ...org, website: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="org-desc" className="label">Description</label>
          <textarea
            id="org-desc" className="input" rows={4} value={org.description}
            onChange={(e) => setOrg({ ...org, description: e.target.value })}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox" checked={org.is_published}
            onChange={(e) => setOrg({ ...org, is_published: e.target.checked })}
          />
          <span className="text-sm text-gray-700 dark:text-slate-300">
            Published — visible on the public site
          </span>
        </label>

        <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saveOrg.isPending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {saveOrg.isPending ? 'Saving…' : 'Save organization'}
        </button>
      </form>

      {isNew && (
        <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
          Save the organization first, then add its addresses and programs.
        </p>
      )}

      {/* ── Locations ── */}
      {!isNew && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Addresses</h2>

          <ul className="mt-3 space-y-2">
            {(data?.locations ?? []).map((l) => (
              <li key={l.id} className="card flex items-start justify-between gap-3">
                <div className="text-sm text-gray-800 dark:text-slate-200">
                  {[l.address_line1, l.address_line2, l.city, l.state_code, l.postal_code]
                    .filter(Boolean).join(', ') || '(no address recorded)'}
                  {l.is_primary && <span className="badge badge-verified ml-2">Primary</span>}
                </div>
                <button
                  type="button"
                  className="btn-icon text-red-600"
                  aria-label="Remove address"
                  onClick={() => deleteLocation.mutate(l.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
            {(data?.locations ?? []).length === 0 && (
              <li className="text-sm text-gray-500 dark:text-slate-400">No addresses yet.</li>
            )}
          </ul>

          <form
            className="card mt-3 space-y-3"
            onSubmit={(e) => { e.preventDefault(); addLocation.mutate() }}
          >
            <div>
              <label htmlFor="loc1" className="label">Street address</label>
              <input id="loc1" className="input" value={newLoc.address_line1}
                onChange={(e) => setNewLoc({ ...newLoc, address_line1: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="loc-city" className="label">City</label>
                <input id="loc-city" className="input" value={newLoc.city}
                  onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })} />
              </div>
              <div>
                <label htmlFor="loc-state" className="label">State</label>
                <select id="loc-state" className="input" value={newLoc.state_code}
                  onChange={(e) => setNewLoc({ ...newLoc, state_code: e.target.value })}>
                  <option value="">—</option>
                  {(states ?? []).map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="loc-zip" className="label">ZIP</label>
                <input id="loc-zip" className="input" value={newLoc.postal_code}
                  onChange={(e) => setNewLoc({ ...newLoc, postal_code: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={newLoc.is_primary}
                onChange={(e) => setNewLoc({ ...newLoc, is_primary: e.target.checked })} />
              <span className="text-sm text-gray-700 dark:text-slate-300">
                Primary address — the one to go to
              </span>
            </label>
            <button type="submit" className="btn-secondary btn-sm inline-flex items-center gap-1" disabled={addLocation.isPending}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add address
            </button>
          </form>
        </section>
      )}

      {/* ── Programs ── */}
      {!isNew && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Programs</h2>
            <button
              type="button"
              className="btn-secondary btn-sm inline-flex items-center gap-1"
              onClick={() => setEditing({ ...BLANK_PROGRAM })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add program
            </button>
          </div>

          <ul className="mt-3 space-y-2">
            {(data?.programs ?? []).map((p) => {
              const f = freshnessFor(p.last_verified_at)
              return (
                <li key={p.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {p.name}{' '}
                        <span className={p.is_published ? 'badge badge-verified' : 'badge badge-pending'}>
                          {p.is_published ? 'Published' : 'Unpublished'}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        {HOUSING_TYPE_LABELS[p.housing_type]}
                        {p.gender_served && ` · ${GENDER_LABELS[p.gender_served]}`}
                      </p>
                      <p className={`mt-1 text-sm ${f.isStale ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-slate-400'}`}>
                        {f.label}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary btn-sm inline-flex items-center gap-1"
                        onClick={() => logVerification.mutate({
                          programId: p.id, method: 'phone', outcome: 'confirmed',
                        })}
                        disabled={logVerification.isPending}
                      >
                        <PhoneCall className="h-4 w-4" aria-hidden="true" />
                        Confirmed by phone
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setEditing({
                          id: p.id,
                          name: p.name,
                          housing_type: p.housing_type,
                          gender_served: p.gender_served,
                          accepts_felony: p.accepts_felony,
                          accepts_violent_offense: p.accepts_violent_offense,
                          accepts_sex_offense: p.accepts_sex_offense,
                          accepts_vouchers: p.accepts_vouchers,
                          requires_sobriety: p.requires_sobriety,
                          has_curfew: p.has_curfew,
                          monthly_cost_cents: p.monthly_cost_cents,
                          deposit_cents: p.deposit_cents,
                          max_stay_days: p.max_stay_days,
                          beds_total: p.beds_total,
                          application_url: p.application_url ?? '',
                          intake_phone: p.intake_phone ?? '',
                          notes: p.notes ?? '',
                          is_published: p.is_published,
                        })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-icon text-red-600"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => deleteProgram.mutate(p.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
            {(data?.programs ?? []).length === 0 && (
              <li className="text-sm text-gray-500 dark:text-slate-400">No programs yet.</li>
            )}
          </ul>

          {editing && (
            <form
              className="card mt-4 space-y-4"
              onSubmit={(e) => { e.preventDefault(); saveProgram.mutate() }}
            >
              <h3 className="font-bold text-gray-900 dark:text-white">
                {editing.id ? 'Edit program' : 'New program'}
              </h3>

              <div>
                <label htmlFor="p-name" className="label">Program name</label>
                <input id="p-name" className="input" required value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-type" className="label">Housing type</label>
                  <select id="p-type" className="input" value={editing.housing_type}
                    onChange={(e) => setEditing({ ...editing, housing_type: e.target.value as HousingType })}>
                    {Object.entries(HOUSING_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-gender" className="label">Gender served</label>
                  <select
                    id="p-gender" className="input"
                    value={editing.gender_served ?? ''}
                    onChange={(e) => setEditing({
                      ...editing,
                      gender_served: (e.target.value || null) as HousingGenderServed | null,
                    })}
                  >
                    <option value="">Not stated</option>
                    {Object.entries(GENDER_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset className="space-y-3">
                <legend className="label">Who they will consider</legend>
                <TriSelect id="p-felony" label="Accepts felony records"
                  value={editing.accepts_felony}
                  onChange={(v) => setEditing({ ...editing, accepts_felony: v })} />
                <TriSelect id="p-violent" label="Accepts violent offense records"
                  value={editing.accepts_violent_offense}
                  onChange={(v) => setEditing({ ...editing, accepts_violent_offense: v })} />
                <TriSelect id="p-sex" label="Accepts sex offense records"
                  value={editing.accepts_sex_offense}
                  onChange={(v) => setEditing({ ...editing, accepts_sex_offense: v })} />
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="label">House rules</legend>
                <TriSelect id="p-vouchers" label="Accepts housing vouchers"
                  value={editing.accepts_vouchers}
                  onChange={(v) => setEditing({ ...editing, accepts_vouchers: v })} />
                <TriSelect id="p-sober" label="Sobriety required"
                  value={editing.requires_sobriety}
                  onChange={(v) => setEditing({ ...editing, requires_sobriety: v })} />
                <TriSelect id="p-curfew" label="Has a curfew"
                  value={editing.has_curfew}
                  onChange={(v) => setEditing({ ...editing, has_curfew: v })} />
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-cost" className="label">Monthly cost (dollars)</label>
                  <input id="p-cost" className="input" inputMode="decimal"
                    value={centsToDollars(editing.monthly_cost_cents)}
                    onChange={(e) => setEditing({ ...editing, monthly_cost_cents: dollarsToCents(e.target.value) })} />
                </div>
                <div>
                  <label htmlFor="p-dep" className="label">Deposit (dollars)</label>
                  <input id="p-dep" className="input" inputMode="decimal"
                    value={centsToDollars(editing.deposit_cents)}
                    onChange={(e) => setEditing({ ...editing, deposit_cents: dollarsToCents(e.target.value) })} />
                </div>
                <div>
                  <label htmlFor="p-stay" className="label">Max stay (days)</label>
                  <input id="p-stay" className="input" inputMode="numeric"
                    value={editing.max_stay_days ?? ''}
                    onChange={(e) => setEditing({ ...editing, max_stay_days: intOrNull(e.target.value) })} />
                </div>
                <div>
                  <label htmlFor="p-beds" className="label">Total beds</label>
                  <input id="p-beds" className="input" inputMode="numeric"
                    value={editing.beds_total ?? ''}
                    onChange={(e) => setEditing({ ...editing, beds_total: intOrNull(e.target.value) })} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-phone" className="label">Intake phone</label>
                  <input id="p-phone" className="input" type="tel" value={editing.intake_phone}
                    onChange={(e) => setEditing({ ...editing, intake_phone: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="p-url" className="label">Application URL</label>
                  <input id="p-url" className="input" type="url" placeholder="https://"
                    value={editing.application_url}
                    onChange={(e) => setEditing({ ...editing, application_url: e.target.value })} />
                </div>
              </div>

              <div>
                <label htmlFor="p-notes" className="label">Notes</label>
                <textarea id="p-notes" className="input" rows={3} value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editing.is_published}
                  onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  Published — needs the organization published too
                </span>
              </label>

              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={saveProgram.isPending}>
                  {saveProgram.isPending ? 'Saving…' : 'Save program'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  )
}
