import { type CSSProperties, FormEvent, useMemo, useState } from 'react'
import type { Todo } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import { formatSelectedDate, moveDate } from '../lib/date'

type TodosPageProps = {
  today: Date
  selectedDate: Date
  todos: Todo[]
  onSelectDate: (date: Date) => void
  onAddTodo: (text: string) => void
  onToggleTodo: (todoId: string) => void
  onRemoveTodo: (todoId: string) => void
}

type TodoFilter = 'all' | 'open' | 'done'

const filterOptions: Array<{ value: TodoFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '할 일' },
  { value: 'done', label: '완료' },
]

export default function TodosPage({
  today,
  selectedDate,
  todos,
  onSelectDate,
  onAddTodo,
  onToggleTodo,
  onRemoveTodo,
}: TodosPageProps) {
  const [todoText, setTodoText] = useState('')
  const [filter, setFilter] = useState<TodoFilter>('all')
  const completedCount = todos.filter((todo) => todo.done).length
  const remainingCount = todos.length - completedCount
  const completionRate = todos.length
    ? Math.round((completedCount / todos.length) * 100)
    : 0
  const isToday = toDateKey(selectedDate) === toDateKey(today)
  const visibleTodos = useMemo(
    () =>
      todos.filter((todo) => {
        if (filter === 'open') return !todo.done
        if (filter === 'done') return todo.done
        return true
      }),
    [filter, todos],
  )

  const addTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = todoText.trim()
    if (!text) return

    onAddTodo(text)
    setTodoText('')
    setFilter('all')
  }

  const progressMessage = !todos.length
    ? '첫 번째 할 일을 적어 오늘의 흐름을 만들어 보세요.'
    : completionRate === 100
      ? '오늘 계획한 일을 모두 끝냈어요. 충분히 잘해냈습니다.'
      : completionRate >= 50
        ? '절반을 넘었어요. 지금의 리듬을 그대로 이어가세요.'
        : '가장 가벼운 일부터 하나씩 완료해 보세요.'

  return (
    <main className="page todos-page">
      <section className="page-heading todo-page-heading" aria-labelledby="todo-page-title">
        <div>
          <p className="eyebrow">Tasks</p>
          <h1 id="todo-page-title">
            {isToday ? '오늘의 할 일' : '선택한 날의 할 일'}
          </h1>
          <p className="selected-date-copy">{formatSelectedDate(selectedDate)}</p>
        </div>
        <div className="date-navigation" aria-label="할 일 날짜 이동">
          <button
            type="button"
            onClick={() => onSelectDate(moveDate(selectedDate, -1))}
            aria-label="이전 날짜"
          >
            ‹
          </button>
          <button
            className="date-today-button"
            type="button"
            onClick={() => onSelectDate(today)}
            disabled={isToday}
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(moveDate(selectedDate, 1))}
            aria-label="다음 날짜"
          >
            ›
          </button>
        </div>
      </section>

      <div className="todo-layout">
        <section className="todo-list-card" aria-labelledby="todo-list-title">
          <div className="todo-list-header">
            <div>
              <p className="section-label">할 일 목록</p>
              <h2 id="todo-list-title">
                {remainingCount ? `${remainingCount}개가 남아 있어요` : '모두 완료했어요'}
              </h2>
            </div>
            <span className="task-count">{completedCount}/{todos.length}</span>
          </div>

          <form className="todo-form" onSubmit={addTodo}>
            <label className="sr-only" htmlFor="new-todo">
              새 할 일
            </label>
            <span className="todo-input-icon" aria-hidden="true">＋</span>
            <input
              id="new-todo"
              type="text"
              value={todoText}
              onChange={(event) => setTodoText(event.target.value)}
              placeholder="새로운 할 일을 입력하세요"
            />
            <button type="submit" disabled={!todoText.trim()}>
              추가
            </button>
          </form>

          <div className="todo-toolbar">
            <div className="todo-filters" aria-label="할 일 필터">
              {filterOptions.map((option) => (
                <button
                  className={filter === option.value ? 'active' : ''}
                  type="button"
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  aria-pressed={filter === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span>{visibleTodos.length}개 표시</span>
          </div>

          <ul className="todo-list">
            {visibleTodos.map((todo) => (
              <li className={todo.done ? 'completed' : ''} key={todo.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => onToggleTodo(todo.id)}
                  />
                  <span className="custom-checkbox" aria-hidden="true">✓</span>
                  <span className="todo-text">{todo.text}</span>
                </label>
                <button
                  className="delete-todo"
                  type="button"
                  onClick={() => onRemoveTodo(todo.id)}
                  aria-label={`${todo.text} 삭제`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          {!visibleTodos.length && (
            <div className="empty-todos">
              <span aria-hidden="true">✓</span>
              <p>{todos.length ? '이 조건에 맞는 할 일이 없어요.' : '아직 할 일이 없어요.'}</p>
              <small>
                {todos.length
                  ? '다른 필터를 선택해 보세요.'
                  : '위 입력창에서 오늘 할 일을 추가해 보세요.'}
              </small>
            </div>
          )}
        </section>

        <aside className="todo-insight-card" aria-labelledby="progress-title">
          <div className="insight-heading">
            <div>
              <p className="section-label">오늘의 페이스</p>
              <h2 id="progress-title">진행률</h2>
            </div>
          </div>

          <div
            className="progress-ring"
            style={{ '--progress': `${completionRate * 3.6}deg` } as CSSProperties}
            aria-label={`할 일 ${completionRate}% 완료`}
          >
            <div>
              <strong>{completionRate}%</strong>
              <span>완료</span>
            </div>
          </div>

          <p className="progress-message">{progressMessage}</p>

          <dl className="todo-stats">
            <div>
              <dt>완료</dt>
              <dd>{completedCount}</dd>
            </div>
            <div>
              <dt>남은 일</dt>
              <dd>{remainingCount}</dd>
            </div>
            <div>
              <dt>전체</dt>
              <dd>{todos.length}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  )
}
