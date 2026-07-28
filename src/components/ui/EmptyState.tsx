import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

/**
 * Used wherever a marketing section is backed by real data that may not exist
 * yet (testimonials, partners, blog posts) — renders an honest "coming soon"
 * state instead of the section silently disappearing or showing fabricated content.
 */
export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
      <Icon size={28} className="mb-3 text-slate-400" />
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
