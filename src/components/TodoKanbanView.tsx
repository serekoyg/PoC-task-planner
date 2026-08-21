import type { CSSProperties } from 'react'
import type { Todo } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import type { ProjectFilter } from '../data/projects'
import type {
  FocusRecord,
  FocusRecordContext,
  FocusSourceType,
} from '../data/focusRecords'
import { formatTaskDate, getTaskPriority } from '../lib/task'
import { getBucketTodos, getTodoProjectBuckets } from '../lib/todoView'
import FocusToggleButton from './FocusToggleButton'

type TodoKanbanViewProps = {
  todos: Todo[]
  projects: PlannerProject[]
  focusRecords: FocusRecord[]
  selectedProjectId: ProjectFilter
  onToggleTodo: (todoId: string) => void
  onEditTodo: (todo: Todo) => void
  onStartFocus: (
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
    context?: FocusRecordContext,
  ) => void
  onPauseFocus: (recordId: string) => void
}

export default function TodoKanbanView({
  todos,
  projects,
  focusRecords,
  selectedProjectId,
  onToggleTodo,
  onEditTodo,
  onStartFocus,
  onPauseFocus,
}: TodoKanbanViewProps) {
  const buckets = getTodoProjectBuckets(projects, selectedProjectId)

  return (
    <section className="todo-kanban" aria-label="목록별 할 일 칸반">
      <div className="todo-kanban-board">
        {buckets.map((bucket) => {
          const bucketTodos = getBucketTodos(todos, bucket)
          const openCount = bucketTodos.filter((todo) => !todo.done).length

          return (
            <section
              className="todo-kanban-column project-color-surface"
              style={{ '--project-color': bucket.color } as CSSProperties}
              key={bucket.id}
            >
              <header>
                <span className="todo-project-dot" style={{ backgroundColor: bucket.color }} aria-hidden="true" />
                <strong>{bucket.name}</strong>
                <small>{openCount}/{bucketTodos.length}</small>
              </header>

              <div className="todo-kanban-cards">
                {bucketTodos.map((todo) => {
                  const focusRecord = focusRecords.find(
                    (record) =>
                      record.sourceType === 'todo' && record.sourceId === todo.id,
                  )
                  return (
                    <article
                    className={`todo-kanban-card${todo.done ? ' completed' : ''}`}
                    key={todo.id}
                  >
                    <div className="todo-kanban-card-heading">
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
                      <span className={`priority-badge ${todo.priority}`}>
                        {getTaskPriority(todo)}
                      </span>
                    </div>
                    <button
                      className="todo-item-title-button"
                      type="button"
                      onClick={() => onEditTodo(todo)}
                    >
                      {todo.text}
                    </button>
                    <time dateTime={todo.date}>{formatTaskDate(todo.date)}</time>
                    <div>
                      {todo.dueTime && <span>마감 {todo.dueTime}</span>}
                      <FocusToggleButton
                        label={`${todo.text} 집중`}
                        record={focusRecord}
                        onStart={() => onStartFocus('todo', todo.id, todo.text)}
                        onPause={onPauseFocus}
                      />
                    </div>
                  </article>
                  )
                })}

                {!bucketTodos.length && (
                  <div className="todo-kanban-empty">
                    <span aria-hidden="true">＋</span>
                    <p>등록된 할 일이 없어요.</p>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
