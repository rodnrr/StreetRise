import clsx from 'clsx'

interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

export default function SectionHeading({ eyebrow, title, subtitle, align = 'center', className }: Props) {
  return (
    <div className={clsx('mb-10', align === 'center' && 'text-center', className)}>
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold leading-tight text-slate-900 dark:text-white md:text-4xl">{title}</h2>
      {subtitle && (
        <p className={clsx('mt-3 text-slate-500 dark:text-slate-400', align === 'center' && 'mx-auto max-w-2xl')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
