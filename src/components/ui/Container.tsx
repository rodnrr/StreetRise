import clsx from 'clsx'
import type { ReactNode } from 'react'

const WIDTHS = {
  narrow: 'max-w-md',   // existing mobile-app content width (HomePage, FAQ, etc.)
  prose:  'max-w-3xl',  // long-form text (About, blog post, legal pages)
  wide:   'max-w-7xl',  // marketing grids/hero sections (desktop-first)
} as const

export type ContainerSize = keyof typeof WIDTHS

interface Props {
  size?: ContainerSize
  className?: string
  children: ReactNode
}

export default function Container({ size = 'wide', className, children }: Props) {
  return (
    <div className={clsx('mx-auto w-full px-5', WIDTHS[size], className)}>
      {children}
    </div>
  )
}
