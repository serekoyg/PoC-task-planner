import { useEffect, useRef, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { FocusRecord, FocusSourceType } from '../data/focusRecords'
import type { Todo } from '../data/initialData'
import { getFocusDurationSeconds, isFocusRecordRunning } from '../lib/focus'
import {
  formatTimer,
  getTaskEstimate,
  getTaskProject,
} from '../lib/task'

type FocusSessionPageProps = {
  todo?: Todo
  record?: FocusRecord
  nowMs: number
  onStartFocus: (
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
  ) => void
  onPauseFocus: (recordId: string) => void
  onFinishFocus: (recordId: string) => void
}

export default function FocusSessionPage({
  todo,
  record,
  nowMs,
  onStartFocus,
  onPauseFocus,
  onFinishFocus,
}: FocusSessionPageProps) {
  const navigate = useNavigate()
  const hasStartedOnEntry = useRef(false)

  useEffect(() => {
    if (!todo || hasStartedOnEntry.current) return
    hasStartedOnEntry.current = true
    if (!record) onStartFocus('todo', todo.id, todo.text)
  }, [record, onStartFocus, todo])

  if (!todo) {
    return (
      <main className="task-flow-page task-missing">
        <span aria-hidden="true">?</span>
        <h1>집중할 작업을 찾을 수 없어요.</h1>
        <Link to="/todos">할 일 목록으로</Link>
      </main>
    )
  }

  const isRunning = Boolean(record && isFocusRecordRunning(record))
  const elapsedSeconds = record ? getFocusDurationSeconds(record, nowMs) : 0
  const estimateSeconds = getTaskEstimate(todo) * 60
  const progress = Math.min((elapsedSeconds / estimateSeconds) * 360, 360)

  const finishSession = () => {
    if (record) onFinishFocus(record.id)
    navigate(`/todos/${todo.id}/result`)
  }

  const toggleSession = () => {
    if (record && isRunning) {
      onPauseFocus(record.id)
      return
    }

    onStartFocus('todo', todo.id, todo.text)
  }

  return (
    <main className="focus-session-page">
      <div className="focus-session-topline">
        <Link to="/todos">
          <span aria-hidden="true">×</span> 집중 나가기
        </Link>
        <span className={isRunning ? 'focus-status running' : 'focus-status'}>
          <i aria-hidden="true" /> {isRunning ? '집중 중' : '잠시 멈춤'}
        </span>
      </div>

      <section className="focus-session-stage" aria-labelledby="focus-task-title">
        <p className="focus-project">{getTaskProject(todo)}</p>
        <h1 id="focus-task-title">{todo.text}</h1>
        <p className="focus-session-copy">
          페이지를 나가거나 다른 집중을 시작해도 이 기록은 계속 이어져요.
        </p>

        <div
          className="focus-timer-ring"
          style={{ '--timer-progress': `${progress}deg` } as CSSProperties}
        >
          <div>
            <small>집중 시간</small>
            <time aria-live="polite">{formatTimer(elapsedSeconds)}</time>
            <span>목표 {getTaskEstimate(todo)}분</span>
          </div>
        </div>

        <div className="focus-session-actions">
          <button
            className="focus-pause-button"
            type="button"
            onClick={toggleSession}
          >
            <span aria-hidden="true">{isRunning ? 'Ⅱ' : '▶'}</span>
            {isRunning ? '잠시 멈춤' : '다시 시작'}
          </button>
          <button className="focus-finish-button" type="button" onClick={finishSession}>
            <span aria-hidden="true">■</span> 집중 마치기
          </button>
        </div>
      </section>

      <p className="focus-session-tip">
        <span aria-hidden="true">✦</span> 짧게 끝나도 괜찮아요. 실제로 집중한 시간이 다음 계획을 더 정확하게 만들어요.
      </p>
    </main>
  )
}
