import { Mail, Phone, Building2, HandHeart } from 'lucide-react'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SeoHead from '@/lib/seo/SeoHead'

export default function ContactPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Contact StreetRise"
        description="Reach StreetRise by email or phone — questions, listing corrections, or partnership inquiries."
        path="/contact"
      />

      <Section containerSize="prose" className="text-center">
        <SectionHeading
          eyebrow="Get in touch"
          title="Contact StreetRise"
          subtitle="Have a question, need to report an issue with a listing, or want to talk about a partnership? Reach us directly."
        />
      </Section>

      <Section tone="gray" containerSize="prose" className="pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="text-center">
            <Mail size={24} className="mx-auto mb-2 text-primary-600 dark:text-primary-400" />
            <p className="font-semibold text-slate-900 dark:text-white">Email</p>
            <a href="mailto:Info@streetrise.org" className="mt-1 block text-sm text-primary-600 hover:underline dark:text-primary-400">
              Info@streetrise.org
            </a>
          </Card>
          <Card className="text-center">
            <Phone size={24} className="mx-auto mb-2 text-primary-600 dark:text-primary-400" />
            <p className="font-semibold text-slate-900 dark:text-white">Phone</p>
            <a href="tel:8135864066" className="mt-1 block text-sm text-primary-600 hover:underline dark:text-primary-400">
              813-586-4066
            </a>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="flex items-start gap-3">
            <Building2 size={20} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Run a shelter, pantry, or clinic?</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">List your services for free.</p>
              <Button to="/provider/onboarding" size="sm" variant="secondary" className="mt-2">Become a Provider</Button>
            </div>
          </Card>
          <Card className="flex items-start gap-3">
            <HandHeart size={20} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Represent a business or foundation?</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Let's talk about partnering.</p>
              <Button to="/partner-with-us" size="sm" variant="secondary" className="mt-2">Partner With Us</Button>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
