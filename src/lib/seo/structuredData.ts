import { SITE_URL } from './SeoHead'

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    name: 'StreetRise',
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-192.png`,
    description:
      'Real-time resource discovery for people experiencing homelessness — shelter, food, work exchange, and community support across Florida.',
    email: 'Info@streetrise.org',
    telephone: '+18135864066',
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export function faqPageSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function articleSchema(opts: {
  title: string
  description: string
  path: string
  publishedAt: string
  authorName: string
  image?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    datePublished: opts.publishedAt,
    author: { '@type': 'Person', name: opts.authorName },
    ...(opts.image ? { image: opts.image } : {}),
  }
}

// Usage: <SeoHead ...><script type="application/ld+json">{JSON.stringify(organizationSchema())}</script></SeoHead>
// react-helmet-async serializes <script> children directly — no dangerouslySetInnerHTML needed.
