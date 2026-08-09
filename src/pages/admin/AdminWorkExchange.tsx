import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase, ChevronDown, ExternalLink, Check, X, Quote, Bot, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useToast, useAuthStore } from '@/lib/store'
import { ADMIN_QUERY_PREFIX } from '@/lib/adminCounts'
import type {
  WorkExchangeCandidate, WorkExchangeCandidateKind, WorkExchangeType,
} from '@/types'

/**
 * Review queue for scripts/work-exchange-agent.ts.
 *
 * The agent proposes; nothing it writes is public. This screen is where a
 * human turns a proposal into a listing — which is why every field stays
 * editable here rather than being a straight accept/reject: the model's draft
 * is a starting point, and the reviewer is the one who signs off on the words
 * that end up in front of someone looking for work.
 */

type CandidateRow = WorkExchangeCandidate & {
  providers?: { organization_name: string } | null
}

type Draft = {
  title: string
  description: string
  exchange_type: WorkExchangeType
  hours_per_week: string
  compensation: string
  skills_required: string
  skills_gained: string
  street: string
  city: string
  state: string
  zip: string
}

const KIND_STYLE: Record<WorkExchangeCandidateKind, string> = {
  new:    'bg-green-500/15 text-green-300',
  update: 'bg-blue-500/15 text-blue-300',
  delist: 'bg-danger-600/20 text-danger-400',
}

const KIND_LABEL: Record<WorkExchangeCandidateKind, string> = {
  new:    'New listing',
  update: 'Details changed',
  delist: 'No longer on page',
}

const EXCHANGE_TYPES: WorkExchangeType[] = ['volunteering', 'paid', 'skills_trade', 'internship']

function draftFrom(c: CandidateRow): Draft {
  const p = c.proposed ?? {}
  const a = p.address ?? {}
  return {
    title:           p.title ?? '',
    description:     p.description ?? '',
    exchange_type:   p.exchange_type ?? 'volunteering',
    hours_per_week:  p.hours_per_week != null ? String(p.hours_per_week) : '',
    compensation:    p.compensation ?? '',
    skills_required: (p.skills_required ?? []).join(', '),
    skills_gained:   (p.skills_gained ?? []).join(', '),
    street:          a.street ?? '',
    city:            a.city ?? '',
    state:           a.state ?? 'FL',
    zip:             a.zip ?? '',
  }
}

const csvToArray = (s: string) => s.split(',').map(v => v.trim()).filter(Boolean)

/** The columns an approval writes onto `work_exchanges`. */
function listingFields(d: Draft) {
  const hours = parseInt(d.hours_per_week, 10)
  return {
    title:           d.title.trim(),
    description:     d.description.trim(),
    exchange_type:   d.exchange_type,
    hours_per_week:  Number.isFinite(hours) && hours > 0 ? hours : null,
    compensation:    d.compensation.trim() || null,
    skills_required: csvToArray(d.skills_required),
    skills_gained:   csvToArray(d.skills_gained),
    address: {
      street: d.street.trim(),
      city:   d.city.trim(),
      state:  d.state.trim(),
      zip:    d.zip.trim(),
    },
  }
}

export default function AdminWorkExchange() {
  const [tab, setTab]           = useState<'pending' | 'reviewed'>('pending')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [draft, setDraft]       = useState<Draft | null>(null)
  const [note, setNote]         = useState('')
  const toast  = useToast()
  const qc     = useQueryClient()
  const userId = useAuthStore(s => s.userId)

  const { data: candidates = [], isLoading } = useQuery<CandidateRow[]>({
    queryKey: [ADMIN_QUERY_PREFIX, 'work-candidates', tab],
    queryFn: async () => {
      const query = db.work_candidates().select('*, providers(organization_name)')
      const { data, error } = await (
        tab === 'pending'
          ? query.eq('status', 'pending')
          : query.neq('status', 'pending')
      ).order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return (data ?? []) as unknown as CandidateRow[]
    },
  })

  function openCard(c: CandidateRow) {
    if (expanded === c.id) { setExpanded(null); return }
    setExpanded(c.id)
    setDraft(draftFrom(c))
    setNote('')
  }

  const decide = useMutation({
    mutationFn: async (
      { candidate, approve }: { candidate: CandidateRow; approve: boolean },
    ) => {
      if (approve) {
        const now = new Date().toISOString()

        if (candidate.kind === 'delist') {
          // Hidden, not deleted — if the program comes back, or the agent read
          // the page wrong, the row and its history are still here.
          const { error } = await db.work_exchanges()
            .update({ is_active: false, last_verified_at: now, last_verify_status: 'gone' })
            .eq('id', candidate.work_exchange_id!)
          if (error) throw error
        } else {
          if (!draft) throw new Error('Nothing to save')
          const fields = listingFields(draft)
          if (!fields.title || !fields.description) {
            throw new Error('Title and description are both required')
          }
          // /work renders "city, state" under every card; approving without
          // them ships a listing with a visibly broken location line.
          if (!fields.address.city || !fields.address.state) {
            throw new Error('City and state are required before this can go live')
          }

          if (candidate.kind === 'update') {
            const { error } = await db.work_exchanges()
              .update({ ...fields, last_verified_at: now, last_verify_status: 'confirmed' })
              .eq('id', candidate.work_exchange_id!)
            if (error) throw error
          } else {
            if (!candidate.provider_id) throw new Error('This candidate has no provider to attach to')

            // Approving a `new` candidate is two writes — create the listing,
            // then mark the candidate applied — and a browser cannot put them
            // in one transaction. If the second write fails, the listing is
            // already public while the candidate is still pending, so the
            // obvious next move (approve again) would insert a *second* copy
            // onto /work.
            //
            // The fix is idempotency rather than atomicity: derive a stable
            // external_id from the candidate, so a retry converges on the row
            // that is already there. `uniq_work_exchanges_external_id` is the
            // backstop when two approvals race.
            const externalId =
              candidate.external_id ??
              `WX-CAND-${candidate.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`

            const listing = {
              ...fields,
              provider_id:        candidate.provider_id,
              is_active:          true,
              lat:                candidate.proposed.lat ?? null,
              lng:                candidate.proposed.lng ?? null,
              source_url:         candidate.source_url,
              source_type:        'agent_assisted' as const,
              external_id:        externalId,
              last_verified_at:   now,
              last_verify_status: 'confirmed' as const,
            }

            const { data: existing, error: lookupError } = await db.work_exchanges()
              .select('id').eq('external_id', externalId).maybeSingle()
            if (lookupError) throw lookupError

            if (existing) {
              // A previous attempt already created it. Re-apply the current
              // form values so an edit made on the retry is not lost.
              const { error } = await db.work_exchanges().update(listing).eq('id', existing.id)
              if (error) throw error
            } else {
              const { error } = await db.work_exchanges().insert(listing)
              // 23505 means a concurrent approval inserted it between the
              // lookup and here. The listing exists and is correct; fall
              // through and mark the candidate applied rather than showing
              // the reviewer an error for work that succeeded.
              if (error && error.code !== '23505') throw error
            }
          }
        }
      }

      const { error } = await db.work_candidates().update({
        status:      approve ? 'applied' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        review_note: note.trim() || null,
      }).eq('id', candidate.id)
      if (error) throw error
    },
    onSuccess: (_data, { approve }) => {
      toast.success(approve ? 'Applied to the listing' : 'Rejected')
      qc.invalidateQueries({ queryKey: [ADMIN_QUERY_PREFIX] })
      setExpanded(null)
      setDraft(null)
    },
    onError: (e: Error) => toast.error('Could not save', e.message),
  })

  const field = 'input bg-gray-700 border-gray-600 text-white placeholder:text-gray-500'
  const set = (k: keyof Draft) => (v: string) =>
    setDraft(d => (d ? { ...d, [k]: v } : d))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Briefcase size={22} className="text-primary-400" /> Work Exchange Review
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Drafts from the work exchange agent. Nothing here is public until you approve it.
        </p>
      </div>

      <div className="flex gap-2">
        {([['pending', 'Awaiting review'], ['reviewed', 'Decided']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => { setTab(value); setExpanded(null) }}
            className={clsx('badge py-1.5 px-3 cursor-pointer transition-colors text-xs', {
              'bg-primary-600 text-white': tab === value,
              'bg-gray-800 text-gray-400 hover:bg-gray-700': tab !== value,
            })}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 bg-gray-800 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && candidates.length === 0 && (
        <div className="text-center py-16">
          <Bot size={30} className="text-gray-700 mx-auto mb-2" />
          <p className="text-gray-400">
            {tab === 'pending' ? 'Nothing awaiting review.' : 'Nothing decided yet.'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Run <code className="text-gray-500">npm run agent:work -- --verify --apply</code> to fill the queue.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {candidates.map(c => (
          <div key={c.id} className="bg-gray-800 rounded-2xl overflow-hidden">
            <button onClick={() => openCard(c)} className="w-full flex items-start gap-3 p-4 text-left">
              <span className={clsx('badge text-[11px] shrink-0 mt-0.5', KIND_STYLE[c.kind])}>
                {KIND_LABEL[c.kind]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">
                  {c.proposed.title || '(untitled)'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {c.providers?.organization_name ?? 'Unknown organization'}
                  {c.confidence != null && ` · ${c.confidence}% confidence`}
                  {c.status !== 'pending' && ` · ${c.status}`}
                </p>
              </div>
              <ChevronDown
                size={15}
                className={clsx('text-gray-500 shrink-0 mt-1 transition-transform', {
                  'rotate-180': expanded === c.id,
                })}
              />
            </button>

            {expanded === c.id && (
              <div className="px-4 pb-4 border-t border-gray-700 space-y-4 pt-4">
                {/* What the agent saw. A reviewer who cannot check the quote
                    against the page has no way to catch a fabrication. */}
                <div className="space-y-2">
                  <a
                    href={c.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 break-all"
                  >
                    <ExternalLink size={12} className="shrink-0" /> {c.source_url}
                  </a>
                  {c.evidence && (
                    <blockquote className="flex gap-2 bg-gray-900 rounded-xl p-3 text-xs text-gray-300 italic">
                      <Quote size={13} className="text-gray-600 shrink-0 mt-0.5" />
                      <span>{c.evidence}</span>
                    </blockquote>
                  )}
                  {c.agent_note && <p className="text-xs text-gray-400">{c.agent_note}</p>}
                  <p className="text-[11px] text-gray-600">
                    {c.agent_model ?? 'agent'} · run {c.agent_run_id}
                  </p>
                </div>

                {c.kind === 'delist' ? (
                  <div className="flex gap-2 bg-danger-600/10 rounded-xl p-3 text-xs text-danger-300">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Approving hides this listing from <code>/work</code>. The row is kept, so it
                      can be switched back on if the program returns.
                    </span>
                  </div>
                ) : draft && (
                  <div className="space-y-3">
                    <div>
                      <label className="label text-gray-300">Title</label>
                      <input value={draft.title} onChange={e => set('title')(e.target.value)} className={field} />
                    </div>
                    <div>
                      <label className="label text-gray-300">Description</label>
                      <textarea
                        value={draft.description}
                        onChange={e => set('description')(e.target.value)}
                        className={`${field} min-h-[110px] resize-none`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-gray-300">Type</label>
                        <select
                          value={draft.exchange_type}
                          onChange={e => set('exchange_type')(e.target.value)}
                          className={field}
                        >
                          {EXCHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label text-gray-300">Hours / week</label>
                        <input
                          type="number"
                          value={draft.hours_per_week}
                          onChange={e => set('hours_per_week')(e.target.value)}
                          className={field}
                          placeholder="blank if not stated"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label text-gray-300">Compensation</label>
                      <input
                        value={draft.compensation}
                        onChange={e => set('compensation')(e.target.value)}
                        className={field}
                        placeholder="blank if unpaid or not stated"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-gray-300">Skills required</label>
                        <input
                          value={draft.skills_required}
                          onChange={e => set('skills_required')(e.target.value)}
                          className={field}
                          placeholder="comma, separated"
                        />
                      </div>
                      <div>
                        <label className="label text-gray-300">Skills gained</label>
                        <input
                          value={draft.skills_gained}
                          onChange={e => set('skills_gained')(e.target.value)}
                          className={field}
                          placeholder="comma, separated"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="label text-gray-300">Street</label>
                        <input value={draft.street} onChange={e => set('street')(e.target.value)} className={field} />
                      </div>
                      <div>
                        <label className="label text-gray-300">City *</label>
                        <input value={draft.city} onChange={e => set('city')(e.target.value)} className={field} />
                      </div>
                      <div>
                        <label className="label text-gray-300">State *</label>
                        <input value={draft.state} onChange={e => set('state')(e.target.value)} className={field} />
                      </div>
                      <div>
                        <label className="label text-gray-300">ZIP</label>
                        <input value={draft.zip} onChange={e => set('zip')(e.target.value)} className={field} />
                      </div>
                    </div>
                  </div>
                )}

                {c.status === 'pending' ? (
                  <>
                    <div>
                      <label className="label text-gray-300">Review note (optional)</label>
                      <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className={field}
                        placeholder="Why you approved or rejected this"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide.mutate({ candidate: c, approve: true })}
                        disabled={decide.isPending}
                        className="btn-primary btn-sm gap-1.5"
                      >
                        <Check size={14} /> {c.kind === 'delist' ? 'Hide listing' : 'Approve & publish'}
                      </button>
                      <button
                        onClick={() => decide.mutate({ candidate: c, approve: false })}
                        disabled={decide.isPending}
                        className="btn-danger btn-sm gap-1.5"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    {c.status === 'applied' ? 'Applied' : 'Rejected'}
                    {c.reviewed_at && ` on ${new Date(c.reviewed_at).toLocaleDateString()}`}
                    {c.review_note && ` — ${c.review_note}`}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
