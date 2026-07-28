import clsx from 'clsx'
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

interface OwnProps {
  as?: ElementType
  hoverable?: boolean
  className?: string
  children: ReactNode
}

type Props<T extends ElementType> = OwnProps & Omit<ComponentPropsWithoutRef<T>, keyof OwnProps>

export default function Card<T extends ElementType = 'div'>({
  as,
  hoverable,
  className,
  children,
  ...rest
}: Props<T>) {
  const As = as ?? 'div'
  return (
    <As className={clsx(hoverable ? 'card-hover' : 'card', className)} {...rest}>
      {children}
    </As>
  )
}
