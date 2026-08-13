import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import type { Todo } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import { formatTaskDate, getTaskPriority } from '../lib/task'
import { getBucketTodos, getTodoProjectBuckets } from '../lib/todoView'
import type { ProjectFilter } from './ProjectSidebar'
import TodoPlayLink from './TodoPlayLink'

const PROJECT_BATCH_SIZE = 2

type TodoProjectListViewProps = {
  todos: Todo[]
  projects: PlannerProject[]
  selectedProjectId: ProjectFilter
  onToggleTodo: (todoId: string) => void
  onEditTodo: (todo: Todo) => void
}

export default function TodoProjectListView({
  todos,
  projects,
  selectedProjectId,
  onToggleTodo,
  onEditTodo,
}: TodoProjectListViewProps) {
  const buckets = useMemo(
    () => getTodoProjectBuckets(projects, selectedProjectId),
    [projects, selectedProjectId],
  )
  const [visibleProjectCount, setVisibleProjectCount] = useState(
    PROJECT_BATCH_SIZE,
  )
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const hasMore = visibleProjectCount < buckets.length

  useEffect(() => {
    setVisibleProjectCount(PROJECT_BATCH_SIZE)
  }, [buckets.length, selectedProjectId])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMore) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setVisibleProjectCount((current) =>
        Math.min(current + PROJECT_BATCH_SIZE, buckets.length),
      )
    }, { rootMargin: '160px' })

    observer.observe(target)
    return () => observer.disconnect()
  }, [buckets.length, hasMore, visibleProjectCount])

  return (
    <section className="todo-project-list" aria-label="목록별 전체 할 일">
      {buckets.slice(0, visibleProjectCount).map((bucket) => {
        const bucketTodos = getBucketTodos(todos, bucket)

        return (
          <section
            className="todo-project-section project-color-surface"
            style={{ '--project-color': bucket.color } as CSSProperties}
            key={bucket.id}
          >
            <header>
              <div>
                <span className="todo-project-dot" style={{ backgroundColor: bucket.color }} aria-hidden="true" />
                <h2>{bucket.name}</h2>
              </div>
              <span>{bucketTodos.length}개</span>
            </header>

            <div className="todo-project-rows">
              {bucketTodos.map((todo) => (
                <article
                  className={`todo-project-row${todo.done ? ' completed' : ''}`}
                  key={todo.id}
                >
                  <time dateTime={todo.date}>{formatTaskDate(todo.date)}</time>
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
                  <div>
                    <button
                      className="todo-item-title-button"
                      type="button"
                      onClick={() => onEditTodo(todo)}
                    >
                      {todo.text}
                    </button>
                    <span>
                      우선순위 {getTaskPriority(todo)}
                      {todo.dueTime ? ` · 마감 ${todo.dueTime}` : ''}
                    </span>
                  </div>
                  <TodoPlayLink
                    to={`/todos/${todo.id}/focus`}
                    label={`${todo.text} 집중 시작`}
                  />
                </article>
              ))}

              {!bucketTodos.length && (
                <p className="todo-project-empty">아직 등록된 할 일이 없어요.</p>
              )}
            </div>
          </section>
        )
      })}

      <div className="todo-list-loader" ref={loadMoreRef} aria-live="polite">
        {hasMore ? '다음 목록의 할 일을 불러오는 중…' : '모든 할 일을 불러왔어요.'}
      </div>
    </section>
  )
}
