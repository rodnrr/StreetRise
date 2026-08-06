# Auth setup — password reset and social sign-in

What ships in the code, and the dashboard configuration each part needs before
it works. All steps are web-UI only; nothing here needs a terminal.

| Feature | Works now? | Needs |
|---|---|---|
| Forgot password | **Yes**, but see the email warning | Redirect URL allow-listed; custom SMTP strongly recommended |
| Continue with Google | Button hidden until enabled | Google Cloud OAuth client → Supabase |
| Continue with Apple | Button hidden until enabled | Apple Developer membership → Supabase |

## Why the social buttons are invisible right now

`src/lib/auth.ts` asks Supabase which providers are actually turned on
(`GET /auth/v1/settings`) and renders only those. Enable Google in the Supabase
dashboard and the Google button appears on the next page load — no code change,
no redeploy.

This is deliberate: a "Continue with Apple" button that throws *"Unsupported
provider: provider is not enabled"* is worse than no button, especially on a
site people reach when they need help. The check fails closed — if the settings
request fails, no social buttons render and email/password still works.

## 1. Allow the redirect URLs (do this first — password reset needs it)

**Supabase dashboard → Authentication → URL Configuration**

- **Site URL:** `https://app.streetrise.org`
- **Redirect URLs** — add all of these:
  - `https://app.streetrise.org/reset-password`
  - `https://app.streetrise.org/auth/callback`
  - `http://localhost:5173/reset-password` *(local dev, optional)*
  - `http://localhost:5173/auth/callback` *(local dev, optional)*

A reset link that redirects somewhere not on this list is rejected by Supabase
and the user lands on an error instead of the reset form.

## 2. Password reset email — use Resend, not the built-in sender

Password reset uses Supabase's **Auth** mailer, which is separate from the
`notify-claim` function. Out of the box it uses Supabase's shared SMTP, which
is **rate-limited to a handful of messages per hour across the whole project**
and is intended for development only. Providers will hit that limit and simply
never receive the email, with no visible error.

Since Resend is already set up for claim notifications, point Auth at it too:

**Supabase dashboard → Project Settings → Authentication → SMTP Settings** →
enable custom SMTP:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email | an address on the domain verified in Resend |
| Sender name | `StreetRise` |

Until this is done, treat password reset as unreliable rather than broken.

## 3. Continue with Google

1. **Google Cloud console** → create/select a project → **APIs & Services →
   Credentials → Create OAuth client ID → Web application**.
2. Authorised redirect URI — copy the callback shown on Supabase's Google
   provider page. It looks like:
   `https://mldatfcwnmvrmxumzxyb.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret**.
4. **Supabase → Authentication → Providers → Google** → enable, paste both, save.

The button appears on the next load of `/login`.

## 4. Continue with Apple

Apple is more involved and **requires a paid Apple Developer Program
membership** (~$99/year). If you don't have one, enable Google now and come
back to this.

1. **developer.apple.com → Certificates, Identifiers & Profiles**
   - Register an **App ID**, enable *Sign in with Apple*.
   - Register a **Services ID** — this becomes the Client ID.
   - On the Services ID, configure *Sign in with Apple*:
     - Domain: `mldatfcwnmvrmxumzxyb.supabase.co`
     - Return URL: `https://mldatfcwnmvrmxumzxyb.supabase.co/auth/v1/callback`
   - Create a **Key** with *Sign in with Apple* enabled and download the `.p8`.
     Apple lets you download it **once**.
2. **Supabase → Authentication → Providers → Apple** → enable and fill in the
   Services ID, Team ID, Key ID, and the contents of the `.p8`.

Apple only returns a user's name on the *first* authorisation, and users may
choose to hide their real email behind a private relay address. The claim flow
tolerates this: `claim_email` is whatever Apple returns, and the claim form
asks separately for a `contact_email` the claimant actually reads.

## How the pieces fit

| Route | Purpose |
|---|---|
| `/login` | Email/password, plus any enabled social buttons |
| `/forgot-password` | Requests a reset link |
| `/reset-password` | Where the emailed link lands; sets the new password |
| `/auth/callback` | Where social sign-in returns; resolves the destination |

**None of these belong in `sitemap.xml`.**

Post-login routing lives in one place — `applySessionAndResolveDestination` in
`src/lib/auth.ts` — and is shared by the password form and the OAuth callback.
The rules (admins go to the admin panel, an explicit `?next=` wins, no
organization means finish onboarding) are subtle enough that two copies would
eventually disagree, and a claim link always carries an explicit `next` so
claimants are never diverted into registering a duplicate organization.

`/reset-password` accepts both link shapes Supabase can produce — an
implicit-flow token in the URL fragment and a PKCE `?code=` — so the reset
link keeps working if the project's auth flow is ever switched.

## Deliberate: no "account not found" message

`/forgot-password` shows the same confirmation whether or not the address has
an account. Saying "no account found" would let anyone check which
organizations' staff are registered here. Rate-limit errors *are* surfaced,
since the user can act on those by waiting.
