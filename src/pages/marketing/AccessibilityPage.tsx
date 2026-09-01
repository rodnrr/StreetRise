import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import SeoHead from '@/lib/seo/SeoHead'

const LAST_UPDATED = 'August 26, 2026'

export default function AccessibilityPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Accessibility Statement"
        description="StreetRise’s accessibility commitment and how to request assistance."
        path="/accessibility"
      />

      <Section containerSize="prose">
        <article>
          <SectionHeading
            eyebrow="Accessibility"
            title="Accessibility Statement"
            align="left"
          />

          <p className="mb-6 text-xs text-slate-400">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="prose-sm space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              StreetRise helps people find shelter, food, medical care, legal
              assistance, and other support services. We are committed to
              making the Platform usable by people with disabilities and to
              providing reasonable alternative access when a digital barrier
              prevents someone from using it.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Our accessibility goal
            </h2>

            <p>
              StreetRise is working toward conformance with the Web Content
              Accessibility Guidelines (WCAG) 2.2 Level AA. These guidelines
              explain how to make digital content more accessible to people
              with visual, hearing, mobility, cognitive, speech, and other
              disabilities.
            </p>

            <p>
              Accessibility work is ongoing. We have not completed a
              comprehensive independent evaluation of every page and workflow,
              so this statement should not be understood as a certification
              that the entire Platform currently conforms to WCAG 2.2 Level
              AA.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Measures we take
            </h2>

            <p>
              Our accessibility work includes efforts to provide:
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>Keyboard access to navigation, forms, and controls.</li>
              <li>Visible focus indicators for interactive elements.</li>
              <li>
                Clear headings, labels, instructions, and error messages.
              </li>
              <li>
                Page structure and status information that assistive
                technologies can understand.
              </li>
              <li>
                Readable text, sufficient color contrast, and layouts that
                support zoom and different screen sizes.
              </li>
              <li>
                Text or list-based access to resource information presented
                visually on a map.
              </li>
              <li>
                A combination of automated review, keyboard testing, and
                assistive-technology testing as the Platform develops.
              </li>
            </ul>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Known limitations
            </h2>

            <p>
              Some parts of StreetRise may not yet provide an equally effective
              experience for every user. In particular:
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>
                Interactive maps may be difficult to operate or interpret with
                some assistive technologies. Resource information is also
                provided in a list-based format.
              </li>
              <li>
                Some provider and administrative workflows are still being
                reviewed for keyboard navigation, focus management, form
                feedback, and screen-reader support.
              </li>
              <li>
                Content or websites operated by independent organizations may
                not meet the same accessibility goals as StreetRise.
              </li>
            </ul>

            <p>
              We are working to identify and address barriers, prioritizing
              problems that prevent people from finding or requesting
              essential services.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Alternative access and assistance
            </h2>

            <p>
              If an accessibility barrier prevents you from finding
              information or completing a supported action, contact us. We
              will make a reasonable effort to provide the information or
              assistance through an available alternative method.
            </p>

            <p>
              Call{' '}
              <a
                href="tel:+18135864066"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                (813) 586-4066
              </a>{' '}
              or email{' '}
              <a
                href="mailto:info@streetrise.org"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                info@streetrise.org
              </a>
              .
            </p>

            <p>
              This contact information is for accessibility assistance and
              general support. It is not an emergency line and may not be
              monitored continuously.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Report an accessibility problem
            </h2>

            <p>
              We welcome reports about accessibility barriers. When
              contacting us, it is helpful—but not required—to include:
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>The page or feature you were trying to use.</li>
              <li>What you were trying to accomplish.</li>
              <li>A description of the problem.</li>
              <li>
                Your browser, device, or assistive technology, if relevant.
              </li>
              <li>Your preferred way for us to respond.</li>
            </ul>

            <p>
              You do not need to disclose a disability or provide sensitive
              personal information when reporting a problem. We will review
              reports, prioritize barriers affecting access to essential
              services, and follow up when contact information is provided.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Third-party content
            </h2>

            <p>
              StreetRise may link to websites or content operated by
              independent organizations. We do not control the accessibility
              of those external services. If an external resource creates a
              barrier, you may still report it to us so we can consider
              whether an accessible alternative is available.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Updates to this statement
            </h2>

            <p>
              We may update this statement as accessibility work continues,
              Platform features change, or accessibility standards evolve.
              The date above identifies the latest revision.
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Contact
            </h2>

            <p>
              Accessibility questions and requests may be sent to{' '}
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