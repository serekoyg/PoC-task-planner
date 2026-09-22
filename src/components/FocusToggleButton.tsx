import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, X } from '@phosphor-icons/react'
import type { FocusRecord } from '../data/focusRecords'
import { isFocusRecordRunning } from '../lib/focus'

type FocusToggleButtonProps = {
  label: string
  record?: FocusRecord
  onStart: () => void
  isCompleted?: boolean
  onStartFromBeginning?: () => void
  onPause: (recordId: string) => void
  onFinish: (recordId: string) => void
}

export default function FocusToggleButton({
  label,
  record,
  onStart,
  isCompleted = false,
  onStartFromBeginning,
  onPause,
  onFinish,
}: FocusToggleButtonProps) {
  const [isStartChoiceOpen, setIsStartChoiceOpen] = useState(false)
  const isRunning = Boolean(record && isFocusRecordRunning(record))
  const toggleLabel = isRunning
    ? `${label} 일시정지`
    : record
      ? `${label} 다시 시작`
      : `${label} 시작`

  useEffect(() => {
    if (!isStartChoiceOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsStartChoiceOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isStartChoiceOpen])

  if (!record) {
    return (
      <div className="focus-inline-controls">
        <button
          className="todo-play-button"
          type="button"
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={() => {
            if (isCompleted && onStartFromBeginning) {
              setIsStartChoiceOpen(true)
              return
            }
            onStart()
          }}
        >
          <Play size={14} weight="fill" aria-hidden="true" />
        </button>
        {isStartChoiceOpen && createPortal(
          <div
            className="focus-restart-backdrop"
            role="presentation"
            onClick={() => setIsStartChoiceOpen(false)}
          >
            <section
              className="focus-restart-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="focus-restart-title"
              aria-describedby="focus-restart-description"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="focus-restart-heading">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong id="focus-restart-title">완료한 할 일이에요</strong>
                  <p id="focus-restart-description">
                    이전 집중 기록을 유지할지, 처음부터 다시 기록할지 선택하세요.
                  </p>
                </div>
              </div>
              <div className="focus-restart-actions">
                <button
                  type="button"
                  onClick={() => setIsStartChoiceOpen(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsStartChoiceOpen(false)
                    onStart()
                  }}
                >
                  이어서 하기
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    setIsStartChoiceOpen(false)
                    onStartFromBeginning?.()
                  }}
                >
                  처음부터 시작
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
      </div>
    )
  }

  return (
    <div className="focus-inline-controls active">
      <button
        className={`todo-play-button focus-inline-toggle${isRunning ? ' running' : ' paused'}`}
        type="button"
        aria-label={toggleLabel}
        aria-pressed={isRunning}
        title={toggleLabel}
        onClick={() => {
          if (isRunning) onPause(record.id)
          else onStart()
        }}
      >
        {isRunning ? (
          <Pause size={14} weight="fill" aria-hidden="true" />
        ) : (
          <Play size={14} weight="fill" aria-hidden="true" />
        )}
      </button>
      <button
        className="todo-play-button focus-inline-finish"
        type="button"
        aria-label={`${label} 마치기`}
        title={`${label} 마치기`}
        onClick={() => onFinish(record.id)}
      >
        <X size={15} weight="bold" aria-hidden="true" />
      </button>
    </div>
  )
}
