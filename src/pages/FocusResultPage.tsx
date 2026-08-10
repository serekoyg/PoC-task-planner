import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import {
  formatFocusedTime,
  formatTaskDate,
  getTaskEstimate,
  getTaskProject,
} from '../lib/task'

type FocusResultPageProps = {
  todo?: Todo
  dateKey?: string
  focusedSeconds?: number
  onComplete: (todoId: string, dateKey: string) => void
  onReschedule: (todoId: string, fromDateKey: string, toDateKey: string) => void
}

export default function FocusResultPage({
  todo,
  dateKey,
  focusedSeconds = 0,
  onComplete,
  onReschedule,
}: FocusResultPageProps) {
  const navigate = useNavigate()
  const tomorrowKey = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return toDateKey(tomorrow)
  }, [])
  const [rescheduleDate, setRescheduleDate] = useState(tomorrowKey)

  if (!todo || !dateKey) {
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

  const completeTask = () => {
    onComplete(todo.id, dateKey)
    navigate('/todos')
  }

  const rescheduleTask = () => {
    onReschedule(todo.id, dateKey, rescheduleDate)
    navigate('/todos')
  }

  return (
    <main className="task-flow-page focus-result-page">
      <section className="focus-result-hero" aria-labelledby="focus-result-title">
        <span className="result-check" aria-hidden="true">✓</span>
        <p className="eyebrow">집중 세션 종료</p>
        <h1 id="focus-result-title">한 번의 집중을 마쳤어요</h1>
        <p><strong>{todo.text}</strong>에 집중한 시간을 기록했어요.</p>

        <div className="focus-result-metrics">
          <div>
            <span>예상 시간</span>
            <strong>{estimate}분</strong>
          </div>
          <div className="actual">
            <span>실제 집중</span>
            <strong>{formatFocusedTime(focusedSeconds)}</strong>
          </div>
          <div>
            <span>예상과 차이</span>
            <strong>
              {difference === 0
                ? '계획대로'
                : `${Math.abs(difference)}분 ${difference > 0 ? '더 사용' : '일찍 종료'}`}
            </strong>
          </div>
        </div>
      </section>

      <section className="focus-next-step" aria-labelledby="next-step-title">
        <div className="focus-next-heading">
          <div>
            <p className="eyebrow">다음 선택</p>
            <h2 id="next-step-title">이 작업을 어떻게 할까요?</h2>
          </div>
          <span>{getTaskProject(todo)}</span>
        </div>

        <div className="focus-next-grid">
          <article className="finish-task-option">
            <span aria-hidden="true">✓</span>
            <div>
              <h3>작업 완료하기</h3>
              <p>충분히 끝냈다면 할 일 목록에서 완료 상태로 바꿔요.</p>
            </div>
            <button type="button" onClick={completeTask}>완료로 표시</button>
          </article>

          <article className="reschedule-task-option">
            <span aria-hidden="true">↗</span>
            <div>
              <h3>다음 시간으로 재계획</h3>
              <p>조금 더 필요하다면 이어서 집중할 날짜를 정해요.</p>
            </div>
            <label>
              <span className="sr-only">재계획 날짜</span>
              <input
                type="date"
                min={toDateKey(new Date())}
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </label>
            <button type="button" onClick={rescheduleTask} disabled={!rescheduleDate}>
              {rescheduleDate ? `${formatTaskDate(rescheduleDate)}로 옮기기` : '날짜 선택'}
            </button>
          </article>
        </div>

        <Link className="focus-again-link" to={`/todos/${todo.id}/focus`}>
          아직 흐름이 남았어요 · 다시 집중하기 <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  )
}
