import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Newspaper } from 'lucide-react'
import { fetchPublishedPosts } from '@/lib/blog'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'

export default function BlogIndexPage() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: fetchPublishedPosts,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Blog"
        description="News, partner spotlights, and impact stories from StreetRise."
        path="/blog"
      />

      <Section containerSize="prose" className="text-center">
        <SectionHeading eyebrow="Blog" title="News & Stories from StreetRise" />
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
            title="No posts yet"
            description="We're just getting started on the blog. Check back for updates on new cities, partners, and impact stories."
          />
        )}

        {!isLoading && posts && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card<typeof Link> key={post.id} as={Link} to={`/blog/${post.slug}`} hoverable className="block">
                {post.cover_image_url && (
                  <img
                    src={post.cover_image_url}
                    alt=""
                    loading="lazy"
                    className="mb-3 aspect-[3/2] w-full rounded-xl object-cover"
                  />
                )}
                <p className="font-bold text-slate-900 dark:text-white">{post.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{post.excerpt}</p>
                {post.published_at && (
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(post.published_at).toLocaleDateString()}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
