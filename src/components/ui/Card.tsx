import clsx from 'clsx'
import type { ElementType, ReactNode } from 'react'

interface Props {
  as?: ElementType
  hoverable?: boolean
  className?: string
  children: ReactNode
}

export default function Card({ as: As = 'div', hoverable, className, children }: Props) {
  return (
    <As className={clsx(hoverable ? 'card-hover' : 'card', className)}>
      {children}
    </As>
  )
}
