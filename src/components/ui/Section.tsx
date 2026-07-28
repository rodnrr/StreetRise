import clsx from 'clsx'
import type { ReactNode } from 'react'
import Container, { type ContainerSize } from './Container'

const TONES = {
  white:   'bg-white',
  gray:    'bg-slate-50',
  primary: 'bg-primary-50',
} as const

interface Props {
  tone?: keyof typeof TONES
  containerSize?: ContainerSize
  className?: string
  children: ReactNode
}

export default function Section({ tone = 'white', containerSize = 'wide', className, children }: Props) {
  return (
    <section className={clsx('py-12 md:py-20', TONES[tone], className)}>
      <Container size={containerSize}>{children}</Container>
    </section>
  )
}
