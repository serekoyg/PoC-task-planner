import { type CSSProperties, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TodoEditorModal from '../components/TodoEditorModal'
import type { Todo, TodoInput } from '../data/initialData'
import { formatSelectedDate, moveDate } from '../lib/date'
import { getTaskEstimate, getTaskProject } from '../lib/task'

type TodosPageProps = {
  today: Date
  selectedDate: Date
  todos: Todo[]
  onSelectDate: (date: Date) => void
  onAddTodo: (todo: TodoInput) => void
  onUpdateTodo: (todoId: string, todo: TodoInput) => void
  onToggleTodo: (todoId: string) => void
  onRemoveTodo: (todoId: string) => void
}

const priorityLabels: Record<Todo['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

const reminderLabels: Record<Todo['reminder'], string> = {
  none: '',
  '10m': '10분 전 알림',
  '30m': '30분 전 알림',
  '1h': '1시간 전 알림',
  '1d': '1일 전 알림',
}

const priorityOrder: Record<Todo['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export default function TodosPage({
  today,
  selectedDate,
  todos,
  onSelectDate,
  onAddTodo,
  onUpdateTodo,
  onToggleTodo,
  onRemoveTodo,
}: TodosPageProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo>()
  const completedCount = todos.filter((todo) => todo.done).length
  const completionRate = todos.length
    ? Math.round((completedCount / todos.length) * 100)
    : 0
  const sortedTodos = useMemo(
    () =>
      [...todos].sort((first, second) => {
        if (first.done !== second.done) return first.done ? 1 : -1
        const priorityDifference =
          priorityOrder[first.priority] - priorityOrder[second.priority]
        if (priorityDifference) return priorityDifference
        return (first.dueTime || '99:99').localeCompare(
          second.dueTime || '99:99',
        )
      }),
    [todos],
  )

  const closeEditor = () => {
    setIsCreating(false)
    setEditingTodo(undefined)
  }

  return (
    <main className="todos-page">
      <section className="todo-page-heading" aria-labelledby="todo-page-title">
        <div>
          <p className="eyebrow">나의 할 일</p>
          <h1 id="todo-page-title">{formatSelectedDate(selectedDate)}</h1>
          <p className="page-description">
            완료할 일을 우선순위와 마감 시간으로 구체적으로 관리해 보세요.
          </p>
        </div>
        <div className="todo-heading-actions">
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
          <button
            className="add-todo-button"
            type="button"
            onClick={() => setIsCreating(true)}
          >
            <span aria-hidden="true">＋</span>
            새 할 일
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

        <div className="todo-list-heading">
          <div>
            <strong>할 일 목록</strong>
            <span>미완료 항목은 우선순위와 마감 시간 순으로 보여요.</span>
          </div>
          <span>{todos.length}개</span>
        </div>

        <ul className="todo-list todo-page-list">
          {sortedTodos.map((todo) => (
            <li
              className={`${todo.done ? 'completed' : ''} color-${todo.color}`}
              key={todo.id}
            >
              <label className="todo-check-control">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => onToggleTodo(todo.id)}
                />
                <span className="custom-checkbox" aria-hidden="true">✓</span>
                <span className="sr-only">
                  {todo.done ? `${todo.text} 완료 취소` : `${todo.text} 완료`}
                </span>
              </label>

              <div className="todo-item-content">
                <div className="todo-item-title-row">
                  <span className="todo-kind-badge">할 일</span>
                  <Link className="todo-title-link" to={`/todos/${todo.id}`}>
                    <span className="todo-text">{todo.text}</span>
                  </Link>
                </div>
                <div className="todo-item-meta">
                  <span className={`priority-badge ${todo.priority}`}>
                    우선순위 {priorityLabels[todo.priority]}
                  </span>
                  <span>{todo.category}</span>
                  <span>{getTaskProject(todo)} · 예상 {getTaskEstimate(todo)}분</span>
                  {todo.dueTime && <span>마감 {todo.dueTime}</span>}
                  {reminderLabels[todo.reminder] && (
                    <span>◷ {reminderLabels[todo.reminder]}</span>
                  )}
                </div>
                {todo.note && <p className="todo-note">{todo.note}</p>}
              </div>

              <div className="todo-item-actions">
                <Link
                  className="todo-detail-link"
                  to={`/todos/${todo.id}`}
                  aria-label={`${todo.text} 상세 보기`}
                >
                  상세 <span aria-hidden="true">›</span>
                </Link>
                <button
                  className="edit-todo-button"
                  type="button"
                  onClick={() => setEditingTodo(todo)}
                  aria-label={`${todo.text} 편집`}
                >
                  편집
                </button>
              </div>
            </li>
          ))}
        </ul>

        {!todos.length && (
          <div className="empty-todos">
            <span aria-hidden="true">✓</span>
            <p>이날의 할 일을 모두 비웠어요.</p>
            <small>완료할 일이 생기면 날짜와 우선순위를 함께 정해 보세요.</small>
            <button type="button" onClick={() => setIsCreating(true)}>
              첫 할 일 추가
            </button>
          </div>
        )}
      </section>

      {(isCreating || editingTodo) && (
        <TodoEditorModal
          selectedDate={selectedDate}
          todo={editingTodo}
          onClose={closeEditor}
          onSave={(input) => {
            if (editingTodo) onUpdateTodo(editingTodo.id, input)
            else onAddTodo(input)
            closeEditor()
          }}
          onDelete={
            editingTodo
              ? () => {
                  onRemoveTodo(editingTodo.id)
                  closeEditor()
                }
              : undefined
          }
        />
      )}
    </main>
  )
}
