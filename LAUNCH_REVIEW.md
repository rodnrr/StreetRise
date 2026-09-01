# StreetRise Pre-Debut Launch Review
*app.streetrise.org — April 2026*

> **2026-09-01 note:** this document's "streetrise.org vs app.streetrise.org" split (separate Wix marketing site vs. this app) no longer reflects reality. `streetrise.org` now redirects to `app.streetrise.org` and the marketing content it describes as living on streetrise.org has been migrated into this repo (`src/pages/marketing/`). See `CLAUDE.md` → Mission & Domain Split for current state. Kept here unedited otherwise, as a historical record of what shipped and why.

---

## How Close Is StreetRise to Debut?

**Closer than it looks — but not quite there yet.**

The core product is structurally sound. The map works. The booking flow writes real data to Supabase. The donation flow is fully wired to Stripe with verified products and price IDs. Provider onboarding exists at a real route. Verification badges reflect the actual two-tier model. The Work Exchange no longer has dead Apply buttons.

What is missing is the connective tissue a first visitor needs to trust the product and know how to participate: there is no footer, no visible contact information, no way to become a provider without already knowing to look for "Provider Login," and a handful of copy lines that still overstate things that haven't been fully confirmed.

The fixes below are small and safe. None require architecture changes.

---

## Shortcomings: Must Fix Before Commit

### 1. No footer — no contact info anywhere in the app
The public app has no footer. There is no place a visitor, potential provider, or donor can find a phone number or support email. This is a trust and credibility gap at debut.

- **Contact to add everywhere appropriate:** `Support@StreetRise.Org` / `813-586-4066`

### 2. Provider onboarding is invisible from the public side
The route `/provider/onboarding` exists and is fully built (`ProviderLandingPage.tsx`). But the only nav entry is "Provider Login" — which sends a new, unauthenticated organization to the login screen with no explanation of how to join. There is no "Become a Provider" path visible.

### 3. "Partner with us" CTA on streetrise.org leads to 404
The marketing site at `streetrise.org` has a "Partner with us" button that routes to `https://app.streetrise.org/404`. The correct destination is `https://app.streetrise.org/provider/onboarding`. **This is a streetrise.org fix — see flags section.**

### 4. `public/sitemap.xml` has wrong routes
- `/login` is indexed — login pages should never be in a sitemap (no SEO value, signals incomplete product to crawlers)
- `/provider/onboarding` is missing — it is a public-facing page and should be indexed

### 5. `ProviderLandingPage.tsx` overstates verification
The trust block says: *"Every provider is manually verified."* This is not accurate — Community Listed providers are publicly submitted and unverified. The same false claim was fixed on the homepage and in ResourceCard. It needs the same treatment here.

### 6. `DonatePage.tsx` still says "real-time shelter data flowing"
The homepage donate blurb was corrected in an earlier pass, but `DonatePage.tsx` itself still reads: *"Your donation keeps real-time shelter data flowing."* This overpromises on a feature that is only partially true (verified providers update in real time; community listings do not).

### 7. `BookingPage.tsx` success screen overpromises response time
After submitting a request, users see: *"Average response time: under 2 hours."* This cannot be guaranteed at launch and sets a false expectation before any providers are live and active.

---

## Terminology: Resource vs Provider

The data model already has this right — a `Resource` is a service listing, a `Provider` is the organization. The public-facing copy largely respects this already:

- "Find Resources" in the nav → correct (users seek resources)
- "X resources nearby" on the map → acceptable user-facing shorthand
- "Provider Login" in the nav → correct
- `ProviderLandingPage` uses "provider" throughout → correct

The one gap is **discoverability**: "Provider Login" implies you already have an account. New organizations need a clear "Become a Provider" or "List Your Organization" entry point that doesn't assume they already signed up. This is fixed by adding it to the footer and nav.

No URL path changes are recommended (renaming `/resources/:id` would break links and add risk with no user-facing benefit).

---

## Patch Plan (Ordered by Risk and Impact)

1. **`public/sitemap.xml`** — Remove `/login`. Add `/provider/onboarding`. (1-minute edit, zero risk.)
2. **`DonatePage.tsx`** — Fix "real-time shelter data flowing" copy. (1-line edit.)
3. **`BookingPage.tsx`** — Soften "Average response time: under 2 hours" to an honest expectation. (1-line edit.)
4. **`ProviderLandingPage.tsx`** — Fix "Every provider is manually verified" to reflect the two-tier badge model. (Consistent with earlier homepage fix.)
5. **Create `src/components/shared/Footer.tsx`** — Minimal footer with contact info, copyright, and "Become a Provider" link. Hide on map page (same pattern as the header).
6. **`RootLayout.tsx`** — Import and render Footer. Add "Become a Provider" as a secondary link in the desktop nav and mobile menu.

---

## streetrise.org vs app.streetrise.org Flags

| Item | Where to fix |
|---|---|
| "Partner with us" CTA → 404 | **streetrise.org** — update button href to `https://app.streetrise.org/provider/onboarding` |
| Contact info (phone + email) | **Both** — app footer (fixed here) + streetrise.org contact/footer |
| About / mission content | **streetrise.org** — belongs on the marketing site, not the app |
| Donation context ("why we need support") | **streetrise.org** — deeper storytelling lives there; app donate page stays transactional |
| Provider trust story / why join StreetRise | **streetrise.org** — ProviderLandingPage in the app is the destination, not the story |

---

## Code Edits

All edits below were applied to the repository. See individual file diffs for details.

### Files changed
- `public/sitemap.xml` — corrected routes
- `src/pages/DonatePage.tsx` — copy fix
- `src/pages/BookingPage.tsx` — softened response time claim
- `src/pages/ProviderLandingPage.tsx` — verification trust block corrected
- `src/components/shared/Footer.tsx` — new file
- `src/components/shared/RootLayout.tsx` — Footer wired in, "Become a Provider" added to nav
