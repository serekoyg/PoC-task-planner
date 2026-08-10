import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import {
  formatTimer,
  getTaskEstimate,
  getTaskProject,
} from '../lib/task'

type FocusSessionPageProps = {
  todo?: Todo
  onFinish: (todoId: string, elapsedSeconds: number) => void
}

export default function FocusSessionPage({ todo, onFinish }: FocusSessionPageProps) {
  const navigate = useNavigate()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    if (!isRunning) return

    const timer = window.setInterval(
      () => setElapsedSeconds((seconds) => seconds + 1),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [isRunning])

  if (!todo) {
    return (
      <main className="task-flow-page task-missing">
        <span aria-hidden="true">?</span>
        <h1>집중할 작업을 찾을 수 없어요.</h1>
        <Link to="/todos">할 일 목록으로</Link>
      </main>
    )
  }

  const estimateSeconds = getTaskEstimate(todo) * 60
  const progress = Math.min((elapsedSeconds / estimateSeconds) * 360, 360)

  const finishSession = () => {
    onFinish(todo.id, elapsedSeconds)
    navigate(`/todos/${todo.id}/result`)
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
        <p className="focus-session-copy">지금은 이 한 가지에만 집중해요.</p>

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
            onClick={() => setIsRunning((current) => !current)}
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
