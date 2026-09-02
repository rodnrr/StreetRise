import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Newspaper } from 'lucide-react'
import { fetchPublishedPosts } from '@/lib/blog'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'
import { useI18n } from '@/lib/i18n'

export default function BlogIndexPage() {
  const { t, lang } = useI18n()
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: fetchPublishedPosts,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title={t('blog.index.seoTitle')}
        description={t('blog.index.seoDescription')}
        path="/blog"
      />

      <Section containerSize="prose" className="text-center">
        <SectionHeading eyebrow={t('blog.index.eyebrow')} title={t('blog.index.heading')} />
      </Section>

      <Section containerSize="prose" className="pt-0">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1].map((i) => <div key={i} className="skeleton h-20" />)}
          </div>
        )}

        {!isLoading && (!posts || posts.length === 0) && (
          <EmptyState
            icon={Newspaper}
            title={t('blog.index.emptyTitle')}
            description={t('blog.index.emptyDescription')}
          />
        )}

        {!isLoading && posts && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card<typeof Link> key={post.id} as={Link} to={`/blog/${post.slug}`} hoverable className="block">
                <div className="flex gap-4">
                  {post.cover_image_url && (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      loading="lazy"
                      className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0" lang="en">
                    <p className="font-bold text-slate-900 dark:text-white">{post.title}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{post.excerpt}</p>
                    {post.published_at && (
                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(post.published_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
