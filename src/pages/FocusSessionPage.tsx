import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { FocusRecord, FocusSourceType } from '../data/focusRecords'
import type { Todo } from '../data/initialData'
import { getFocusDurationSeconds } from '../lib/focus'
import {
  formatTimer,
  getTaskEstimate,
  getTaskProject,
} from '../lib/task'

type FocusSessionPageProps = {
  todo?: Todo
  activeRecord?: FocusRecord
  nowMs: number
  onStartFocus: (
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
  ) => void
  onStopFocus: (recordId: string) => void
}

export default function FocusSessionPage({
  todo,
  activeRecord,
  nowMs,
  onStartFocus,
  onStopFocus,
}: FocusSessionPageProps) {
  const navigate = useNavigate()
  const hasStartedOnEntry = useRef(false)
  const previousActiveRecord = useRef<FocusRecord | undefined>(undefined)
  const [pausedSeconds, setPausedSeconds] = useState(0)

  useEffect(() => {
    if (!todo || hasStartedOnEntry.current) return
    hasStartedOnEntry.current = true
    if (!activeRecord) onStartFocus('todo', todo.id, todo.text)
  }, [activeRecord, onStartFocus, todo])

  useEffect(() => {
    if (activeRecord) {
      previousActiveRecord.current = activeRecord
      return
    }

    if (previousActiveRecord.current) {
      setPausedSeconds(
        getFocusDurationSeconds(previousActiveRecord.current, Date.now()),
      )
      previousActiveRecord.current = undefined
    }
  }, [activeRecord])

  if (!todo) {
    return (
      <main className="task-flow-page task-missing">
        <span aria-hidden="true">?</span>
        <h1>집중할 작업을 찾을 수 없어요.</h1>
        <Link to="/todos">할 일 목록으로</Link>
      </main>
    )
  }

  const isRunning = Boolean(activeRecord)
  const elapsedSeconds = activeRecord
    ? getFocusDurationSeconds(activeRecord, nowMs)
    : pausedSeconds
  const estimateSeconds = getTaskEstimate(todo) * 60
  const progress = Math.min((elapsedSeconds / estimateSeconds) * 360, 360)

  const finishSession = () => {
    if (activeRecord) onStopFocus(activeRecord.id)
    navigate(`/todos/${todo.id}/result`)
  }

  const toggleSession = () => {
    if (activeRecord) {
      setPausedSeconds(getFocusDurationSeconds(activeRecord, nowMs))
      onStopFocus(activeRecord.id)
      return
    }

    setPausedSeconds(0)
    onStartFocus('todo', todo.id, todo.text)
  }

  return (
    <main className="focus-session-page">
      <div className="focus-session-topline">
        <Link to={`/todos/${todo.id}`}>
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
