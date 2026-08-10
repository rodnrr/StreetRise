import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Building2, CheckCircle, Clock, ArrowLeft, ShieldCheck,
  AlertTriangle, LogIn, Mail,
} from 'lucide-react'
import SeoHead from '@/lib/seo/SeoHead'
import { useAuthStore, useToast } from '@/lib/store'
import {
  useClaimableProvider, useMyProviderOrg, submitClaim, currentIdentity, isEmailShaped,
  ClaimError, CLAIMABLE_KEY, MY_CLAIMS_KEY, MY_ORG_KEY,
  type ClaimIdentity,
} from '@/lib/claims'
import { notifyClaim } from '@/lib/notifications'

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-xl mx-auto px-4 py-10 pb-28 md:pb-12">{children}</div>
}

/**
 * Who the browser can actually write to the database as.
 *
 * `null` while we are still asking Supabase; `false` once we know there is no
 * usable session. This is deliberately not derived from `useAuthStore` — the
 * store is persisted localStorage and stays "signed in" long after the session
 * behind it expires, which is what made this form submit as `anon` and fail RLS.
 */
type Session = ClaimIdentity | false | null

export default function ClaimDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const qc           = useQueryClient()
  const toast        = useToast()
  const { userId, setAuth, clearAuth } = useAuthStore()
  const { data: org, isLoading, isError } = useClaimableProvider(id)

  const [session, setSession]     = useState<Session>(null)
  const [note, setNote]           = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactTouched, setContactTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)

  // An account may only ever hold one organization (providers.user_id is
  // UNIQUE), so someone who already has one cannot claim another. Ask up front
  // rather than letting them fill in the form and fail on submit.
  const { data: ownedOrg, isLoading: ownedLoading } = useMyProviderOrg(
    session ? session.userId : null,
  )

  // The account address is read from the session, never from a form field —
  // RLS pins claim_email to auth.jwt()->>'email', so a typed value would be
  // rejected. `contactEmail` is separate and editable: where they actually
  // want to be reached, which may not be the account they signed up with.
  useEffect(() => {
    let cancelled = false
    currentIdentity().then(me => {
      if (cancelled) return
      setSession(me ?? false)
      if (me) setContactEmail(prev => prev || me.email)
      // The store claimed a user the auth server does not recognise. Drop it,
      // or every other gate in the app keeps believing it too.
      else if (useAuthStore.getState().userId) clearAuth()
    })
    return () => { cancelled = true }
  }, [userId, clearAuth])

  const contactValid = isEmailShaped(contactEmail)
  const showContactError = contactTouched && !contactValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactTouched(true)
    if (!id || !session || !contactValid) return
    setSubmitting(true)
    try {
      const { claimId, userId: uid, email } = await submitClaim({
        providerId: id, contactEmail, note,
      })
      // Best effort — the claim is already saved, so a mail failure must not
      // be reported to the user as a failed claim.
      void notifyClaim(claimId, 'submitted')
      // The account now owns this provider row, pending admin approval.
      setAuth({
        userId: uid,
        userEmail: email,
        role: 'provider',
        providerId: id,
        verificationStatus: 'pending',
      })
      qc.invalidateQueries({ queryKey: CLAIMABLE_KEY })
      qc.invalidateQueries({ queryKey: MY_CLAIMS_KEY })
      qc.invalidateQueries({ queryKey: MY_ORG_KEY })
      setDone(true)
    } catch (err) {
      const msg = err instanceof ClaimError ? err.message : 'Something went wrong. Please try again.'
      toast.error('Claim not submitted', msg)
      if (err instanceof ClaimError && err.kind === 'taken') {
        qc.invalidateQueries({ queryKey: CLAIMABLE_KEY })
      }
      // The session died between page load and submit. Swap the form for the
      // sign-in prompt so the next tap goes somewhere useful.
      if (err instanceof ClaimError && err.kind === 'signed_out') {
        setSession(false)
        clearAuth()
      }
      if (err instanceof ClaimError && err.kind === 'already_owns_org') {
        qc.invalidateQueries({ queryKey: MY_ORG_KEY })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <Shell><div className="skeleton h-64 w-full" /></Shell>

  if (isError || !org) return (
    <Shell>
      <div className="text-center py-16">
        <AlertTriangle size={30} className="mx-auto mb-3 text-gray-400" />
        <h1 className="font-bold text-gray-900 mb-1">Organization not found</h1>
        <p className="text-sm text-gray-500 mb-5">
          This organization may have already been claimed.
        </p>
        <Link to="/claim" className="btn-secondary btn-sm">Back to directory</Link>
      </div>
    </Shell>
  )

  // ── Submitted ──────────────────────────────────────────────────
  if (done) return (
    <Shell>
      <div className="text-center py-10">
        <CheckCircle size={52} className="text-success-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim submitted</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          We’ve received your claim for <strong>{org.organization_name}</strong>. A
          StreetRise staff member reviews every claim by hand, usually within
          1–2 business days. We’ll email <strong>{contactEmail}</strong> when it’s decided.
        </p>
        <div className="text-left rounded-2xl bg-gray-50 border border-gray-100 p-5 space-y-2.5 mb-6">
          <p className="text-sm font-semibold text-gray-900">While you wait</p>
          <p className="text-sm text-gray-600">
            The listing stays live and unchanged on the map, so people can still find
            help there. You’ll get portal access to edit it once the claim is approved.
          </p>
        </div>
        <button onClick={() => navigate('/portal/dashboard')} className="btn-primary">
          Go to the provider portal
        </button>
      </div>
    </Shell>
  )

  // ── Already claimed or in review ───────────────────────────────
  if (org.claim_status !== 'unclaimed') {
    const inReview = org.claim_status === 'pending_claim'
    return (
      <Shell>
        <Link to="/claim" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft size={15} /> Back to directory
        </Link>
        <div className="card text-center py-10">
          {inReview
            ? <Clock size={44} className="text-amber-500 mx-auto mb-3" />
            : <ShieldCheck size={44} className="text-success-600 mx-auto mb-3" />}
          <h1 className="font-bold text-gray-900 mb-2">
            {inReview ? 'This claim is under review' : 'Already claimed'}
          </h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {inReview
              ? <>Someone has claimed <strong>{org.organization_name}</strong> and our team is reviewing it.</>
              : <><strong>{org.organization_name}</strong> is already managed by its organization.</>}
            {' '}If you believe this is a mistake, email{' '}
            <a href="mailto:support@streetrise.org" className="text-primary-600 hover:underline">support@streetrise.org</a>.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Claimable ──────────────────────────────────────────────────
  return (
    <Shell>
      <SeoHead
        title={`Claim ${org.organization_name} — StreetRise`}
        description={`Work at ${org.organization_name}? Claim its StreetRise listing to keep hours, availability, and contact details accurate.`}
        path={`/claim/${org.id}`}
      />

      <Link to="/claim" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={15} /> Back to directory
      </Link>

      {/* Org summary — read-only. These values are locked by RLS during a
          claim and can only be edited from the portal after approval. */}
      <div className="card mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <Building2 size={19} className="text-primary-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{org.organization_name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Listed from public information</p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          {([
            ['Contact email', org.contact_email],
            ['Phone', org.contact_phone],
            ['Website', org.website],
          ] as [string, string | null | undefined][])
            .filter(([, v]) => !!v)
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-gray-100 last:border-0">
                <dt className="text-gray-500 shrink-0">{label}</dt>
                <dd className="font-medium text-gray-900 text-right truncate">{value}</dd>
              </div>
            ))}
        </dl>

        <p className="text-xs text-gray-400 mt-4">
          Something wrong here? Claim the listing first — you can correct all of it
          from the portal once approved.
        </p>
      </div>

      {/* Still asking Supabase who this is, or what they already own */}
      {(session === null || (!!session && ownedLoading)) && <div className="skeleton h-44 w-full" />}

      {/* Not signed in, or signed in only as far as localStorage is concerned */}
      {session === false && (
        <div className="card text-center py-8">
          <LogIn size={30} className="text-primary-600 mx-auto mb-3" />
          <h2 className="font-bold text-gray-900 mb-1.5">Sign in to claim this listing</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Use your work email at {org.organization_name.split(' ')[0]} if you have one —
            it helps our team confirm the claim faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link to={`/login?signup=1&next=/claim/${org.id}`} className="btn-primary">
              Create an account
            </Link>
            <Link to={`/login?next=/claim/${org.id}`} className="btn-secondary">
              Sign in
            </Link>
          </div>
        </div>
      )}

      {/* Signed in, but this account already holds a different organization */}
      {session && ownedOrg && (
        <div className="card text-center py-8">
          <Building2 size={30} className="text-amber-500 mx-auto mb-3" />
          <h2 className="font-bold text-gray-900 mb-1.5">
            This account already manages an organization
          </h2>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto leading-relaxed">
            You’re signed in as <strong>{session.email}</strong>, which manages{' '}
            <strong>{ownedOrg.organization_name}</strong>. Each organization needs
            its own StreetRise account, so this one can’t also claim{' '}
            {org.organization_name}. Sign out and create an account with a work
            email at {org.organization_name.split(' ')[0]}, or email{' '}
            <a href="mailto:support@streetrise.org" className="text-primary-600 hover:underline">
              support@streetrise.org
            </a>{' '}
            and we’ll link them for you.
          </p>
          <button onClick={() => navigate('/portal/dashboard')} className="btn-secondary">
            Go to your portal
          </button>
        </div>
      )}

      {/* Signed in with a clean account — claim form */}
      {session && !ownedOrg && !ownedLoading && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="font-bold text-gray-900">Claim this organization</h2>

          <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
            <Mail size={15} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Claiming as</p>
              <p className="text-sm font-medium text-gray-900 truncate">{session.email}</p>
            </div>
          </div>

          <div>
            <label htmlFor="claim-contact-email" className="label">Best email to reach you *</label>
            <input
              id="claim-contact-email"
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              onBlur={() => setContactTouched(true)}
              aria-invalid={showContactError}
              aria-describedby={showContactError ? 'claim-contact-email-error' : undefined}
              className={showContactError ? 'input-error' : 'input'}
              placeholder="you@yourorg.org"
            />
            {showContactError
              ? <p id="claim-contact-email-error" className="error-text">Enter a valid email address</p>
              : <p className="text-xs text-gray-400 mt-1">
                  We’ll send updates about this claim here. A work address at the
                  organization helps us approve it faster.
                </p>}
          </div>

          <div>
            <label htmlFor="claim-note" className="label">
              Your role at {org.organization_name}{' '}
              <span className="text-gray-400 font-normal">(helps us approve faster)</span>
            </label>
            <textarea
              id="claim-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              className="input min-h-[96px] resize-none"
              placeholder="e.g. I'm the shelter director. You can reach me at the main line, extension 4."
            />
            <p className="text-xs text-gray-400 mt-1">{note.length}/500</p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 space-y-1.5">
            <p className="text-xs font-semibold text-amber-900">What happens next</p>
            <p className="text-xs text-amber-800 leading-relaxed">
              A staff member reviews your claim by hand, usually within 1–2 business
              days. The listing stays live and unchanged in the meantime. You get
              portal access to edit it once the claim is approved.
            </p>
          </div>

          <button type="submit" disabled={submitting || !contactValid} className="btn-primary w-full">
            {submitting ? 'Submitting…' : 'Submit claim'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            By claiming you confirm you’re authorized to represent this organization.
          </p>
        </form>
      )}
    </Shell>
  )
}
