import { Helmet } from 'react-helmet-async'
import type { ReactNode } from 'react'

export const SITE_URL = 'https://app.streetrise.org'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/og-image.png`

interface Props {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
  children?: ReactNode
}

export default function SeoHead({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noindex,
  children,
}: Props) {
  const url = `${SITE_URL}${path}`
  const fullTitle = title.includes('StreetRise') ? title : `${title} — StreetRise`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {children}
    </Helmet>
  )
}
