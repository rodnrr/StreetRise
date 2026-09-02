import { Heart, MapPin, ShieldCheck } from 'lucide-react'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Container from '@/components/ui/Container'
import SeoHead from '@/lib/seo/SeoHead'
import { useI18n } from '@/lib/i18n'

export default function AboutPage() {
  const { t } = useI18n()

  const VALUES = [
    {
      icon: MapPin,
      title: t('marketing.about.value1Title'),
      description: t('marketing.about.value1Desc'),
    },
    {
      icon: ShieldCheck,
      title: t('marketing.about.value2Title'),
      description: t('marketing.about.value2Desc'),
    },
    {
      icon: Heart,
      title: t('marketing.about.value3Title'),
      description: t('marketing.about.value3Desc'),
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="About StreetRise"
        description="Meet StreetRise founder Rodner Salgado and learn how the platform is making local help easier to find across Florida."
        path="/about"
      />

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(6,182,212,0.2),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.14),transparent_35%)]"
        />

        <Container className="relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.1fr_0.8fr] lg:gap-16 lg:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
              {t('marketing.about.eyebrow')}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              {t('marketing.about.h1')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              {t('marketing.about.heroBody')}
            </p>

            <p className="mt-6 text-sm font-semibold text-cyan-200">
              {t('marketing.about.foundedBy')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/map" size="lg">
                {t('marketing.about.ctaFindHelp')}
              </Button>
              <Button to="/partner-with-us" variant="secondary" size="lg">
                {t('marketing.about.ctaPartner')}
              </Button>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 rounded-[2rem] bg-cyan-400/10 blur-2xl" />
            <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] border border-white/15 bg-slate-800 shadow-2xl shadow-black/40">
              <img
                src="/images/blog/meet-the-founder-cover.jpg"
                alt={t('marketing.about.founderImgAlt')}
                className="h-full w-full object-cover object-right"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/70 to-transparent"
              />
            </div>
            <figcaption className="mt-4 text-center text-sm text-slate-300">
              {t('marketing.about.founderCaption')}
            </figcaption>
          </figure>
        </Container>
      </section>

      <Section containerSize="wide">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
              {t('marketing.about.meetFounderEyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('marketing.about.meetFounderTitle')}
            </h2>
          </div>

          <div className="space-y-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              {t('marketing.about.founderP1')}
            </p>
            <p>
              {t('marketing.about.founderP2')}
            </p>
            <p className="border-l-4 border-cyan-400 pl-5 text-lg font-semibold text-slate-900 dark:text-white">
              {t('marketing.about.founderQuote')}
            </p>
          </div>
        </div>
      </Section>

      <Section tone="gray" containerSize="wide">
        <SectionHeading
          eyebrow={t('marketing.about.valuesEyebrow')}
          title={t('marketing.about.valuesTitle')}
          subtitle={t('marketing.about.valuesSubtitle')}
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex items-start gap-4">
              <Icon
                size={22}
                className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400"
              />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {title}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section containerSize="prose" className="text-center">
        <SectionHeading
          eyebrow={t('marketing.about.whereEyebrow')}
          title={t('marketing.about.whereTitle')}
          subtitle={t('marketing.about.whereSubtitle')}
        />
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/map">{t('marketing.about.seeMap')}</Button>
          <Button to="/contact" variant="secondary">
            {t('marketing.about.contactCta')}
          </Button>
        </div>
      </Section>
    </div>
  )
}
