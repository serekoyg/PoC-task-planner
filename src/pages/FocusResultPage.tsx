import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import {
  formatFocusedTime,
  getTaskEstimate,
} from '../lib/task'

const AUTO_CLOSE_MS = 3000
const COUNTDOWN_INTERVAL_MS = 50

type FocusResultPageProps = {
  todo?: Todo
  focusedSeconds?: number
}

export default function FocusResultPage({
  todo,
  focusedSeconds = 0,
}: FocusResultPageProps) {
  const navigate = useNavigate()
  const [remainingMs, setRemainingMs] = useState(AUTO_CLOSE_MS)
  const closeResult = useCallback(
    () => navigate('/todos', { replace: true }),
    [navigate],
  )

  useEffect(() => {
    if (!todo) return

    const startedAt = performance.now()
    const countdownTimer = window.setInterval(() => {
      setRemainingMs(
        Math.max(0, AUTO_CLOSE_MS - (performance.now() - startedAt)),
      )
    }, COUNTDOWN_INTERVAL_MS)
    const closeTimer = window.setTimeout(closeResult, AUTO_CLOSE_MS)

    return () => {
      window.clearInterval(countdownTimer)
      window.clearTimeout(closeTimer)
    }
  }, [closeResult, todo])

  if (!todo) {
    return (
      <main className="task-flow-page task-missing">
        <span aria-hidden="true">?</span>
        <h1>집중 결과를 찾을 수 없어요.</h1>
        <Link to="/todos">할 일 목록으로</Link>
      </main>
    )
  }

  const estimate = getTaskEstimate(todo)
  const actualMinutes = Math.round(focusedSeconds / 60)
  const difference = actualMinutes - estimate
  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000))
  const remainingProgress = Math.max(
    0,
    Math.min(100, (remainingMs / AUTO_CLOSE_MS) * 100),
  )

  return (
    <main className="task-flow-page focus-result-page">
      <section className="focus-result-card" aria-labelledby="focus-result-title">
        <span className="result-check" aria-hidden="true">✓</span>
        <p className="eyebrow">집중 기록 완료</p>
        <h1 id="focus-result-title">집중을 마쳤어요</h1>
        <p className="focus-result-description">
          <strong>{todo.text}</strong>에 집중한 시간을 기록했어요.
        </p>

        <div className="focus-result-summary">
          <div>
            <span>실제 집중</span>
            <strong>{formatFocusedTime(focusedSeconds)}</strong>
          </div>
          <div>
            <span>예상 시간</span>
            <strong>{estimate}분</strong>
          </div>
        </div>

        <p className="focus-result-comparison">
          {difference === 0
            ? '예상한 시간만큼 집중했어요.'
            : difference > 0
              ? `예상보다 ${difference}분 더 집중했어요.`
              : `예상보다 ${Math.abs(difference)}분 일찍 마쳤어요.`}
        </p>

        <div className="focus-result-countdown">
          <div>
            <span>할 일 목록으로 돌아가요</span>
            <strong aria-live="polite">{remainingSeconds}초</strong>
          </div>
          <div
            className="focus-result-progress"
            role="progressbar"
            aria-label="자동 닫기까지 남은 시간"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(remainingProgress)}
          >
            <span style={{ width: `${remainingProgress}%` }} />
          </div>
        </div>

        <button
          className="focus-result-close"
          type="button"
          onClick={closeResult}
        >
          닫기
        </button>
      </section>
    </main>
  )
}
