// ================================================================
// StreetRise — notify-claim
//
// Sends the emails around the provider claim flow (migrations 023–027,
// 033, 034):
//
//   submitted  → admin gets the claim to review, claimant gets a receipt
//   approved   → claimant is told they now have portal access
//   denied     → claimant is told, with the reviewer's reason if given
//
// ── Three rules this function is built around ────────────────────
//
// 1. It never trusts the caller's description of events. The request
//    carries only a claim id and an event name; every fact in the email
//    is re-read from the database with the service-role key.
//
// 2. It authorizes per event. A claimant may announce their own claim
//    and nothing else; only an admin may announce a decision. Without
//    this, any signed-in user could read back another person's claim
//    contact details by asking for an email about them.
//
// 3. It degrades instead of failing. A claim that succeeded must not be
//    reported as broken because email is misconfigured or Resend is
//    down, so every non-authorization problem returns 200 with
//    { sent: false, reason }. The caller treats this as best-effort.
//
// Required secret: RESEND_API_KEY. Optional overrides: CLAIM_ADMIN_EMAIL,
// CLAIM_FROM_EMAIL, APP_URL.
// ================================================================

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ADMIN_EMAIL = Deno.env.get('CLAIM_ADMIN_EMAIL') ?? 'info@streetrise.org'
const FROM_EMAIL  = Deno.env.get('CLAIM_FROM_EMAIL')  ?? 'StreetRise <notifications@streetrise.org>'
const APP_URL     = Deno.env.get('APP_URL')           ?? 'https://app.streetrise.org'
const RESEND_KEY  = Deno.env.get('RESEND_API_KEY')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ClaimEvent = 'submitted' | 'approved' | 'denied'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Claim notes and org names are user-supplied; they must not become markup. */
function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function layout(heading: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;
      box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-weight:800;color:#1a56db;font-size:15px;margin-bottom:20px">StreetRise</div>
      <h1 style="font-size:19px;margin:0 0 14px">${heading}</h1>
      ${bodyHtml}
      <p style="font-size:12px;color:#94a3b8;margin-top:26px;border-top:1px solid #e2e8f0;padding-top:14px">
        StreetRise — free local resources across Florida.<br>
        Questions? Reply to this email or write to
        <a href="mailto:info@streetrise.org" style="color:#1a56db">info@streetrise.org</a>.
      </p>
    </div></body></html>`
}

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return json({ error: 'method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // ── Identify the caller ──────────────────────────────────────
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401)

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  const caller = userData?.user
  if (userErr || !caller) return json({ error: 'unauthorized' }, 401)

  let body: { claimId?: string; event?: ClaimEvent }
  try { body = await req.json() } catch { return json({ error: 'bad request' }, 400) }

  const { claimId, event } = body
  if (!claimId || !event || !['submitted', 'approved', 'denied'].includes(event)) {
    return json({ error: 'bad request' }, 400)
  }

  // ── Re-read every fact from the database ─────────────────────
  const { data: claim } = await admin
    .from('provider_claims')
    .select('id, provider_id, user_id, claim_email, contact_email, claim_note, status, decision_note, submitted_notified_at, decision_notified_at')
    .eq('id', claimId)
    .maybeSingle()
  if (!claim) return json({ error: 'not found' }, 404)

  // ── Authorize per event ──────────────────────────────────────
  // Checked before anything is read back to the caller, so an
  // unauthorized request cannot be used to probe claim details.
  const { data: callerProvider } = await admin
    .from('providers')
    .select('role, verification_status')
    .eq('user_id', caller.id)
    .maybeSingle()
  const isAdmin =
    ['admin', 'super_admin'].includes(callerProvider?.role ?? '') &&
    callerProvider?.verification_status === 'verified'

  if (event === 'submitted') {
    if (claim.user_id !== caller.id) return json({ error: 'forbidden' }, 403)
  } else if (!isAdmin) {
    return json({ error: 'forbidden' }, 403)
  }

  // ── Idempotency ──────────────────────────────────────────────
  const stamp = event === 'submitted' ? 'submitted_notified_at' : 'decision_notified_at'
  if (claim[stamp as keyof typeof claim]) return json({ sent: false, reason: 'already_sent' })

  if (!RESEND_KEY) {
    console.warn('notify-claim: RESEND_API_KEY not set; skipping send for claim', claimId)
    return json({ sent: false, reason: 'not_configured' })
  }

  const { data: provider } = await admin
    .from('providers')
    .select('organization_name, contact_email, website')
    .eq('id', claim.provider_id)
    .maybeSingle()
  const orgName = provider?.organization_name ?? 'this organization'

  // Weak signal for the reviewer, computed from claim_email only —
  // contact_email is claimant-supplied and proves nothing.
  const claimDomain = claim.claim_email.split('@')[1]?.toLowerCase() ?? ''
  const orgDomain   = provider?.contact_email?.split('@')[1]?.toLowerCase() ?? ''
  const domainMatch =
    claimDomain && (claimDomain === orgDomain ||
      (provider?.website ?? '').toLowerCase().includes(claimDomain))

  try {
    if (event === 'submitted') {
      await sendEmail(
        ADMIN_EMAIL,
        `New claim to review: ${orgName}`,
        layout('A provider claimed their listing', `
          <p style="font-size:14px;line-height:1.6;margin:0 0 16px">
            <strong>${esc(orgName)}</strong> has been claimed and is waiting for review.
            The listing stays live and unchanged until you decide.
          </p>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#64748b">Account</td>
                <td style="padding:6px 0;text-align:right"><strong>${esc(claim.claim_email)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Contact at</td>
                <td style="padding:6px 0;text-align:right"><strong>${esc(claim.contact_email)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Org contact on file</td>
                <td style="padding:6px 0;text-align:right">${esc(provider?.contact_email ?? '—')}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Domain check</td>
                <td style="padding:6px 0;text-align:right">${domainMatch
                  ? '<span style="color:#16a34a">account domain matches the org</span>'
                  : '<span style="color:#b45309">no domain match — verify another way</span>'}</td></tr>
          </table>
          ${claim.claim_note ? `<p style="font-size:14px;background:#f8fafc;border-radius:10px;
            padding:12px;margin:16px 0;white-space:pre-wrap">“${esc(claim.claim_note)}”</p>` : ''}
          <p style="margin:22px 0 0">
            <a href="${APP_URL}/admin/providers" style="background:#1a56db;color:#fff;text-decoration:none;
              font-weight:600;font-size:14px;border-radius:10px;padding:11px 18px;display:inline-block">
              Review this claim</a>
          </p>
          <p style="font-size:12px;color:#94a3b8;margin-top:14px">
            A domain match is a hint, not proof. Approving hands over control of this
            organization's listings.
          </p>`),
        claim.contact_email,
      )

      await sendEmail(
        claim.contact_email,
        `We received your claim for ${orgName}`,
        layout('Your claim is being reviewed', `
          <p style="font-size:14px;line-height:1.6;margin:0 0 14px">
            Thanks — we've received your claim for <strong>${esc(orgName)}</strong>.
          </p>
          <p style="font-size:14px;line-height:1.6;margin:0 0 14px">
            A StreetRise staff member reviews every claim by hand, usually within
            1–2 business days. We may email you first if we need to confirm anything.
          </p>
          <p style="font-size:14px;line-height:1.6;margin:0 0 14px">
            The listing stays live and unchanged in the meantime, so people can still
            find help there. Once your claim is approved you'll be able to sign in and
            edit it yourself.
          </p>`),
      )
    }

    if (event === 'approved') {
      await sendEmail(
        claim.contact_email,
        `You now manage ${orgName} on StreetRise`,
        layout('Your claim was approved', `
          <p style="font-size:14px;line-height:1.6;margin:0 0 14px">
            Your claim for <strong>${esc(orgName)}</strong> has been approved. You can
            now sign in and manage the listing yourself.
          </p>
          <p style="font-size:14px;line-height:1.6;margin:0 0 14px">
            From the portal you can correct the details, update hours and availability,
            post work exchange opportunities, and respond to requests.
          </p>
          <p style="margin:22px 0 0">
            <a href="${APP_URL}/portal/dashboard" style="background:#1a56db;color:#fff;text-decoration:none;
              font-weight:600;font-size:14px;border-radius:10px;padding:11px 18px;display:inline-block">
              Open the provider portal</a>
          </p>`),
      )
    }

    if (event === 'denied') {
      await sendEmail(
        claim.contact_email,
        `About your claim for ${orgName}`,
        layout('We could not approve this claim', `
          <p style="font-size:14px;line-height:1.6;margin:0 0 14px">
            We weren't able to approve your claim for <strong>${esc(orgName)}</strong> right now.
          </p>
          ${claim.decision_note ? `<p style="font-size:14px;background:#f8fafc;border-radius:10px;
            padding:12px;margin:0 0 14px;white-space:pre-wrap">${esc(claim.decision_note)}</p>` : ''}
          <p style="font-size:14px;line-height:1.6;margin:0 0 14px">
            This usually means we couldn't confirm the connection between your account and
            the organization — often it just needs a work email address or a quick call.
            You're welcome to claim it again, and the listing stays available to claim.
          </p>
          <p style="font-size:14px;line-height:1.6;margin:0">
            If you think this is a mistake, reply to this email or write to
            <a href="mailto:info@streetrise.org" style="color:#1a56db">info@streetrise.org</a>
            and we'll sort it out.
          </p>`),
      )
    }
  } catch (e) {
    // Best effort: the claim itself already succeeded, so a mail failure is
    // logged for the operator but reported as a non-error to the caller.
    console.error('notify-claim send failed', claimId, event, e)
    return json({ sent: false, reason: 'send_failed' })
  }

  await admin.from('provider_claims')
    .update({ [stamp]: new Date().toISOString() })
    .eq('id', claimId)

  return json({ sent: true })
})
