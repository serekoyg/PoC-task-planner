import { createElement, type HTMLAttributes } from 'react'
import { classNames } from './classNames'

type SurfaceElement = 'article' | 'aside' | 'div' | 'section'

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: SurfaceElement
  tone?: 'default' | 'elevated'
}

export function Surface({
  as = 'section',
  tone = 'default',
  className,
  ...props
}: SurfaceProps) {
  return createElement(as, {
    className: classNames('ds-surface', `ds-surface--${tone}`, className),
    ...props,
  })
}
