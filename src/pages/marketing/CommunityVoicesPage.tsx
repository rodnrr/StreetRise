import { MessagesSquare } from 'lucide-react'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'

// No fabricated testimonials — honest empty state until real stories exist.
// noindex (and kept out of sitemap.xml) until there is real content.
export default function CommunityVoicesPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Community Voices"
        description="Real stories from the people and providers StreetRise has helped."
        path="/community-voices"
        noindex
      />

      <Section containerSize="prose" className="text-center">
        <SectionHeading eyebrow="Community Voices" title="Stories from Our Community" />
      </Section>

      <Section containerSize="prose" className="pt-0">
        <EmptyState
          icon={MessagesSquare}
          title="Stories are on the way"
          description="We're collecting real stories from the people and providers StreetRise has helped. Check back soon."
        />
      </Section>
    </div>
  )
}
