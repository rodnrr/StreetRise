import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import SeoHead from '@/lib/seo/SeoHead'

export default function AccessibilityPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Accessibility Statement"
        description="StreetRise's commitment to WCAG 2.1 AA accessibility."
        path="/accessibility"
      />

      <Section containerSize="prose">
        <SectionHeading eyebrow="Legal" title="Accessibility Statement" align="left" />

        <div className="prose-sm space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            StreetRise is committed to making our platform usable by
            everyone, including people using assistive technology. We aim
            to meet WCAG 2.1 Level AA guidelines across the site.
          </p>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Ongoing work</h2>
          <p>
            Accessibility is an ongoing effort, not a one-time fix. If you
            encounter a barrier using StreetRise — a page that doesn't work
            with a screen reader, a color-contrast issue, or anything else —
            please tell us so we can fix it.
          </p>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Report an issue</h2>
          <p>
            Email <a href="mailto:Info@streetrise.org" className="text-primary-600 hover:underline dark:text-primary-400">Info@streetrise.org</a> or
            call <a href="tel:8135864066" className="text-primary-600 hover:underline dark:text-primary-400">813-586-4066</a>. Please
            include the page and what happened — we'll follow up directly.
          </p>
        </div>
      </Section>
    </div>
  )
}
