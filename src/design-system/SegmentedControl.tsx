import type { ReactNode } from 'react'
import { classNames } from './classNames'

export type SegmentedControlItem<Value extends string> = {
  value: Value
  label: ReactNode
}

type SegmentedControlProps<Value extends string> = {
  ariaLabel: string
  className?: string
  items: readonly SegmentedControlItem<Value>[]
  value: Value
  onChange: (value: Value) => void
}

export function SegmentedControl<Value extends string>({
  ariaLabel,
  className,
  items,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <div
      className={classNames('ds-segmented-control', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            className={isActive ? 'active' : undefined}
            type="button"
            key={item.value}
            onClick={() => onChange(item.value)}
            aria-pressed={isActive}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
