import { Link } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import {
  formatFocusedTime,
  formatTaskDate,
  getTaskEstimate,
  getTaskPriority,
  getTaskProject,
} from '../lib/task'

type TaskDetailPageProps = {
  todo?: Todo
  dateKey?: string
  focusedSeconds?: number
}

export default function TaskDetailPage({
  todo,
  dateKey,
  focusedSeconds = 0,
}: TaskDetailPageProps) {
  if (!todo || !dateKey) {
    return (
      <main className="task-flow-page task-missing">
        <span aria-hidden="true">?</span>
        <h1>할 일을 찾을 수 없어요.</h1>
        <p>목록에서 다시 할 일을 선택해 주세요.</p>
        <Link to="/todos">할 일 목록으로</Link>
      </main>
    )
  }

  const estimate = getTaskEstimate(todo)

  return (
    <main className="task-flow-page">
      <Link className="task-back-link" to="/todos">
        <span aria-hidden="true">←</span> 할 일 목록
      </Link>

      <section className="task-detail-card" aria-labelledby="task-title">
        <div className="task-detail-main">
          <div className="task-detail-badges">
            <span>{getTaskProject(todo)}</span>
            <span className={`task-priority ${getTaskPriority(todo)}`}>
              {getTaskPriority(todo)} 우선순위
            </span>
          </div>
          <p className="eyebrow">집중할 작업</p>
          <h1 id="task-title">{todo.text}</h1>
          <p className="task-detail-memo">
            {todo.note || todo.memo || '완료 조건을 떠올리고 한 번에 하나씩 집중해 보세요.'}
          </p>

          <dl className="task-facts">
            <div>
              <dt>예정일</dt>
              <dd>{formatTaskDate(dateKey)}</dd>
            </div>
            <div>
              <dt>예상 시간</dt>
              <dd>{estimate}분</dd>
            </div>
            <div>
              <dt>최근 집중</dt>
              <dd>{focusedSeconds ? formatFocusedTime(focusedSeconds) : '기록 없음'}</dd>
            </div>
          </dl>
        </div>

        <aside className="task-focus-invitation" aria-label="집중 시작 안내">
          <span className="focus-invitation-icon" aria-hidden="true">▶</span>
          <p>이 작업에만 집중할 시간</p>
          <strong>{estimate}분</strong>
          <small>
            타이머를 마치면 예상 시간과 실제 집중 시간을 비교할 수 있어요.
          </small>
          <Link to={`/todos/${todo.id}/focus`}>
            집중 시작 <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </section>

      <section className="task-flow-hint" aria-label="집중 흐름 안내">
        <span>1</span>
        <p><strong>타이머로 집중하고</strong> 방해받지 않은 시간을 기록해요.</p>
        <i aria-hidden="true">→</i>
        <span>2</span>
        <p><strong>결과를 돌아보고</strong> 완료하거나 다음 날짜로 옮겨요.</p>
      </section>
    </main>
  )
}
