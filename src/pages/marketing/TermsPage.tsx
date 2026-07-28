import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import SeoHead from '@/lib/seo/SeoHead'

export default function TermsPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead title="Terms of Use" description="Terms for using the StreetRise platform." path="/terms" />

      <Section containerSize="prose">
        <SectionHeading eyebrow="Legal" title="Terms of Use" align="left" />

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <strong>Draft template.</strong> Has not been reviewed by an
          attorney — please have counsel review before treating it as
          binding.
        </div>

        <div className="prose-sm space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            StreetRise is a free tool to help locate shelter, food, and
            support services. Availability, hours, and eligibility are set
            by each listed provider and can change without notice — always
            call ahead to confirm before traveling to a location.
          </p>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Not a crisis line</h2>
          <p>
            StreetRise is not an emergency service. If you or someone else
            is in immediate danger, call 911 or the 988 Suicide &amp; Crisis
            Lifeline.
          </p>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Provider listings</h2>
          <p>
            Providers are responsible for the accuracy of their own listing
            information. StreetRise reviews submissions but cannot
            guarantee real-time accuracy for every service.
          </p>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Contact</h2>
          <p>
            Questions about these terms: <a href="mailto:Info@streetrise.org" className="text-primary-600 hover:underline dark:text-primary-400">Info@streetrise.org</a>.
          </p>
        </div>
      </Section>
    </div>
  )
}
