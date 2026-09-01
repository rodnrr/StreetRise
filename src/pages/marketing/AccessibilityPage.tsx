import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import SeoHead from '@/lib/seo/SeoHead'
import { useI18n } from '@/lib/i18n'

const LAST_UPDATED_EN = 'August 26, 2026'
const LAST_UPDATED_ES = '26 de agosto de 2026'

export default function AccessibilityPage() {
  const { t, lang } = useI18n()
  const lastUpdated = lang === 'es' ? LAST_UPDATED_ES : LAST_UPDATED_EN

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
            eyebrow={t('marketing.accessibility.eyebrow')}
            title={t('marketing.accessibility.title')}
            align="left"
          />

          <p className="mb-6 text-xs text-slate-400">
            {t('marketing.accessibility.lastUpdated').replace('{date}', lastUpdated)}
          </p>

          <div className="prose-sm space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              {t('marketing.accessibility.intro')}
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('marketing.accessibility.goalHeading')}
            </h2>

            <p>
              {t('marketing.accessibility.goalP1')}
            </p>

            <p>
              {t('marketing.accessibility.goalP2')}
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('marketing.accessibility.measuresHeading')}
            </h2>

            <p>
              {t('marketing.accessibility.measuresIntro')}
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>{t('marketing.accessibility.measuresItem1')}</li>
              <li>{t('marketing.accessibility.measuresItem2')}</li>
              <li>
                {t('marketing.accessibility.measuresItem3')}
              </li>
              <li>
                {t('marketing.accessibility.measuresItem4')}
              </li>
              <li>
                {t('marketing.accessibility.measuresItem5')}
              </li>
              <li>
                {t('marketing.accessibility.measuresItem6')}
              </li>
              <li>
                {t('marketing.accessibility.measuresItem7')}
              </li>
            </ul>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('marketing.accessibility.limitationsHeading')}
            </h2>

            <p>
              {t('marketing.accessibility.limitationsIntro')}
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>
                {t('marketing.accessibility.limitationsItem1')}
              </li>
              <li>
                {t('marketing.accessibility.limitationsItem2')}
              </li>
              <li>
                {t('marketing.accessibility.limitationsItem3')}
              </li>
            </ul>

            <p>
              {t('marketing.accessibility.limitationsOutro')}
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('marketing.accessibility.altAccessHeading')}
            </h2>

            <p>
              {t('marketing.accessibility.altAccessP1')}
            </p>

            <p>
              {t('marketing.accessibility.contactCallPrefix')}{' '}
              <a
                href="tel:+18135864066"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                (813) 586-4066
              </a>{' '}
              {t('marketing.accessibility.contactEmailPrefix')}{' '}
              <a
                href="mailto:info@streetrise.org"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                info@streetrise.org
              </a>
              .
            </p>

            <p>
              {t('marketing.accessibility.notEmergencyLine')}
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('marketing.accessibility.reportHeading')}
            </h2>

            <p>
              {t('marketing.accessibility.reportIntro')}
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>{t('marketing.accessibility.reportItem1')}</li>
              <li>{t('marketing.accessibility.reportItem2')}</li>
              <li>{t('marketing.accessibility.reportItem3')}</li>
              <li>
                {t('marketing.accessibility.reportItem4')}
              </li>
              <li>{t('marketing.accessibility.reportItem5')}</li>
            </ul>

            <p>
              {t('marketing.accessibility.reportOutro')}
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('marketing.accessibility.thirdPartyHeading')}
            </h2>

            <p>
              {t('marketing.accessibility.thirdPartyP')}
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('marketing.accessibility.updatesHeading')}
            </h2>

            <p>
              {t('marketing.accessibility.updatesP')}
            </p>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('marketing.accessibility.contactHeading')}
            </h2>

            <p>
              {t('marketing.accessibility.contactSendPrefix')}{' '}
              <a
                href="mailto:info@streetrise.org"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                info@streetrise.org
              </a>{' '}
              {t('marketing.accessibility.contactOr')}{' '}
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