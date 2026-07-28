import { Heart, MapPin, ShieldCheck } from 'lucide-react'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import SeoHead from '@/lib/seo/SeoHead'

const VALUES = [
  {
    icon: MapPin,
    title: 'Real, verified services',
    description: 'Not a directory of non-profits — a map of actual shelter beds, meals, showers, and care, kept current by the providers who deliver them.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for dignity',
    description: 'Confidential-address handling for domestic violence resources, honest availability, and no runaround.',
  },
  {
    icon: Heart,
    title: 'Free, always',
    description: 'No sign-up required to find help. StreetRise is funded by donations and partners, not by the people who use it.',
  },
]

export default function AboutPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="About StreetRise"
        description="StreetRise connects people experiencing homelessness, veterans, families in crisis, and domestic violence survivors to real, verified local services."
        path="/about"
      />

      <Section containerSize="prose" className="text-center">
        <SectionHeading
          eyebrow="Our mission"
          title="Real Help for Real People"
          subtitle="StreetRise was built for people experiencing homelessness, veterans, families in crisis, domestic violence survivors, people with disabilities, and anyone connecting them to care."
        />
      </Section>

      <Section tone="gray" containerSize="prose">
        <div className="space-y-4">
          {VALUES.map(({ icon: Icon, title, description }) => (
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

      <Section containerSize="prose" className="text-center">
        <SectionHeading
          title="Where We Are Today"
          subtitle="StreetRise is live in Tampa Bay and Orlando, with Miami and Jacksonville coming soon. Every listing is checked and updated by the organization that runs it."
        />
        <Button to="/map">See the Map</Button>
      </Section>
    </div>
  )
}
