import { Users2, Building2, HandCoins } from 'lucide-react'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'

const WAYS_TO_PARTNER = [
  {
    icon: Building2,
    title: 'Corporate & Foundation Partners',
    description: 'Fund verification, outreach, and expansion into new Florida cities.',
  },
  {
    icon: Users2,
    title: 'Community Organizations',
    description: 'Co-host events, referral partnerships, and volunteer drives with StreetRise.',
  },
  {
    icon: HandCoins,
    title: 'In-Kind & Grant Support',
    description: "Donated services, tools, or grant funding that helps StreetRise reach more people.",
  },
]

export default function PartnersPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Partner With Us"
        description="StreetRise partners with foundations, businesses, and community organizations to expand real-time resource access across Florida."
        path="/partner-with-us"
      />

      <Section containerSize="prose" className="text-center">
        <SectionHeading
          eyebrow="Partner with us"
          title="Help StreetRise Reach More People"
          subtitle="StreetRise partners with foundations, businesses, and community organizations to expand real-time resource access across Florida."
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
        <SectionHeading title="Our Current Partners" align="left" />
        <EmptyState
          icon={Users2}
          title="Partner list coming soon"
          description="We're building out this page as new partnerships are confirmed."
        />
      </Section>

      <Section tone="primary" containerSize="prose" className="text-center">
        <SectionHeading title="Ready to Talk?" />
        <Button to="/contact">Contact Us</Button>
      </Section>
    </div>
  )
}
