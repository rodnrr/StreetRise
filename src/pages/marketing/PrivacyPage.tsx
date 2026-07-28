import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import SeoHead from '@/lib/seo/SeoHead'

export default function PrivacyPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead title="Privacy Policy" description="How StreetRise collects and uses information." path="/privacy" />

      <Section containerSize="prose">
        <SectionHeading eyebrow="Legal" title="Privacy Policy" align="left" />

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <strong>Draft template.</strong> This page describes what StreetRise
          collects today in plain language. It has not been reviewed by an
          attorney — please have counsel review before treating it as your
          official policy.
        </div>

        <div className="prose-sm space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            StreetRise ("we," "us") operates app.streetrise.org to help
            people find shelter, food, and support services. This policy
            explains what information we collect and how we use it.
          </p>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">What we collect</h2>
          <p>
            Anyone can browse and search the map without creating an account
            or providing personal information. If you create a provider or
            admin account, we collect the organization and contact details
            you provide. If you submit a booking or resource request, we
            collect what's needed to connect you with that provider.
          </p>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">What we don't do</h2>
          <p>
            We do not sell personal information. We do not require identity
            verification to search for help.
          </p>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Contact</h2>
          <p>
            Questions about this policy or a request to review/delete your
            data: <a href="mailto:Info@streetrise.org" className="text-primary-600 hover:underline dark:text-primary-400">Info@streetrise.org</a>.
          </p>
        </div>
      </Section>
    </div>
  )
}
