import { Users2, Building2, HandCoins } from 'lucide-react'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'
import { useI18n } from '@/lib/i18n'

export default function PartnersPage() {
  const { t } = useI18n()

  const WAYS_TO_PARTNER = [
    {
      icon: Building2,
      title: t('marketing.partners.way1Title'),
      description: t('marketing.partners.way1Desc'),
    },
    {
      icon: Users2,
      title: t('marketing.partners.way2Title'),
      description: t('marketing.partners.way2Desc'),
    },
    {
      icon: HandCoins,
      title: t('marketing.partners.way3Title'),
      description: t('marketing.partners.way3Desc'),
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Partner With Us"
        description="StreetRise partners with foundations, businesses, and community organizations to expand real-time resource access across Florida."
        path="/partner-with-us"
      />

      <Section containerSize="prose" className="text-center">
        <SectionHeading
          eyebrow={t('marketing.partners.eyebrow')}
          title={t('marketing.partners.title')}
          subtitle={t('marketing.partners.subtitle')}
        />
      </Section>

      <Section tone="gray" containerSize="wide" className="pt-0">
        <div className="grid gap-4 md:grid-cols-3">
          {WAYS_TO_PARTNER.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex items-start gap-4">
              <Icon size={22} className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section containerSize="prose">
        <SectionHeading title={t('marketing.partners.currentPartnersTitle')} align="left" />
        <EmptyState
          icon={Users2}
          title={t('marketing.partners.emptyTitle')}
          description={t('marketing.partners.emptyDesc')}
        />
      </Section>

      <Section tone="primary" containerSize="prose" className="text-center">
        <SectionHeading title={t('marketing.partners.readyTitle')} />
        <Button to="/contact">{t('marketing.partners.contactBtn')}</Button>
      </Section>
    </div>
  )
}
