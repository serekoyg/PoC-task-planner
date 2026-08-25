import type { HTMLAttributes, ReactNode } from 'react'
import { classNames } from './classNames'

type PageToolbarProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  actionsClassName?: string
}

export function PageToolbar({
  eyebrow,
  title,
  description,
  actions,
  actionsClassName,
  className,
  ...props
}: PageToolbarProps) {
  return (
    <header className={classNames('ds-page-toolbar', className)} {...props}>
      <div className="ds-page-toolbar__copy">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="ds-page-toolbar__description">{description}</p>}
      </div>
      {actions && (
        <div
          className={classNames(
            'ds-page-toolbar__actions',
            actionsClassName,
          )}
        >
          {actions}
        </div>
      )}
    </header>
  )
}
