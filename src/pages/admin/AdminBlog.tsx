import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, ChevronDown, Eye, EyeOff, ExternalLink, Wand2, Upload } from 'lucide-react'
import { db, supabase } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import type { Database } from '@/lib/database.types'

type BlogPostRow = Database['public']['Tables']['blog_posts']['Row']

type PostForm = {
  title: string
  slug: string
  excerpt: string
  body_markdown: string
  author_name: string
  cover_image_url: string
}

const EMPTY_FORM: PostForm = {
  title: '',
  slug: '',
  excerpt: '',
  body_markdown: '',
  author_name: 'StreetRise Team',
  cover_image_url: '',
}

const MAX_COVER_WIDTH = 1600
const COVER_JPEG_QUALITY = 0.82

/**
 * Re-encode any browser-readable image as a JPEG, downscaled to
 * MAX_COVER_WIDTH. Every upload goes through this so the stored file is
 * guaranteed decodable by all browsers — phone pickers can hand over HEIC or
 * otherwise mangled files even when the name says .jpeg.
 */
async function toWebJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('That file could not be read as an image.'))
      el.src = url
    })
    const scale = Math.min(1, MAX_COVER_WIDTH / img.naturalWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Image processing is unavailable in this browser.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', COVER_JPEG_QUALITY),
    )
    if (!blob) throw new Error('The image could not be converted.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** URL-safe slug from a title. Keeps a-z, 0-9 and single hyphens. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export default function AdminBlog() {
  const [editing, setEditing]   = useState<BlogPostRow | null | 'new'>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const coverFileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const qc    = useQueryClient()

  const { data: posts = [], isLoading } = useQuery<BlogPostRow[]>({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await db.blog_posts()
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as BlogPostRow[]
    },
  })

  const { register, handleSubmit, reset, setValue, getValues, formState: { isSubmitting } } =
    useForm<PostForm>({ defaultValues: EMPTY_FORM })

  function openEdit(post: BlogPostRow | 'new') {
    setEditing(post)
    if (post === 'new') {
      reset(EMPTY_FORM)
    } else {
      reset({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body_markdown: post.body_markdown,
        author_name: post.author_name,
        cover_image_url: post.cover_image_url ?? '',
      })
    }
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const blob = await toWebJpeg(file)
      const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'cover'
      const path = `covers/${Date.now()}-${base}.jpg`
      const { error } = await supabase.storage
        .from('blog-images')
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
      if (error) throw error
      const { data } = supabase.storage.from('blog-images').getPublicUrl(path)
      setValue('cover_image_url', data.publicUrl, { shouldDirty: true })
      toast.success('Image uploaded', 'Cover URL filled in — save the post to keep it.')
    } catch (err) {
      toast.error('Upload failed', err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  const save = useMutation({
    mutationFn: async (form: PostForm) => {
      const payload = {
        title:           form.title.trim(),
        slug:            slugify(form.slug || form.title),
        excerpt:         form.excerpt.trim(),
        body_markdown:   form.body_markdown,
        author_name:     form.author_name.trim() || 'StreetRise Team',
        cover_image_url: form.cover_image_url.trim() || null,
      }
      if (!payload.slug) throw new Error('Slug could not be generated from the title.')

      if (editing === 'new') {
        // New posts start unpublished — publish explicitly from the list below.
        const { error } = await db.blog_posts().insert({ ...payload, is_published: false })
        if (error) throw error
      } else if (editing) {
        const { error } = await db.blog_posts().update(payload).eq('id', editing.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editing === 'new' ? 'Draft created' : 'Post updated')
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      qc.invalidateQueries({ queryKey: ['blog-posts'] })
      setEditing(null)
    },
    onError: (e: Error) => toast.error('Save failed', e.message),
  })

  const togglePublish = useMutation({
    mutationFn: async (post: BlogPostRow) => {
      const next = !post.is_published
      const { error } = await db.blog_posts()
        .update({
          is_published: next,
          // Stamp published_at on first publish; keep the original date afterwards.
          published_at: next && !post.published_at
            ? new Date().toISOString()
            : post.published_at,
        })
        .eq('id', post.id)
      if (error) throw error
      return next
    },
    onSuccess: (nowPublished) => {
      toast.success(nowPublished ? 'Post is now live' : 'Post unpublished')
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      qc.invalidateQueries({ queryKey: ['blog-posts'] })
    },
    onError: (e: Error) => toast.error('Update failed', e.message),
  })

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.blog_posts().delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deleted')
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      qc.invalidateQueries({ queryKey: ['blog-posts'] })
    },
    onError: (e: Error) => toast.error('Delete failed', e.message),
  })

  const publishedCount = posts.filter(p => p.is_published).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Blog</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'} · {publishedCount} published
          </p>
        </div>
        <button onClick={() => openEdit('new')} className="btn-primary btn-sm gap-1.5">
          <Plus size={16} /> New Post
        </button>
      </div>

      {/* Edit form */}
      {editing !== null && (
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-600">
          <h2 className="font-semibold text-white mb-4">
            {editing === 'new' ? 'New Post' : 'Edit Post'}
          </h2>
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-3">
            <div>
              <label className="label text-gray-300">Title *</label>
              <input
                {...register('title', { required: true })}
                className="input bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                placeholder="e.g. StreetRise expands to Pinellas County"
              />
            </div>

            <div>
              <label className="label text-gray-300">Slug *</label>
              <div className="flex gap-2">
                <input
                  {...register('slug', { required: true })}
                  className="input bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 font-mono text-sm"
                  placeholder="streetrise-expands-to-pinellas-county"
                />
                <button
                  type="button"
                  onClick={() => setValue('slug', slugify(getValues('title')), { shouldDirty: true })}
                  className="btn-secondary btn-sm shrink-0 gap-1.5"
                  title="Generate slug from title"
                >
                  <Wand2 size={14} /> From title
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Public URL: /blog/&lt;slug&gt; — must be unique. Changing it breaks existing links.
              </p>
            </div>

            <div>
              <label className="label text-gray-300">Excerpt *</label>
              <textarea
                {...register('excerpt', { required: true })}
                className="input bg-gray-700 border-gray-600 text-white min-h-[60px] resize-none"
                placeholder="One or two sentences — shown in the blog list and used as the page description."
              />
            </div>

            <div>
              <label className="label text-gray-300">Body *</label>
              <textarea
                {...register('body_markdown', { required: true })}
                className="input bg-gray-700 border-gray-600 text-white min-h-[220px] font-mono text-sm leading-relaxed"
                placeholder="Write the post here…"
              />
              <p className="text-xs text-gray-500 mt-1">
                Line breaks and paragraphs are preserved. Markdown syntax is stored but not yet
                rendered on the public post page — it will display as plain text.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-gray-300">Author</label>
                <input
                  {...register('author_name')}
                  className="input bg-gray-700 border-gray-600 text-white"
                  placeholder="StreetRise Team"
                />
              </div>
              <div>
                <label className="label text-gray-300">Cover image</label>
                <div className="flex gap-2">
                  <input
                    {...register('cover_image_url')}
                    className="input bg-gray-700 border-gray-600 text-white text-sm"
                    placeholder="https://…"
                  />
                  <button
                    type="button"
                    onClick={() => coverFileRef.current?.click()}
                    disabled={uploading}
                    className="btn-secondary btn-sm shrink-0 gap-1.5"
                    title="Upload a photo"
                  >
                    <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverFile}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Shown at the top of the post, on the blog index, and as the social share
                  image. Uploads are resized and converted to JPEG automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary">
                {save.isPending ? 'Saving…' : editing === 'new' ? 'Create Draft' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 bg-gray-800 rounded-xl" />)}
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <div className="bg-gray-800 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-400">
            No posts yet. The public /blog page shows a “No posts yet” state until you publish one.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {posts.map(post => (
          <div
            key={post.id}
            className={`bg-gray-800 rounded-2xl overflow-hidden ${!post.is_published ? 'opacity-70' : ''}`}
          >
            <button
              className="w-full flex items-start gap-3 p-4 text-left"
              onClick={() => setExpanded(expanded === post.id ? null : post.id)}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 mt-0.5 shrink-0 ${
                  post.is_published
                    ? 'bg-success-500/15 text-success-500'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {post.is_published ? 'Live' : 'Draft'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{post.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">/blog/{post.slug}</p>
                {expanded !== post.id && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{post.excerpt}</p>
                )}
              </div>
              <ChevronDown
                size={15}
                className={`text-gray-500 shrink-0 mt-0.5 transition-transform ${expanded === post.id ? 'rotate-180' : ''}`}
              />
            </button>

            {expanded === post.id && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-700">
                <p className="text-sm text-gray-300 mt-3 leading-relaxed">{post.excerpt}</p>
                <p className="text-xs text-gray-500 mt-3">
                  {post.author_name}
                  {post.published_at
                    ? ` · published ${new Date(post.published_at).toLocaleDateString()}`
                    : ' · never published'}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => openEdit(post)}
                    className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => togglePublish.mutate(post)}
                    disabled={togglePublish.isPending}
                    className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {post.is_published
                      ? <><EyeOff size={12} /> Unpublish</>
                      : <><Eye size={12} /> Publish</>}
                  </button>
                  {post.is_published && (
                    <Link
                      to={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                    >
                      <ExternalLink size={12} /> View
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Delete “${post.title}”? This cannot be undone.`)) {
                        deletePost.mutate(post.id)
                      }
                    }}
                    className="flex items-center gap-1.5 bg-danger-600/80 hover:bg-danger-600 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
