import { Link } from 'react-router-dom'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import SeoHead from '@/lib/seo/SeoHead'
import { useI18n } from '@/lib/i18n'

const LAST_UPDATED_DATE = new Date(2026, 7, 26) // August 26, 2026

// The body below is intentionally NOT translated: it is formal, legally
// consequential text (warranty disclaimers, liability limits, acceptable use)
// that has not been confirmed as attorney-reviewed even in its English
// original (see CLAUDE.md's Known Open Items). Machine-translating
// liability-sensitive legal prose without review risks a translation that
// doesn't match the English original's actual legal meaning, which is worse
// than leaving it untranslated with a clear notice. Only the page chrome
// (heading, date, notice) is localized. The body is explicitly marked
// lang="en" so a screen reader in Spanish mode still pronounces it with
// English rules (WCAG 2.2 Language of Parts) instead of misreading it as
// Spanish.
export default function TermsPage() {
  const { t, lang } = useI18n()
  const lastUpdated = LAST_UPDATED_DATE.toLocaleDateString(lang === 'es' ? 'es' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Terms of Use"
        description="Terms governing use of the StreetRise platform."
        path="/terms"
      />

      <Section containerSize="prose">
        <article>
          <SectionHeading
            eyebrow={t('marketing.legal.eyebrow')}
            title={t('marketing.legal.termsTitle')}
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
              These Terms of Use (“Terms”) govern your access to and use of
              StreetRise, including its website, applications, listings,
              messaging features, and related services (collectively, the
              “Platform”).
            </p>

            <p>
              By accessing or using the Platform, you agree to these Terms.
              If you use the Platform on behalf of an organization, you
              confirm that you have authority to accept these Terms for that
              organization. If you do not agree, do not use the Platform.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              What StreetRise provides
            </h2>

            <p>
              StreetRise helps people find and contact independent
              organizations offering shelter, food, medical care, legal
              assistance, and other support services. It also allows
              organizations to publish and manage information about their
              services.
            </p>

            <p>
              StreetRise is an information and communication platform. Unless
              expressly stated otherwise, StreetRise does not provide,
              supervise, endorse, or control the services offered by listed
              organizations. Those organizations are independently
              responsible for their services, eligibility requirements,
              availability, decisions, conduct, and compliance with applicable
              law.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Emergencies and urgent situations
            </h2>

            <p>
              StreetRise is not an emergency service or crisis-response
              service. Requests and messages submitted through the Platform
              are not monitored continuously, and submitting one does not
              guarantee a response, reservation, placement, appointment, or
              service.
            </p>

            <p>
              If you or someone else is in immediate danger or experiencing a
              medical emergency, call 911 or go to the nearest emergency
              department. For mental health, suicide, or substance-use crisis
              support in the United States, call or text 988.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Eligibility
            </h2>

            <p>
              You may browse public resource information without creating an
              account. To create or control an organization account, claim a
              listing, or make commitments on behalf of an organization, you
              must have the legal capacity and authority to do so.
            </p>

            <p>
              If you are under the age of majority where you live, you should
              use the Platform with the involvement of a parent or legal
              guardian. Children under 13 may not submit personal information
              directly through the Platform. A parent, guardian, or other
              authorized adult should submit a request on their behalf.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Acceptable use
            </h2>

            <p>
              You agree to use the Platform lawfully and in a way that does
              not harm other people, listed organizations, or StreetRise. You
              may not:
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>Submit information that you know is false or misleading.</li>
              <li>
                Impersonate another person or organization, or falsely claim
                authority to represent one.
              </li>
              <li>
                Harass, threaten, exploit, discriminate against, or endanger
                another person.
              </li>
              <li>
                Use requests or messages for spam, advertising, solicitation,
                fraud, or another unrelated purpose.
              </li>
              <li>
                Attempt to access another person’s account or information
                without authorization.
              </li>
              <li>
                Introduce malicious code, interfere with the Platform, evade
                security controls, or test vulnerabilities without written
                authorization.
              </li>
              <li>
                Collect, scrape, copy, or redistribute Platform data through
                automated means without permission.
              </li>
              <li>
                Use the Platform in a way that violates applicable law or the
                rights of another person.
              </li>
            </ul>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Requests for assistance
            </h2>

            <p>
              You are responsible for providing accurate contact and request
              information. Please provide only the information reasonably
              necessary for the selected organization to understand and
              respond to your request.
            </p>

            <p>
              Sending a request does not create a contract between you and
              StreetRise, guarantee that an organization will respond, or
              establish that you qualify for a particular service. Any
              services ultimately provided are arranged directly between you
              and the organization.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Organization accounts and listings
            </h2>

            <p>
              Anyone creating or managing an organization account or listing
              represents that they are authorized to do so. Organizations are
              responsible for:
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>Keeping their account secure.</li>
              <li>
                Maintaining accurate and current service, location, contact,
                eligibility, availability, and accessibility information.
              </li>
              <li>
                Responding appropriately to information received through the
                Platform.
              </li>
              <li>
                Using request information only for legitimate service,
                communication, safety, and recordkeeping purposes.
              </li>
              <li>
                Maintaining any licenses, approvals, insurance, policies, or
                professional qualifications required for their services.
              </li>
              <li>
                Complying with applicable privacy, nondiscrimination,
                consumer-protection, professional, and safety requirements.
              </li>
            </ul>

            <p>
              Organizations must not represent that StreetRise sponsors,
              certifies, controls, or guarantees their services unless
              StreetRise has expressly agreed to that representation in
              writing.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Listing claims and verification
            </h2>

            <p>
              Some listings may be created from information supplied by the
              community, an organization, or publicly available sources. A
              person claiming or managing a listing must have authority to
              represent the listed organization.
            </p>

            <p>
              StreetRise may review listings or request evidence of identity,
              affiliation, or authority. A verification label indicates only
              the type of review performed at that time. It is not an
              endorsement, accreditation, background check, or guarantee of
              quality, safety, availability, licensing, or current accuracy.
            </p>

            <p>
              Users should confirm important details directly with an
              organization before relying on a listing or traveling to a
              location.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Information and content you provide
            </h2>

            <p>
              You retain any ownership rights you have in information or
              content you submit. You give StreetRise permission to host,
              store, format, reproduce, display, and transmit that content
              only as reasonably necessary to operate, secure, improve, and
              provide the Platform.
            </p>

            <p>
              Public listing information may be displayed to Platform users.
              Private requests and messages are handled as described in our{' '}
              <a
                href="/privacy"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                Privacy Policy
              </a>
              .
            </p>

            <p>
              You represent that you have the rights and permissions needed
              to submit your content and that doing so does not violate
              another person’s rights or applicable law.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              StreetRise materials
            </h2>

            <p>
              The Platform’s software, design, branding, organization, and
              original materials are owned by StreetRise or its licensors and
              are protected by applicable intellectual-property laws. These
              Terms do not grant you ownership of those materials.
            </p>

            <p>
              You may use the Platform for its intended personal,
              organizational, and community-service purposes. You may not
              copy, sell, license, reverse engineer, or commercially exploit
              protected Platform materials except where permitted by law or
              authorized in writing.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Donations
            </h2>

            <p>
              Donations are voluntary and are processed through an independent
              payment provider. Unless stated otherwise, a donation does not
              purchase goods or services and does not give the donor control
              over StreetRise operations.
            </p>

            <p>
              Donations are generally final. If you believe a donation was
              made by mistake or without authorization, contact us promptly.
              Any refund is subject to applicable law, payment-provider rules,
              and the circumstances of the transaction.
            </p>

            <p>
              StreetRise will describe the tax treatment of donations based
              on its current legal status. A receipt does not by itself
              establish that a donation is tax-deductible. Donors are
              responsible for obtaining their own tax advice.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Privacy
            </h2>

            <p>
              Our{' '}
              <a
                href="/privacy"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                Privacy Policy
              </a>{' '}
              explains how StreetRise handles personal information. By using
              the Platform, you acknowledge that information will be handled
              as described in that policy.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Third-party organizations and services
            </h2>

            <p>
              The Platform may contain information, links, maps, or services
              supplied by independent organizations. StreetRise does not
              control those parties and is not responsible for their content,
              availability, privacy practices, security, or conduct.
            </p>

            <p>
              Your interactions or agreements with an independent
              organization are between you and that organization. Separate
              terms or policies may apply.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Moderation, suspension, and removal
            </h2>

            <p>
              StreetRise may investigate suspected misuse and may correct or
              remove content, restrict submissions, suspend an account, remove
              a listing, or terminate access when reasonably necessary to
              protect users, preserve Platform integrity, respond to legal
              obligations, or enforce these Terms.
            </p>

            <p>
              StreetRise may act without advance notice when immediate action
              is reasonably necessary for safety, security, fraud prevention,
              or legal compliance. Where appropriate, an affected account
              holder may contact us to request review of a decision.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Platform availability and changes
            </h2>

            <p>
              We may add, change, suspend, or discontinue Platform features.
              We do not guarantee uninterrupted access, preservation of every
              feature, or compatibility with every device. We will provide
              notice when reasonably practicable if a change materially
              affects account holders.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              No professional advice
            </h2>

            <p>
              Information available through StreetRise is provided for
              general resource-discovery purposes. It is not medical, legal,
              financial, mental-health, or other professional advice and
              should not be treated as a substitute for advice from a
              qualified professional.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Disclaimer of warranties
            </h2>

            <p>
              To the fullest extent permitted by law, the Platform is
              provided “as is” and “as available.” StreetRise does not warrant
              that the Platform or any listing will be complete, current,
              accurate, uninterrupted, secure, error-free, or suitable for a
              particular need.
            </p>

            <p>
              StreetRise does not guarantee that a listed organization will
              respond, have availability, determine that someone is eligible,
              provide a particular outcome, or deliver services safely or
              satisfactorily. Nothing in these Terms excludes a warranty or
              right that cannot legally be excluded.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Limitation of responsibility
            </h2>

            <p>
              To the fullest extent permitted by law, StreetRise is not
              responsible for the acts, omissions, eligibility decisions,
              services, advice, or conduct of independent organizations or
              other users.
            </p>

            <p>
              StreetRise will not be liable for indirect, incidental,
              special, consequential, or punitive damages arising from use of
              or inability to use the Platform. These limitations do not
              apply where prohibited by law or to liability that cannot
              legally be limited.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Changes to these Terms
            </h2>

            <p>
              We may update these Terms as the Platform or applicable
              requirements change. We will revise the date above and provide
              additional notice when a change materially affects account
              holders or when otherwise required by law.
            </p>

            <p>
              Changes apply prospectively from their effective date. Your
              continued use of the Platform after that date constitutes
              acceptance of the revised Terms.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              General terms
            </h2>

            <p>
              If any provision of these Terms is found unenforceable, the
              remaining provisions will remain in effect. A failure to enforce
              a provision is not a waiver of the right to enforce it later.
              These Terms and the Privacy Policy constitute the agreement
              between you and StreetRise regarding use of the Platform unless
              a separate written agreement applies.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Contact
            </h2>

            <p>
              Questions about these Terms may be sent to{' '}
              <a
                href="mailto:info@streetrise.org"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                info@streetrise.org
              </a>{' '}
              or{' '}
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