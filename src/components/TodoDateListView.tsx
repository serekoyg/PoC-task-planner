import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import type { StudySharedItemEntry } from '../data/studyRooms'
import { formatSelectedDate } from '../lib/date'
import { getSharedRepeatLabel } from '../lib/studyShared'
import { getTaskPriority, getTaskProject } from '../lib/task'
import type { ProjectFilter } from './ProjectSidebar'

const DATE_BATCH_SIZE = 2

type TodoDateGroup = {
  date: string
  todos: Todo[]
  sharedItems: StudySharedItemEntry[]
}

type TodoDateListViewProps = {
  today: Date
  todos: Todo[]
  projects: PlannerProject[]
  sharedItems: StudySharedItemEntry[]
  selectedProjectId: ProjectFilter
  onToggleTodo: (todoId: string) => void
  onToggleSharedItemStatus: (roomId: string, itemId: string) => void
  onEditTodo: (todo: Todo) => void
  onCreateTodo: () => void
}

const isInboxTodo = (todo: Todo) =>
  !todo.project || todo.project === '받은 편지함'

export default function TodoDateListView({
  today,
  todos,
  projects,
  sharedItems,
  selectedProjectId,
  onToggleTodo,
  onToggleSharedItemStatus,
  onEditTodo,
  onCreateTodo,
}: TodoDateListViewProps) {
  const dateGroups = useMemo<TodoDateGroup[]>(() => {
    const selectedProject = projects.find(
      (project) => project.id === selectedProjectId,
    )
    const filteredTodos = todos.filter((todo) => {
      if (selectedProjectId === 'all') return true
      if (selectedProjectId === 'inbox') return isInboxTodo(todo)
      return selectedProject ? todo.project === selectedProject.name : true
    })
    const visibleSharedItems =
      selectedProjectId === 'all'
        ? sharedItems.filter((entry) => entry.item.type === 'todo')
        : []
    const grouped = new Map<string, TodoDateGroup>()
    const getGroup = (date: string) => {
      const group = grouped.get(date) ?? { date, todos: [], sharedItems: [] }
      grouped.set(date, group)
      return group
    }

    filteredTodos.forEach((todo) => getGroup(todo.date).todos.push(todo))
    visibleSharedItems.forEach((entry) =>
      getGroup(entry.item.date).sharedItems.push(entry),
    )

    return [...grouped.values()]
      .sort((first, second) => first.date.localeCompare(second.date))
      .map((group) => ({
        ...group,
        todos: [...group.todos].sort((first, second) => {
          if (first.done !== second.done) return first.done ? 1 : -1
          return (first.dueTime || '99:99').localeCompare(
            second.dueTime || '99:99',
          )
        }),
      }))
  }, [projects, selectedProjectId, sharedItems, todos])
  const [visibleDateCount, setVisibleDateCount] = useState(DATE_BATCH_SIZE)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const hasMore = visibleDateCount < dateGroups.length
  const todayKey = toDateKey(today)

  useEffect(() => {
    setVisibleDateCount(DATE_BATCH_SIZE)
  }, [dateGroups.length, selectedProjectId])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMore) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setVisibleDateCount((current) =>
        Math.min(current + DATE_BATCH_SIZE, dateGroups.length),
      )
    }, { rootMargin: '180px' })

    observer.observe(target)
    return () => observer.disconnect()
  }, [dateGroups.length, hasMore, visibleDateCount])

  if (!dateGroups.length) {
    return (
      <section className="todo-date-list todo-date-list-empty" aria-label="날짜별 할 일">
        <span aria-hidden="true">✓</span>
        <strong>표시할 할 일이 없어요.</strong>
        <p>새 할 일을 만들면 날짜 순서대로 여기에 표시돼요.</p>
        <button type="button" onClick={onCreateTodo}>첫 할 일 추가</button>
      </section>
    )
  }

  return (
    <section className="todo-date-list" aria-label="날짜별 할 일">
      {dateGroups.slice(0, visibleDateCount).map((group) => {
        const completedSharedCount = group.sharedItems.filter(
          ({ item, memberId }) => item.completedMemberIds.includes(memberId),
        ).length
        const totalCount = group.todos.length + group.sharedItems.length
        const openCount =
          group.todos.filter((todo) => !todo.done).length +
          group.sharedItems.length -
          completedSharedCount
        const date = new Date(`${group.date}T00:00:00`)

        return (
          <section className="todo-date-section" key={group.date}>
            <header>
              <div>
                <time dateTime={group.date}>{formatSelectedDate(date)}</time>
                {group.date === todayKey && <span>오늘</span>}
              </div>
              <p>{openCount ? `${openCount}개 남음` : '모두 완료'} · 총 {totalCount}개</p>
            </header>

            <div className="todo-date-rows">
              {group.todos.map((todo) => (
                <article
                  className={`todo-date-row color-${todo.color}${todo.done ? ' completed' : ''}`}
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
                  <div className="todo-date-copy">
                    <div>
                      <Link to={`/todos/${todo.id}`}>{todo.text}</Link>
                      <span>{getTaskProject(todo)}</span>
                    </div>
                    <p>
                      우선순위 {getTaskPriority(todo)}
                      {todo.dueTime ? ` · 마감 ${todo.dueTime}` : ''}
                      {todo.estimatedMinutes ? ` · 예상 ${todo.estimatedMinutes}분` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditTodo(todo)}
                    aria-label={`${todo.text} 편집`}
                  >
                    편집
                  </button>
                </article>
              ))}

              {group.sharedItems.map(({ roomId, roomName, memberId, item }) => {
                const isCompleted = item.completedMemberIds.includes(memberId)
                return (
                  <article
                    className={`todo-date-row color-blue shared-todo-item${isCompleted ? ' completed' : ''}`}
                    key={`${roomId}-${item.id}`}
                  >
                    <label className="todo-check-control">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => onToggleSharedItemStatus(roomId, item.id)}
                      />
                      <span className="custom-checkbox" aria-hidden="true">✓</span>
                      <span className="sr-only">
                        {isCompleted ? `${item.title} 완료 취소` : `${item.title} 완료`}
                      </span>
                    </label>
                    <div className="todo-date-copy">
                      <div>
                        <span className="shared-source-badge">
                          {roomName} · 함께할 일
                        </span>
                        <Link to={`/studies/${roomId}`}>{item.title}</Link>
                      </div>
                      <p>
                        {item.repeat === 'none'
                          ? `${item.completedMemberIds.length}명 완료`
                          : `${getSharedRepeatLabel(item)} · ${item.completedMemberIds.length}명 완료`}
                      </p>
                    </div>
                    <Link className="todo-date-room-link" to={`/studies/${roomId}`}>
                      모임 보기
                    </Link>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="todo-list-loader" ref={loadMoreRef} aria-live="polite">
        {hasMore
          ? '다음 날짜의 할 일을 불러오는 중…'
          : '모든 날짜의 할 일을 불러왔어요.'}
      </div>
    </section>
  )
}
