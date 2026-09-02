import { Link } from 'react-router-dom'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import SeoHead from '@/lib/seo/SeoHead'
import { useI18n } from '@/lib/i18n'

const LAST_UPDATED_DATE = new Date(2026, 7, 26) // August 26, 2026

// The body below is intentionally NOT translated: it is formal, legally
// consequential text (data handling, retention, disclosure) that has not been
// confirmed as attorney-reviewed even in its English original (see
// CLAUDE.md's Known Open Items). Machine-translating liability-sensitive
// legal prose without review risks a translation that doesn't match the
// English original's actual legal meaning, which is worse than leaving it
// untranslated with a clear notice. Only the page chrome (heading, date,
// notice) is localized. The body is explicitly marked lang="en" so a screen
// reader in Spanish mode still pronounces it with English rules (WCAG 2.2
// Language of Parts) instead of misreading it as Spanish.
export default function PrivacyPage() {
  const { t, lang } = useI18n()
  const lastUpdated = LAST_UPDATED_DATE.toLocaleDateString(lang === 'es' ? 'es' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Privacy Policy"
        description="How StreetRise handles and protects personal information."
        path="/privacy"
      />

      <Section containerSize="prose">
        <article>
          <SectionHeading
            eyebrow={t('marketing.legal.eyebrow')}
            title={t('marketing.legal.privacyTitle')}
            align="left"
          />

          <p className="mb-4 text-xs text-slate-400">
            {t('marketing.legal.lastUpdated').replace('{date}', lastUpdated)}
          </p>

          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">{t('marketing.legal.englishOnlyNotice')}</p>
            <p className="mt-1">
              <Link to="/contact" className="font-medium underline hover:no-underline">
                {t('marketing.legal.contactUs')}
              </Link>
            </p>
          </div>

          <div lang="en" className="prose-sm space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              StreetRise (“StreetRise,” “we,” “us,” or “our”) helps people
              find and contact organizations that provide shelter, food,
              medical care, legal assistance, and other support services.
              This policy explains what information we handle, why we use it,
              and the choices available to you.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Information we collect
            </h2>

            <h3 className="font-semibold text-slate-900 dark:text-white">
              Searching for services
            </h3>
            <p>
              You do not need an account to search, filter, or view service
              listings. If you allow location access, StreetRise uses your
              location to show nearby resources and sort results by distance.
              You can deny location access and search using an address or ZIP
              code instead.
            </p>
            <p>
              StreetRise may remember settings such as search filters on your
              device. When you use the platform, we and the companies that
              support its operation may also receive technical information
              such as your IP address, browser or device type, access times,
              requested pages, and security or error records.
            </p>

            <h3 className="font-semibold text-slate-900 dark:text-white">
              Requesting help or contacting an organization
            </h3>
            <p>
              If you submit a request, we collect the information needed to
              deliver it to the organization you select. This may include your
              name, email address, phone number, preferred contact method and
              time, requested dates, number of people needing assistance, and
              any information you include in your message.
            </p>
            <p>
              A request may reveal sensitive circumstances, including
              information about housing, health, disability, family status,
              or personal safety. Please provide only the information
              reasonably necessary for the organization to respond.
            </p>

            <h3 className="font-semibold text-slate-900 dark:text-white">
              Provider and administrative accounts
            </h3>
            <p>
              People who create or manage provider accounts may give us
              contact information, account information, and details about
              their organization and services. Authentication providers
              handle the credentials needed to sign in. If you choose a
              third-party sign-in option, that provider may give us basic
              profile information such as your name and email address.
            </p>
            <p>
              We also retain messages and account activity needed to operate
              accounts, provide support, moderate content, and protect the
              platform.
            </p>

            <h3 className="font-semibold text-slate-900 dark:text-white">
              Donations
            </h3>
            <p>
              Donations are handled by a payment processor. StreetRise does
              not receive your complete payment-card number. We may receive
              information needed to document and administer a donation, such
              as the amount, date, payment status, transaction identifier,
              donation frequency, and contact information provided for a
              receipt.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              How we use information
            </h2>
            <p>We use information to:</p>

            <ul className="list-disc space-y-1 pl-5">
              <li>Provide search, mapping, and resource-discovery features.</li>
              <li>
                Deliver requests and messages to the organization you select.
              </li>
              <li>Create, authenticate, and administer authorized accounts.</li>
              <li>Process donations and provide receipts.</li>
              <li>Respond to questions and provide support.</li>
              <li>
                Maintain reliability, prevent abuse, and protect users,
                organizations, and StreetRise.
              </li>
              <li>Comply with legal obligations and enforce our policies.</li>
            </ul>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Location information
            </h2>
            <p>
              When you enable device location, it is used to help identify
              nearby resources. StreetRise does not use location information
              to track your movements or create an advertising profile.
              Mapping and network providers may receive technical information
              needed to return maps or search results, such as an IP address,
              general request information, or an address you search for.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              When we disclose information
            </h2>
            <p>We may disclose information:</p>

            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>To the organization you contact.</strong> Information
                in your request is delivered to that organization so it can
                respond.
              </li>
              <li>
                <strong>To companies that help operate StreetRise.</strong>{' '}
                These companies support functions such as hosting, data
                storage, authentication, communications, mapping, security,
                and payment processing.
              </li>
              <li>
                <strong>For legal or safety reasons.</strong> We may disclose
                information when reasonably necessary to comply with law,
                respond to legal process, prevent fraud or abuse, or protect
                someone’s rights, safety, or property.
              </li>
              <li>
                <strong>At your direction.</strong> We may disclose
                information when you ask us to or give us permission.
              </li>
              <li>
                <strong>If StreetRise changes ownership or structure.</strong>{' '}
                Information may be transferred as part of a merger,
                reorganization, financing, or transfer of the service,
                subject to applicable law.
              </li>
            </ul>

            <p>
              Organizations listed on StreetRise may be independently operated.
              Once an organization receives your request, its own privacy
              practices may apply. StreetRise does not control how an
              independent organization handles information outside the
              platform.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Cookies and device storage
            </h2>
            <p>
              StreetRise uses cookies, browser storage, and similar
              technologies needed to keep accounts signed in, remember
              preferences, protect the platform, and support site
              functionality. We do not use this information for targeted
              advertising. You can control browser storage through your
              browser or device settings, although disabling it may prevent
              some features from working.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              What we do not do
            </h2>
            <p>
              We do not sell personal information, disclose it to data
              brokers, or use it for targeted advertising. We do not require
              an account or identity verification merely to search for
              services.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Retention
            </h2>
            <p>
              We retain information only for as long as reasonably necessary
              for the purposes described in this policy. The retention period
              depends on the type and sensitivity of the information, the
              reason it was collected, operational and security needs, and
              applicable legal requirements.
            </p>
            <p>
              For example, account information may be retained while an
              account remains active, while request and message records may be
              retained to support service delivery, safety, dispute
              resolution, and accurate provider records. Donation records may
              be retained for accounting and legal purposes. Information that
              is no longer required is deleted or deidentified, subject to
              applicable backup, fraud-prevention, and legal-retention
              processes.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Security
            </h2>
            <p>
              We use reasonable administrative, technical, and organizational
              safeguards designed to protect personal information. No online
              system can guarantee complete security, so please avoid
              including unnecessary sensitive information in requests or
              ordinary email.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Your choices and privacy requests
            </h2>
            <p>
              You may disable location access, clear information stored by
              your browser, or choose not to submit an optional request.
              You may also contact us to ask about, access, correct, or delete
              personal information associated with you.
            </p>
            <p>
              We may need to verify your identity before completing a request.
              Some information may be retained where permitted or required for
              security, fraud prevention, financial recordkeeping, legal
              compliance, or the establishment or defense of legal claims.
              Information already received by an independent organization may
              need to be requested from that organization directly.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Children’s privacy
            </h2>
            <p>
              StreetRise is a general-audience service and is not intended for
              children under 13 to submit personal information on their own.
              A parent, guardian, or other authorized adult should submit a
              request on behalf of a child under 13.
            </p>
            <p>
              If we learn that we collected personal information directly
              from a child under 13 without authorization required by law, we
              will take appropriate steps to delete it. A parent or guardian
              who believes a child submitted information directly may contact
              us using the details below.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Changes to this policy
            </h2>
            <p>
              We may update this policy as StreetRise or applicable
              requirements change. We will update the date above and provide
              additional notice when a change materially affects how personal
              information is handled or when otherwise required by law.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Contact
            </h2>
            <p>
              To ask a privacy question or submit a privacy request, contact
              StreetRise at{' '}
              <a
                href="mailto:info@streetrise.org"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                info@streetrise.org
              </a>{' '}
              or call{' '}
              <a
                href="tel:+18135864066"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                (813) 586-4066
              </a>
              .
            </p>
          </div>
        </article>
      </Section>
    </div>
  )
}