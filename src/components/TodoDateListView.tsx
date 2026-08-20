import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import { getProjectColorByName, isBacklogProject } from '../data/projects'
import type { StudySharedItemEntry } from '../data/studyRooms'
import { formatSelectedDate } from '../lib/date'
import { getSharedRepeatLabel } from '../lib/studyShared'
import { getTaskPriority, getTaskProject } from '../lib/task'
import type { ProjectFilter } from '../data/projects'
import TodoPlayLink from './TodoPlayLink'

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

const isBacklogTodo = (todo: Todo) => isBacklogProject(todo.project)

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
      if (selectedProjectId === 'backlog') return isBacklogTodo(todo)
      return selectedProject ? todo.project === selectedProject.name : true
    })
    const visibleSharedItems =
      selectedProjectId === 'all'
        ? sharedItems
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
          ({ item, memberId }) =>
            (item.type === 'todo'
              ? item.completedMemberIds
              : item.participantMemberIds
            ).includes(memberId),
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
              {group.todos.map((todo) => {
                const projectColor = getProjectColorByName(projects, todo.project)
                return (
                <article
                  className={`todo-date-row project-color-surface${todo.done ? ' completed' : ''}`}
                  style={{ '--project-color': projectColor } as CSSProperties}
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
                      <button
                        className="todo-item-title-button"
                        type="button"
                        onClick={() => onEditTodo(todo)}
                      >
                        {todo.text}
                      </button>
                      <span>{getTaskProject(todo)} · 나의 계획</span>
                    </div>
                    <p>
                      우선순위 {getTaskPriority(todo)}
                      {todo.dueTime ? ` · 마감 ${todo.dueTime}` : ''}
                      {todo.estimatedMinutes ? ` · 예상 ${todo.estimatedMinutes}분` : ''}
                    </p>
                  </div>
                  <TodoPlayLink
                    to={`/todos/${todo.id}/focus`}
                    label={`${todo.text} 집중 시작`}
                  />
                </article>
                )
              })}

              {group.sharedItems.map(({ roomId, roomName, memberId, item }) => {
                const statusMemberIds =
                  item.type === 'todo'
                    ? item.completedMemberIds
                    : item.participantMemberIds
                const isCompleted = statusMemberIds.includes(memberId)
                const typeLabel =
                  item.type === 'todo' ? '함께할 일' : '함께할 일정'
                const statusLabel =
                  item.type === 'todo'
                    ? `${item.completedMemberIds.length}명 완료`
                    : `${item.participantMemberIds.length}명 참여`
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
                        {item.type === 'todo'
                          ? isCompleted
                            ? `${item.title} 완료 취소`
                            : `${item.title} 완료`
                          : isCompleted
                            ? `${item.title} 참여 취소`
                            : `${item.title} 참여`}
                      </span>
                    </label>
                    <div className="todo-date-copy">
                      <div className="shared-todo-context">
                        <span className="shared-room-mark" aria-hidden="true">
                          ◉
                        </span>
                        <span className="shared-source-badge">
                          {roomName} · 모임
                        </span>
                        <span className="shared-todo-type-badge">
                          {typeLabel}
                        </span>
                      </div>
                      <Link to={`/studies/${roomId}`}>{item.title}</Link>
                      <p>
                        {item.time ? `${item.time} · ` : ''}
                        {item.repeat === 'none'
                          ? statusLabel
                          : `${getSharedRepeatLabel(item)} · ${statusLabel}`}
                      </p>
                    </div>
                    <TodoPlayLink
                      to={`/studies/${roomId}?startActivity=${item.id}`}
                      label={`${roomName}에서 ${item.title} 활동 시작`}
                      shared
                    />
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
