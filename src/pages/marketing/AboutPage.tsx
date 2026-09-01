import { Heart, MapPin, ShieldCheck } from 'lucide-react'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Container from '@/components/ui/Container'
import SeoHead from '@/lib/seo/SeoHead'

const VALUES = [
  {
    icon: MapPin,
    title: 'Practical information',
    description:
      'A searchable map of real services, combining provider updates, public information, and StreetRise review.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for dignity',
    description:
      'Confidential-address handling for domestic violence resources, honest availability, and fewer barriers between a person and help.',
  },
  {
    icon: Heart,
    title: 'Free to search',
    description:
      'No account or payment is required to find help. StreetRise is designed to remain free for the people who rely on it.',
  },
]

export default function AboutPage() {
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
              About StreetRise
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Help should be easier to find.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              StreetRise brings shelter, food, healthcare, legal aid, and
              other essential services into one clear, searchable place—so a
              person looking for help can spend less time navigating systems
              and more time taking the next step.
            </p>

            <p className="mt-6 text-sm font-semibold text-cyan-200">
              Founded by Rodner Salgado
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/map" size="lg">
                Find Help Near You
              </Button>
              <Button to="/partner-with-us" variant="secondary" size="lg">
                Partner with StreetRise
              </Button>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 rounded-[2rem] bg-cyan-400/10 blur-2xl" />
            <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] border border-white/15 bg-slate-800 shadow-2xl shadow-black/40">
              <img
                src="/images/blog/meet-the-founder-cover.jpg"
                alt="Rodner Salgado, founder of StreetRise"
                className="h-full w-full object-cover object-right"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/70 to-transparent"
              />
            </div>
            <figcaption className="mt-4 text-center text-sm text-slate-300">
              Rodner Salgado · Founder, StreetRise
            </figcaption>
          </figure>
        </Container>
      </section>

      <Section containerSize="wide">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
              Meet the founder
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Building a clearer path from need to help
            </h2>
          </div>

          <div className="space-y-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              Rodner Salgado is building StreetRise around a practical
              question: how can someone find the right help without navigating
              outdated lists, disconnected systems, and uncertainty about
              what is actually available?
            </p>
            <p>
              StreetRise turns that question into useful public
              infrastructure. People can search without creating an account,
              while service organizations can claim their listings and keep
              important details current. StreetRise also reviews information
              gathered from community and public sources.
            </p>
            <p className="border-l-4 border-cyan-400 pl-5 text-lg font-semibold text-slate-900 dark:text-white">
              The goal is simple: give every person a more direct, dignified
              way to find their next step.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="gray" containerSize="wide">
        <SectionHeading
          eyebrow="What guides us"
          title="Designed around the person searching"
          subtitle="StreetRise is more than a list of organizations. It is built to make essential service information clearer, safer, and easier to act on."
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
          eyebrow="Growing across Florida"
          title="Where StreetRise Is Today"
          subtitle="StreetRise is live in Tampa Bay, Orlando, and Miami/Hollywood, with Jacksonville planned next. Providers can claim listings and keep service details current as the network grows."
        />
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/map">See the Map</Button>
          <Button to="/contact" variant="secondary">
            Contact StreetRise
          </Button>
        </div>
      </Section>
    </div>
  )
}
