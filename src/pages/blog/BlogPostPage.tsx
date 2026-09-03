import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { fetchPostBySlug } from '@/lib/blog'
import Section from '@/components/ui/Section'
import BlogBody from '@/components/blog/BlogBody'
import SeoHead from '@/lib/seo/SeoHead'
import { articleSchema } from '@/lib/seo/structuredData'
import NotFoundPage from '@/pages/NotFoundPage'
import { useI18n } from '@/lib/i18n'

export default function BlogPostPage() {
  const { t, lang } = useI18n()
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
      <SeoHead
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        type="article"
        image={post.cover_image_url ?? undefined}
      >
        {post.published_at && (
          <script type="application/ld+json">
            {JSON.stringify(articleSchema({
              title: post.title,
              description: post.excerpt,
              path: `/blog/${post.slug}`,
              publishedAt: post.published_at,
              authorName: post.author_name,
              image: post.cover_image_url ?? undefined,
            }))}
          </script>
        )}
      </SeoHead>

      <Section containerSize="prose">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-7"
        >
          <ArrowLeft size={15} /> {t('blog.post.backToBlog')}
        </Link>

        <header className="border-b border-slate-200 pb-7 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            {post.author_name}
            {post.published_at && ` · ${new Date(post.published_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US')}`}
          </p>
          <h1 lang="en" className="mt-3 text-4xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {post.title}
          </h1>
          <p lang="en" className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
            {post.excerpt}
          </p>
        </header>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt=""
            className="mt-8 aspect-[3/2] w-full rounded-2xl object-cover"
          />
        )}

        <div lang="en">
          <BlogBody content={post.body_markdown} />
        </div>
      </Section>
    </div>
  )
}
