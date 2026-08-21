import { Pause, Play } from '@phosphor-icons/react'
import type { FocusRecord } from '../data/focusRecords'
import { isFocusRecordRunning } from '../lib/focus'

type FocusToggleButtonProps = {
  label: string
  record?: FocusRecord
  onStart: () => void
  onPause: (recordId: string) => void
}

export default function FocusToggleButton({
  label,
  record,
  onStart,
  onPause,
}: FocusToggleButtonProps) {
  const isRunning = Boolean(record && isFocusRecordRunning(record))
  const actionLabel = isRunning
    ? `${label} 일시정지`
    : record
      ? `${label} 다시 시작`
      : `${label} 시작`

  return (
    <button
      className={`todo-play-button${isRunning ? ' running' : record ? ' paused' : ''}`}
      type="button"
      aria-label={actionLabel}
      aria-pressed={isRunning}
      title={actionLabel}
      onClick={() => {
        if (record && isRunning) {
          onPause(record.id)
          return
        }
        onStart()
      }}
    >
      {isRunning ? (
        <Pause size={14} weight="fill" aria-hidden="true" />
      ) : (
        <Play size={14} weight="fill" aria-hidden="true" />
      )}
    </button>
  )
}
