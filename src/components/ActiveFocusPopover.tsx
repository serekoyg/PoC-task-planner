import { useEffect, useRef, useState } from 'react'
import type { FocusRecord } from '../data/focusRecords'
import {
  formatFocusTimer,
  getFocusDurationSeconds,
  getPureFocusSeconds,
  getTotalFocusSeconds,
} from '../lib/focus'

type ActiveFocusPopoverProps = {
  records: FocusRecord[]
  nowMs: number
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onSelect: (record: FocusRecord) => void
  onStop: (recordId: string) => void
  onStopAll: () => void
}

export default function ActiveFocusPopover({
  records,
  nowMs,
  isOpen,
  onToggle,
  onClose,
  onSelect,
  onStop,
  onStopAll,
}: ActiveFocusPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [isConfirmingStopAll, setIsConfirmingStopAll] = useState(false)
  const pureSeconds = getPureFocusSeconds(records, nowMs)
  const totalSeconds = getTotalFocusSeconds(records, nowMs)

  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingStopAll(false)
      return
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen, onClose])

  if (!records.length) return null

  return (
    <div className="active-focus" ref={rootRef}>
      <button
        className={`active-focus-trigger${isOpen ? ' active' : ''}`}
        type="button"
        aria-label={`진행 중인 집중 ${records.length}개, 순수 집중시간 ${formatFocusTimer(pureSeconds)}`}
        aria-controls="active-focus-popover"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <i aria-hidden="true" />
        <span>집중 {records.length}개</span>
        <strong>순수 {formatFocusTimer(pureSeconds)}</strong>
      </button>

      {isOpen && (
        <section
          className="active-focus-popover"
          id="active-focus-popover"
          role="dialog"
          aria-labelledby="active-focus-title"
        >
          <header>
            <div>
              <p>LIVE FOCUS</p>
              <h2 id="active-focus-title">진행 중인 집중 {records.length}개</h2>
            </div>
            <button type="button" aria-label="진행 중인 집중 닫기" onClick={onClose}>
              ×
            </button>
          </header>

          <ul className="active-focus-list">
            {records.map((record) => (
              <li key={record.id}>
                <button
                  className="active-focus-link"
                  type="button"
                  onClick={() => onSelect(record)}
                >
                  <span>{record.sourceType === 'todo' ? '개인 할 일' : '모임 활동'}</span>
                  <strong>{record.title}</strong>
                </button>
                <time>{formatFocusTimer(getFocusDurationSeconds(record, nowMs))}</time>
                <button
                  className="active-focus-stop"
                  type="button"
                  aria-label={`${record.title} 집중 멈춤`}
                  onClick={() => onStop(record.id)}
                >
                  멈춤
                </button>
              </li>
            ))}
          </ul>

          <dl className="active-focus-summary">
            <div>
              <dt>순수 집중시간</dt>
              <dd>{formatFocusTimer(pureSeconds)}</dd>
            </div>
            <div>
              <dt>작업별 시간 합계</dt>
              <dd>{formatFocusTimer(totalSeconds)}</dd>
            </div>
            {totalSeconds > pureSeconds && (
              <div className="overlap">
                <dt>겹쳐서 기록 중</dt>
                <dd>{formatFocusTimer(totalSeconds - pureSeconds)}</dd>
              </div>
            )}
          </dl>

          {isConfirmingStopAll ? (
            <div className="active-focus-confirm" role="alert">
              <p>진행 중인 집중을 모두 마칠까요?</p>
              <div>
                <button type="button" onClick={() => setIsConfirmingStopAll(false)}>
                  취소
                </button>
                <button type="button" onClick={onStopAll}>
                  모두 멈춤
                </button>
              </div>
            </div>
          ) : (
            <button
              className="active-focus-stop-all"
              type="button"
              onClick={() => setIsConfirmingStopAll(true)}
            >
              모두 멈춤
            </button>
          )}
        </section>
      )}
    </div>
  )
}
