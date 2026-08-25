import type {
  ButtonHTMLAttributes,
  ComponentProps,
  ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { classNames } from './classNames'

export type ButtonVariant = 'primary' | 'secondary'
export type ButtonSize = 'small' | 'medium' | 'icon'

type ButtonStyleProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  startIcon?: ReactNode
  endIcon?: ReactNode
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleProps

const getButtonClassName = (
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) =>
  classNames(
    'ds-button',
    `ds-button--${variant}`,
    `ds-button--${size}`,
    className,
  )

export function Button({
  variant = 'secondary',
  size = 'medium',
  startIcon,
  endIcon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={getButtonClassName(variant, size, className)}
      type={type}
      {...props}
    >
      {startIcon && <span className="ds-button__icon" aria-hidden="true">{startIcon}</span>}
      {children}
      {endIcon && <span className="ds-button__icon" aria-hidden="true">{endIcon}</span>}
    </button>
  )
}

export type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleProps

export function ButtonLink({
  variant = 'secondary',
  size = 'medium',
  startIcon,
  endIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={getButtonClassName(variant, size, className)}
      {...props}
    >
      {startIcon && <span className="ds-button__icon" aria-hidden="true">{startIcon}</span>}
      {children}
      {endIcon && <span className="ds-button__icon" aria-hidden="true">{endIcon}</span>}
    </Link>
  )
}
