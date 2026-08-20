/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  /** Blog publisher Worker origin. Unset hides the AI panel on /admin/blog. */
  readonly VITE_BLOG_WORKER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
