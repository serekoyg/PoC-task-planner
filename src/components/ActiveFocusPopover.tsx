import { useEffect, useRef, useState } from 'react'
import type { FocusRecord } from '../data/focusRecords'
import {
  formatFocusTimer,
  getFocusDurationSeconds,
  getPureFocusSeconds,
  getTotalFocusSeconds,
  isFocusRecordRunning,
} from '../lib/focus'

type ActiveFocusPopoverProps = {
  records: FocusRecord[]
  nowMs: number
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onSelect: (record: FocusRecord) => void
  onPause: (recordId: string) => void
  onResume: (recordId: string) => void
  onPauseAll: () => void
}

export default function ActiveFocusPopover({
  records,
  nowMs,
  isOpen,
  onToggle,
  onClose,
  onSelect,
  onPause,
  onResume,
  onPauseAll,
}: ActiveFocusPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [isConfirmingStopAll, setIsConfirmingStopAll] = useState(false)
  const pureSeconds = getPureFocusSeconds(records, nowMs)
  const totalSeconds = getTotalFocusSeconds(records, nowMs)
  const runningRecords = records.filter(isFocusRecordRunning)
  const pausedCount = records.length - runningRecords.length
  const hasRunningFocus = runningRecords.length > 0

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

  return (
    <div className="active-focus" ref={rootRef}>
      <button
        className={`active-focus-trigger${hasRunningFocus ? ' running' : ' idle'}${isOpen ? ' active' : ''}`}
        type="button"
        aria-label={
          hasRunningFocus
            ? `진행 중인 집중 ${runningRecords.length}개, 순수 집중시간 ${formatFocusTimer(pureSeconds)}`
            : pausedCount
              ? `멈춘 집중 ${pausedCount}개, 재개 가능`
              : '진행 중인 집중 없음'
        }
        aria-controls="active-focus-popover"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <i aria-hidden="true" />
        <span>
          {hasRunningFocus
            ? `집중 ${runningRecords.length}개`
            : pausedCount
              ? `멈춤 ${pausedCount}개`
              : '집중 없음'}
        </span>
        <strong>
          {records.length ? `순수 ${formatFocusTimer(pureSeconds)}` : '시작 전'}
        </strong>
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
              <h2 id="active-focus-title">
                {hasRunningFocus
                  ? `진행 중인 집중 ${runningRecords.length}개`
                  : pausedCount
                    ? `멈춘 집중 ${pausedCount}개`
                    : '진행 중인 집중 없음'}
              </h2>
            </div>
            <button type="button" aria-label="진행 중인 집중 닫기" onClick={onClose}>
              ×
            </button>
          </header>

          {records.length ? (
            <ul className="active-focus-list">
              {records.map((record) => {
                const isRunning = isFocusRecordRunning(record)
                return (
              <li key={record.id}>
                <button
                  className="active-focus-link"
                  type="button"
                  onClick={() => onSelect(record)}
                >
                  <span>
                    {record.sourceType === 'todo' ? '개인 할 일' : '모임 활동'}
                    {' · '}
                    {isRunning ? '집중 중' : '멈춤'}
                  </span>
                  <strong>{record.title}</strong>
                </button>
                <time>{formatFocusTimer(getFocusDurationSeconds(record, nowMs))}</time>
                <button
                  className={isRunning ? 'active-focus-stop' : 'active-focus-resume'}
                  type="button"
                  aria-label={`${record.title} 집중 ${isRunning ? '멈춤' : '재개'}`}
                  onClick={() =>
                    isRunning ? onPause(record.id) : onResume(record.id)
                  }
                >
                  {isRunning ? '멈춤' : '재개'}
                </button>
              </li>
                )
              })}
            </ul>
          ) : (
            <div className="active-focus-empty">
              <span aria-hidden="true">○</span>
              <strong>지금은 진행 중인 집중이 없어요.</strong>
              <p>할 일이나 모임 활동에서 집중을 시작해보세요.</p>
            </div>
          )}

          {records.length > 0 && <dl className="active-focus-summary">
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
          </dl>}

          {hasRunningFocus && (isConfirmingStopAll ? (
            <div className="active-focus-confirm" role="alert">
              <p>진행 중인 집중을 모두 멈출까요? 나중에 다시 재개할 수 있어요.</p>
              <div>
                <button type="button" onClick={() => setIsConfirmingStopAll(false)}>
                  취소
                </button>
                <button type="button" onClick={onPauseAll}>
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
          ))}
        </section>
      )}
    </div>
  )
}
