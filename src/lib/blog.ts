import { supabase } from '@/lib/supabase'

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  body_markdown: string
  cover_image_url: string | null
  author_name: string
  published_at: string | null
}

const COLUMNS = 'id, slug, title, excerpt, body_markdown, cover_image_url, author_name, published_at'

// Tolerates the blog_posts table not existing yet (migration 029 not applied) —
// treated the same as "no posts published", not a page-breaking error.
export async function fetchPublishedPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (error) {
    console.warn('blog_posts unavailable (migration may not be applied yet):', error.message)
    return []
  }
  return (data ?? []) as unknown as BlogPost[]
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(COLUMNS)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    console.warn('blog_posts unavailable (migration may not be applied yet):', error.message)
    return null
  }
  return data as unknown as BlogPost | null
}
