import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Search, Pencil, Mail, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '@/lib/supabase'
import { notifyClaim } from '@/lib/notifications'
import { useAuthStore, useToast } from '@/lib/store'
import type { Provider, ProviderClaim, VerificationStatus } from '@/types'

const STATUS_STYLE: Record<string, string> = {
  pending:   'badge-pending',
  verified:  'badge-verified',
  rejected:  'badge bg-red-900/30 text-red-400',
  suspended: 'badge bg-gray-700 text-gray-400',
}

/** `claims` is a claim_status filter; the rest filter on verification_status. */
type Filter = VerificationStatus | 'all' | 'claims'

/** Rough signal for the reviewer: does the claimant's email domain match the org's? */
function domainMatch(claimEmail: string, org: Provider): 'contact' | 'website' | null {
  const domain = claimEmail.split('@')[1]?.toLowerCase()
  if (!domain) return null
  if (org.contact_email?.split('@')[1]?.toLowerCase() === domain) return 'contact'
  if (org.website && org.website.toLowerCase().includes(domain)) return 'website'
  return null
}

export default function AdminProviders() {
  const [filter, setFilter] = useState<Filter>('pending')
  const [search, setSearch] = useState('')
  const { userId }          = useAuthStore()
  const toast               = useToast()
  const qc                  = useQueryClient()

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ['admin-providers', filter],
    queryFn: async () => {
      let q = db.providers().select('*').order('created_at', { ascending: false })
      if (filter === 'claims')    q = q.eq('claim_status', 'pending_claim')
      else if (filter !== 'all')  q = q.eq('verification_status', filter)
      const { data } = await q
      return (data ?? []) as Provider[]
    },
  })

  // Claim evidence for the rows on screen. Kept as a separate query because
  // provider_claims is admin-only under RLS and cannot be embedded in the
  // public-shaped providers select above.
  const { data: claims = [] } = useQuery<ProviderClaim[]>({
    queryKey: ['admin-provider-claims'],
    queryFn: async () => {
      const { data } = await db.provider_claims()
        .select('*').eq('status', 'pending').order('created_at', { ascending: false })
      return (data ?? []) as ProviderClaim[]
    },
  })
  const claimFor = (providerId: string) => claims.find(c => c.provider_id === providerId)

  /**
   * Approving a claim hands the claimant control of the org: claim_status goes
   * to 'claimed' and the row is verified so they get portal access. Denying
   * releases it back to 'unclaimed' and detaches the account, which puts the
   * org back in the public /claim directory. verification_status is left alone
   * on a denial — the org's own trust level is a separate decision.
   */
  const decideClaim = useMutation({
    mutationFn: async ({ provider, approve, reason }: { provider: Provider; approve: boolean; reason?: string }) => {
      const claim = claimFor(provider.id)
      const { error } = await db.providers().update(
        approve
          ? { claim_status: 'claimed', verification_status: 'verified' }
          : { claim_status: 'unclaimed', user_id: null },
      ).eq('id', provider.id)
      if (error) throw error

      // The decision note is written before the email is triggered, because
      // the edge function reads it back out of the row to quote in the
      // denial message rather than taking it from the request.
      if (claim) {
        await db.provider_claims().update({
          status:        approve ? 'approved' : 'denied',
          decided_at:    new Date().toISOString(),
          decided_by:    userId!,
          decision_note: reason?.trim() || null,
        }).eq('id', claim.id)
      }

      await db.moderation_logs().insert({
        admin_id:    userId!,
        target_type: 'provider',
        target_id:   provider.id,
        action:      approve ? 'approved' : 'rejected',
        reason:      approve ? 'Claim approved' : `Claim denied${reason ? `: ${reason}` : ''}`,
      })

      // Best effort — the decision is already recorded either way.
      const mail = claim
        ? await notifyClaim(claim.id, approve ? 'approved' : 'denied')
        : { sent: false, reason: 'error' as const }
      return { mailed: mail.sent, mailReason: mail.sent ? null : mail.reason }
    },
    onSuccess: ({ mailed, mailReason }, { approve }) => {
      const verb = approve ? 'approved' : 'denied'
      if (mailed) {
        toast.success(`Claim ${verb}`, 'The claimant has been emailed.')
      } else if (mailReason === 'not_configured') {
        toast.success(`Claim ${verb}`, 'Email is not configured yet — tell them yourself.')
      } else {
        toast.success(`Claim ${verb}`, 'Saved, but the email did not go out.')
      }
      qc.invalidateQueries({ queryKey: ['admin-providers'] })
      qc.invalidateQueries({ queryKey: ['admin-provider-claims'] })
    },
    onError: (e: Error) => toast.error('Action failed', e.message),
  })

  const moderate = useMutation({
    mutationFn: async ({ providerId, status, reason }: { providerId: string; status: VerificationStatus; reason?: string }) => {
      const { error: pErr } = await db.providers().update({ verification_status: status }).eq('id', providerId)
      if (pErr) throw pErr
      await db.moderation_logs().insert({
        admin_id:    userId!,
        target_type: 'provider',
        target_id:   providerId,
        action:      status === 'verified' ? 'approved' : status === 'rejected' ? 'rejected' : 'suspended',
        reason:      reason ?? null,
      })
    },
    onSuccess: (_, { status }) => {
      toast.success(`Provider ${status}`)
      qc.invalidateQueries({ queryKey: ['admin-providers'] })
      qc.invalidateQueries({ queryKey: ['admin-stats-providers'] })
    },
    onError: (e: Error) => toast.error('Action failed', e.message),
  })

  const filtered = providers.filter(p =>
    !search || p.organization_name.toLowerCase().includes(search.toLowerCase()) ||
    p.contact_email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Providers</h1>
        <p className="text-sm text-gray-400 mt-0.5">Review and verify organization accounts</p>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['claims','pending','verified','rejected','suspended','all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`badge py-1.5 px-3 cursor-pointer capitalize transition-colors text-xs ${
                filter === s ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 flex-1">
          <Search size={15} className="text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="bg-transparent text-sm text-gray-200 placeholder:text-gray-500 outline-none w-full"
          />
        </div>
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full bg-gray-800" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <AlertTriangle size={28} className="mx-auto mb-2 text-gray-600" />
          <p>No providers match this filter</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-gray-800 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-white">{p.organization_name}</h3>
                  <span className={STATUS_STYLE[p.verification_status] ?? 'badge'}>{p.verification_status}</span>
                </div>
                <p className="text-sm text-gray-400">{p.contact_name} · {p.contact_email}</p>
                {p.contact_phone && <p className="text-xs text-gray-500">{p.contact_phone}</p>}
                {p.ein && <p className="text-xs text-gray-500">EIN: {p.ein}</p>}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 text-xs text-primary-400 hover:underline mt-1">
                    <ExternalLink size={11} /> {p.website}
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-500 shrink-0">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>

            {p.bio && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{p.bio}</p>}

            {/* Claim under review — show who is asking and why, so the
                reviewer is not approving a bare UUID. */}
            {p.claim_status === 'pending_claim' && (() => {
              const claim = claimFor(p.id)
              const match = claim ? domainMatch(claim.claim_email, p) : null
              return (
                <div className="rounded-xl bg-amber-950/40 border border-amber-800/40 p-3.5 mb-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-amber-500/20 text-amber-300 text-[11px]">Claim under review</span>
                    {match && (
                      <span className="badge bg-success-600/20 text-success-400 text-[11px]">
                        email domain matches org {match}
                      </span>
                    )}
                    {claim && !match && (
                      <span className="badge bg-gray-700 text-gray-300 text-[11px]">domain does not match</span>
                    )}
                  </div>

                  {claim ? (
                    <>
                      <p className="flex items-center gap-1.5 text-sm text-gray-200 break-all">
                        <Mail size={12} className="text-gray-400 shrink-0" />
                        {claim.claim_email}
                        <span className="text-[11px] text-gray-500">(account)</span>
                      </p>
                      {claim.contact_email && claim.contact_email !== claim.claim_email && (
                        <p className="flex items-center gap-1.5 text-sm text-gray-200 break-all">
                          <Mail size={12} className="text-gray-400 shrink-0" />
                          {claim.contact_email}
                          <span className="text-[11px] text-gray-500">(contact at)</span>
                        </p>
                      )}
                      {claim.claim_note && (
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">“{claim.claim_note}”</p>
                      )}
                      <p className="text-[11px] text-gray-500">
                        Submitted {new Date(claim.created_at).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No claim record found for this organization. It may have been
                      withdrawn, or the claim was filed before this evidence was
                      captured — verify by another route before approving.
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {p.claim_status === 'pending_claim' && (
                <>
                  <button
                    onClick={() => decideClaim.mutate({ provider: p, approve: true })}
                    disabled={decideClaim.isPending}
                    className="flex items-center gap-1.5 bg-success-600 hover:bg-success-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                  >
                    <CheckCircle size={13} /> Approve claim
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Deny this claim? ${p.organization_name} goes back to the public claim directory and the account is detached.`)) return
                      // Quoted verbatim to the claimant, so it is written for
                      // them to read, not as an internal note.
                      const reason = prompt(
                        'Reason for the claimant (optional, included in their email):',
                      )
                      decideClaim.mutate({ provider: p, approve: false, reason: reason ?? undefined })
                    }}
                    disabled={decideClaim.isPending}
                    className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                  >
                    <Undo2 size={13} /> Deny claim
                  </button>
                </>
              )}
              <Link
                to={`/admin/providers/${p.id}`}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
              >
                <Pencil size={12} /> Edit Details
              </Link>
              {p.verification_status !== 'verified' && (
                <button
                  onClick={() => moderate.mutate({ providerId: p.id, status: 'verified' })}
                  disabled={moderate.isPending}
                  className="flex items-center gap-1.5 bg-success-600 hover:bg-success-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                >
                  <CheckCircle size={13} /> Verify
                </button>
              )}
              {p.verification_status !== 'rejected' && (
                <button
                  onClick={() => {
                    const reason = prompt('Reason for rejection (optional):')
                    moderate.mutate({ providerId: p.id, status: 'rejected', reason: reason ?? undefined })
                  }}
                  disabled={moderate.isPending}
                  className="flex items-center gap-1.5 bg-danger-600 hover:bg-danger-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                >
                  <XCircle size={13} /> Reject
                </button>
              )}
              {p.verification_status === 'verified' && (
                <button
                  onClick={() => moderate.mutate({ providerId: p.id, status: 'suspended' })}
                  disabled={moderate.isPending}
                  className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                >
                  Suspend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
