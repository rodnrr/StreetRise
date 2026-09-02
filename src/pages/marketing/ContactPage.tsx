import { Mail, Phone, Building2, HandHeart } from 'lucide-react'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SeoHead from '@/lib/seo/SeoHead'
import { useI18n } from '@/lib/i18n'

export default function ContactPage() {
  const { t } = useI18n()

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Contact StreetRise"
        description="Reach StreetRise by email or phone — questions, listing corrections, or partnership inquiries."
        path="/contact"
      />

      <Section containerSize="prose" className="text-center">
        <SectionHeading
          eyebrow={t('marketing.contact.eyebrow')}
          title={t('marketing.contact.title')}
          subtitle={t('marketing.contact.subtitle')}
        />
      </Section>

      <Section tone="gray" containerSize="prose" className="pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="text-center">
            <Mail size={24} className="mx-auto mb-2 text-primary-600 dark:text-primary-400" />
            <p className="font-semibold text-slate-900 dark:text-white">{t('marketing.contact.emailLabel')}</p>
            <a href="mailto:Info@streetrise.org" className="mt-1 block text-sm text-primary-600 hover:underline dark:text-primary-400">
              Info@streetrise.org
            </a>
          </Card>
          <Card className="text-center">
            <Phone size={24} className="mx-auto mb-2 text-primary-600 dark:text-primary-400" />
            <p className="font-semibold text-slate-900 dark:text-white">{t('marketing.contact.phoneLabel')}</p>
            <a href="tel:8135864066" className="mt-1 block text-sm text-primary-600 hover:underline dark:text-primary-400">
              813-586-4066
            </a>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="flex items-start gap-3">
            <Building2 size={20} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{t('marketing.contact.shelterQuestion')}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('marketing.contact.shelterDesc')}</p>
              <Button to="/provider/onboarding" size="sm" variant="secondary" className="mt-2">{t('marketing.contact.becomeProviderBtn')}</Button>
            </div>
          </Card>
          <Card className="flex items-start gap-3">
            <HandHeart size={20} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{t('marketing.contact.partnerQuestion')}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('marketing.contact.partnerDesc')}</p>
              <Button to="/partner-with-us" size="sm" variant="secondary" className="mt-2">{t('marketing.contact.partnerBtn')}</Button>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
