import clsx from 'clsx'
import { Link, type LinkProps } from 'react-router-dom'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'
type Size = 'sm' | 'default' | 'lg'

const VARIANT_CLASS: Record<Variant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
}

const SIZE_CLASS: Record<Size, string> = {
  sm:      'btn-sm',
  default: '',
  lg:      'btn-lg',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  className?: string
  children: ReactNode
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined; href?: undefined }

type ButtonAsLink = CommonProps &
  Omit<LinkProps, 'className' | 'children'> & { href?: undefined }

type ButtonAsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { to?: undefined; href: string }

type Props = ButtonAsButton | ButtonAsLink | ButtonAsAnchor

export default function Button({ variant = 'primary', size = 'default', fullWidth, className, children, ...rest }: Props) {
  const classes = clsx(VARIANT_CLASS[variant], SIZE_CLASS[size], fullWidth && 'w-full', className)

  if ('to' in rest && rest.to !== undefined) {
    const { to, ...linkRest } = rest as ButtonAsLink
    return (
      <Link to={to} className={classes} {...linkRest}>
        {children}
      </Link>
    )
  }

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as ButtonAsAnchor
    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
