import { type CSSProperties, FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import { formatSelectedDate, moveDate } from '../lib/date'
import { getTaskEstimate, getTaskProject } from '../lib/task'

type TodosPageProps = {
  today: Date
  selectedDate: Date
  todos: Todo[]
  onSelectDate: (date: Date) => void
  onAddTodo: (text: string) => void
  onToggleTodo: (todoId: string) => void
  onRemoveTodo: (todoId: string) => void
}

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
  const completedCount = todos.filter((todo) => todo.done).length
  const completionRate = todos.length
    ? Math.round((completedCount / todos.length) * 100)
    : 0

  const addTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = todoText.trim()
    if (!text) return

    onAddTodo(text)
    setTodoText('')
  }

  return (
    <main className="todos-page">
      <section className="todo-page-heading" aria-labelledby="todo-page-title">
        <div>
          <p className="eyebrow">나의 할 일</p>
          <h1 id="todo-page-title">{formatSelectedDate(selectedDate)}</h1>
          <p className="page-description">
            오늘 해야 할 일에만 집중하고, 하나씩 가볍게 완료해 보세요.
          </p>
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

      <section className="todo-workspace" aria-label="할 일 관리">
        <div className="todo-summary">
          <div
            className="progress-ring"
            style={{ '--progress': `${completionRate * 3.6}deg` } as CSSProperties}
            aria-label={`할 일 ${completionRate}% 완료`}
          >
            <span>{completionRate}%</span>
          </div>
          <div>
            <p>오늘의 진행률</p>
            <strong>
              {completedCount}개 완료 · {todos.length - completedCount}개 남음
            </strong>
          </div>
          <span className="task-count">
            {completedCount}/{todos.length}
          </span>
        </div>

        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${completionRate}%` }} />
        </div>

        <form className="todo-form todo-page-form" onSubmit={addTodo}>
          <label className="sr-only" htmlFor="new-todo">
            새 할 일
          </label>
          <input
            id="new-todo"
            type="text"
            value={todoText}
            onChange={(event) => setTodoText(event.target.value)}
            placeholder="새로운 할 일을 입력하세요"
          />
          <button type="submit" aria-label="할 일 추가">
            ＋
          </button>
        </form>

        <ul className="todo-list todo-page-list">
          {todos.map((todo) => (
            <li className={todo.done ? 'completed' : ''} key={todo.id}>
              <label className="todo-check">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => onToggleTodo(todo.id)}
                />
                <span className="custom-checkbox" aria-hidden="true">
                  ✓
                </span>
                <span className="sr-only">{todo.text} 완료 상태 변경</span>
              </label>
              <Link className="todo-task-link" to={`/todos/${todo.id}`}>
                <span className="todo-text">{todo.text}</span>
                <small>
                  {getTaskProject(todo)} · 예상 {getTaskEstimate(todo)}분
                </small>
              </Link>
              <Link
                className="todo-detail-link"
                to={`/todos/${todo.id}`}
                aria-label={`${todo.text} 상세 보기`}
              >
                상세 <span aria-hidden="true">›</span>
              </Link>
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

        {!todos.length && (
          <div className="empty-todos">
            <span aria-hidden="true">✓</span>
            <p>이날의 할 일을 모두 비웠어요.</p>
            <small>가벼운 마음으로 새 할 일을 추가해 보세요.</small>
          </div>
        )}
      </section>
    </main>
  )
}
