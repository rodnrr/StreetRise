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
import { useI18n, translate } from '@/lib/i18n'

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
  const { t, lang }  = useI18n()
  /** `translate` plus `{placeholder}` substitution, matching @/lib/resourceFaq's pattern. */
  const tv = (key: string, vars: Record<string, string> = {}) => {
    let s = translate(lang, key)
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v)
    return s
  }
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
      const msg = err instanceof ClaimError ? err.message : t('claim.detail.genericError')
      toast.error(t('claim.detail.toastNotSubmittedTitle'), msg)
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
        <h1 className="font-bold text-gray-900 mb-1">{t('claim.detail.notFoundTitle')}</h1>
        <p className="text-sm text-gray-500 mb-5">
          {t('claim.detail.notFoundBody')}
        </p>
        <Link to="/claim" className="btn-secondary btn-sm">{t('claim.detail.backToDirectory')}</Link>
      </div>
    </Shell>
  )

  // ── Submitted ──────────────────────────────────────────────────
  if (done) return (
    <Shell>
      <div className="text-center py-10">
        <CheckCircle size={52} className="text-success-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('claim.detail.submittedTitle')}</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          {t('claim.detail.submittedIntro')} <strong>{org.organization_name}</strong>.{' '}
          {t('claim.detail.submittedBody')} <strong>{contactEmail}</strong>{' '}
          {t('claim.detail.submittedSuffix')}
        </p>
        <div className="text-left rounded-2xl bg-gray-50 border border-gray-100 p-5 space-y-2.5 mb-6">
          <p className="text-sm font-semibold text-gray-900">{t('claim.detail.whileYouWaitTitle')}</p>
          <p className="text-sm text-gray-600">
            {t('claim.detail.whileYouWaitBody')}
          </p>
        </div>
        <button onClick={() => navigate('/portal/dashboard')} className="btn-primary">
          {t('claim.detail.goToPortal')}
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
          <ArrowLeft size={15} /> {t('claim.detail.backToDirectory')}
        </Link>
        <div className="card text-center py-10">
          {inReview
            ? <Clock size={44} className="text-amber-500 mx-auto mb-3" />
            : <ShieldCheck size={44} className="text-success-600 mx-auto mb-3" />}
          <h1 className="font-bold text-gray-900 mb-2">
            {inReview ? t('claim.detail.inReviewTitle') : t('claim.detail.alreadyClaimedTitle')}
          </h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {inReview
              ? <>{t('claim.detail.inReviewIntro')} <strong>{org.organization_name}</strong> {t('claim.detail.inReviewSuffix')}</>
              : <><strong>{org.organization_name}</strong> {t('claim.detail.alreadyClaimedSuffix')}</>}
            {' '}{t('claim.detail.mistakeNotice')}{' '}
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
        title={tv('claim.detail.seoTitle', { org: org.organization_name })}
        description={tv('claim.detail.seoDescription', { org: org.organization_name })}
        path={`/claim/${org.id}`}
      />

      <Link to="/claim" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={15} /> {t('claim.detail.backToDirectory')}
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
            <p className="text-xs text-gray-400 mt-0.5">{t('claim.detail.listedFromPublicInfo')}</p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          {([
            [t('claim.detail.labelContactEmail'), org.contact_email],
            [t('claim.detail.labelPhone'), org.contact_phone],
            [t('claim.detail.labelWebsite'), org.website],
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
          {t('claim.detail.wrongInfoNotice')}
        </p>
      </div>

      {/* Still asking Supabase who this is, or what they already own */}
      {(session === null || (!!session && ownedLoading)) && <div className="skeleton h-44 w-full" />}

      {/* Not signed in, or signed in only as far as localStorage is concerned */}
      {session === false && (
        <div className="card text-center py-8">
          <LogIn size={30} className="text-primary-600 mx-auto mb-3" />
          <h2 className="font-bold text-gray-900 mb-1.5">{t('claim.detail.signInTitle')}</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            {tv('claim.detail.signInBody', { org: org.organization_name.split(' ')[0] })}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link to={`/login?signup=1&next=/claim/${org.id}`} className="btn-primary">
              {t('claim.detail.createAccount')}
            </Link>
            <Link to={`/login?next=/claim/${org.id}`} className="btn-secondary">
              {t('claim.detail.signIn')}
            </Link>
          </div>
        </div>
      )}

      {/* Signed in, but this account already holds a different organization */}
      {session && ownedOrg && (
        <div className="card text-center py-8">
          <Building2 size={30} className="text-amber-500 mx-auto mb-3" />
          <h2 className="font-bold text-gray-900 mb-1.5">
            {t('claim.detail.alreadyOwnsTitle')}
          </h2>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto leading-relaxed">
            {t('claim.detail.alreadyOwnsIntro')} <strong>{session.email}</strong>,{' '}
            {t('claim.detail.alreadyOwnsManages')}{' '}
            <strong>{ownedOrg.organization_name}</strong>.{' '}
            {tv('claim.detail.alreadyOwnsExplain', {
              org: org.organization_name,
              orgFirst: org.organization_name.split(' ')[0],
            })}{' '}
            <a href="mailto:support@streetrise.org" className="text-primary-600 hover:underline">
              support@streetrise.org
            </a>{' '}
            {t('claim.detail.alreadyOwnsEmailSuffix')}
          </p>
          <button onClick={() => navigate('/portal/dashboard')} className="btn-secondary">
            {t('claim.detail.goToYourPortal')}
          </button>
        </div>
      )}

      {/* Signed in with a clean account — claim form */}
      {session && !ownedOrg && !ownedLoading && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="font-bold text-gray-900">{t('claim.detail.claimFormTitle')}</h2>

          <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
            <Mail size={15} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{t('claim.detail.claimingAs')}</p>
              <p className="text-sm font-medium text-gray-900 truncate">{session.email}</p>
            </div>
          </div>

          <div>
            <label htmlFor="claim-contact-email" className="label">{t('claim.detail.labelBestEmail')}</label>
            <input
              id="claim-contact-email"
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              onBlur={() => setContactTouched(true)}
              aria-invalid={showContactError}
              aria-describedby={showContactError ? 'claim-contact-email-error' : undefined}
              className={showContactError ? 'input-error' : 'input'}
              placeholder={t('claim.detail.placeholderEmail')}
            />
            {showContactError
              ? <p id="claim-contact-email-error" className="error-text">{t('claim.detail.errorInvalidEmail')}</p>
              : <p className="text-xs text-gray-400 mt-1">
                  {t('claim.detail.emailHelper')}
                </p>}
          </div>

          <div>
            <label htmlFor="claim-note" className="label">
              {tv('claim.detail.labelRole', { org: org.organization_name })}{' '}
              <span className="text-gray-400 font-normal">{t('claim.detail.labelRoleHelper')}</span>
            </label>
            <textarea
              id="claim-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              className="input min-h-[96px] resize-none"
              placeholder={t('claim.detail.placeholderRole')}
            />
            <p className="text-xs text-gray-400 mt-1">{note.length}/500</p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 space-y-1.5">
            <p className="text-xs font-semibold text-amber-900">{t('claim.detail.whatHappensNextTitle')}</p>
            <p className="text-xs text-amber-800 leading-relaxed">
              {t('claim.detail.whatHappensNextBody')}
            </p>
          </div>

          <button type="submit" disabled={submitting || !contactValid} className="btn-primary w-full">
            {submitting ? t('claim.detail.submitting') : t('claim.detail.submitClaim')}
          </button>
          <p className="text-xs text-gray-400 text-center">
            {t('claim.detail.authorizedNotice')}
          </p>
        </form>
      )}
    </Shell>
  )
}
