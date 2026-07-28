import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPostBySlug } from '@/lib/blog'
import Section from '@/components/ui/Section'
import SeoHead from '@/lib/seo/SeoHead'
import { articleSchema } from '@/lib/seo/structuredData'
import NotFoundPage from '@/pages/NotFoundPage'

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => fetchPostBySlug(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <Section containerSize="prose">
        <div className="skeleton h-8 w-2/3 mb-4" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-5/6" />
      </Section>
    )
  }

  if (!post) return <NotFoundPage />

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead title={post.title} description={post.excerpt} path={`/blog/${post.slug}`} type="article">
        {post.published_at && (
          <script type="application/ld+json">
            {JSON.stringify(articleSchema({
              title: post.title,
              description: post.excerpt,
              path: `/blog/${post.slug}`,
              publishedAt: post.published_at,
              authorName: post.author_name,
            }))}
          </script>
        )}
      </SeoHead>

      <Section containerSize="prose">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
          {post.author_name}
          {post.published_at && ` · ${new Date(post.published_at).toLocaleDateString()}`}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{post.title}</h1>
        <div className="prose-sm mt-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {post.body_markdown}
        </div>
      </Section>
    </div>
  )
}
