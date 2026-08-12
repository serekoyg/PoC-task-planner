import { type CSSProperties, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ProjectSidebar, {
  type ProjectFilter,
} from '../components/ProjectSidebar'
import PlanEditorModal from '../components/PlanEditorModal'
import TodoEditorModal from '../components/TodoEditorModal'
import type { CalendarEventInput, Todo, TodoInput } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject, ProjectInput } from '../data/projects'
import type { StudyRoom, StudySharedItemEntry } from '../data/studyRooms'
import { formatSelectedDate, isTodoOnDate, moveDate } from '../lib/date'
import { getSharedRepeatLabel, isSharedItemOnDate } from '../lib/studyShared'
import { getTaskEstimate, getTaskProject } from '../lib/task'

type TodosPageProps = {
  today: Date
  selectedDate: Date
  todos: Todo[]
  projects: PlannerProject[]
  studyRooms: StudyRoom[]
  sharedItems: StudySharedItemEntry[]
  onSelectDate: (date: Date) => void
  onAddTodo: (todo: TodoInput, sharedRoomId?: string) => void
  onAddEvent: (event: CalendarEventInput, sharedRoomId?: string) => void
  onUpdateTodo: (todoId: string, todo: TodoInput) => void
  onToggleTodo: (todoId: string) => void
  onRemoveTodo: (todoId: string) => void
  onCreateProject: (input: ProjectInput) => string
  onUpdateProject: (projectId: string, input: ProjectInput) => void
  onDeleteProject: (projectId: string) => void
  onToggleSharedItemStatus: (roomId: string, itemId: string) => void
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
  projects,
  studyRooms,
  sharedItems,
  onSelectDate,
  onAddTodo,
  onAddEvent,
  onUpdateTodo,
  onToggleTodo,
  onRemoveTodo,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onToggleSharedItemStatus,
}: TodosPageProps) {
  const [selectedProjectId, setSelectedProjectId] =
    useState<ProjectFilter>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo>()
  const selectedDateKey = toDateKey(selectedDate)
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const isInboxTodo = (todo: Todo) =>
    !todo.project || todo.project === '받은 편지함'
  const dateTodos = todos.filter((todo) => isTodoOnDate(todo, selectedDateKey))
  const dateSharedItems = useMemo(
    () =>
      selectedProjectId === 'all'
        ? sharedItems.filter(
            (entry) =>
              entry.item.type === 'todo' &&
              isSharedItemOnDate(entry.item, selectedDateKey),
          )
        : [],
    [selectedDateKey, selectedProjectId, sharedItems],
  )
  const filteredTodos = useMemo(() => {
    if (selectedProjectId === 'all') return dateTodos
    if (selectedProjectId === 'inbox') return dateTodos.filter(isInboxTodo)
    return selectedProject
      ? dateTodos.filter((todo) => todo.project === selectedProject.name)
      : dateTodos
  }, [dateTodos, selectedProject, selectedProjectId])
  const projectCounts = useMemo(() => {
    const openTodos = todos.filter((todo) => !todo.done)
    const counts: Record<string, number> = {
      all: openTodos.length,
      inbox: openTodos.filter(isInboxTodo).length,
    }
    projects.forEach((project) => {
      counts[project.id] = openTodos.filter(
        (todo) => todo.project === project.name,
      ).length
    })
    return counts
  }, [projects, todos])
  const completedSharedCount = dateSharedItems.filter(({ item, memberId }) =>
    item.completedMemberIds.includes(memberId),
  ).length
  const completedCount =
    filteredTodos.filter((todo) => todo.done).length + completedSharedCount
  const totalTodoCount = filteredTodos.length + dateSharedItems.length
  const completionRate = totalTodoCount
    ? Math.round((completedCount / totalTodoCount) * 100)
    : 0
  const sortedTodos = useMemo(
    () =>
      [...filteredTodos].sort((first, second) => {
        if (first.done !== second.done) return first.done ? 1 : -1
        const priorityDifference =
          priorityOrder[first.priority] - priorityOrder[second.priority]
        if (priorityDifference) return priorityDifference
        return (first.dueTime || '99:99').localeCompare(
          second.dueTime || '99:99',
        )
      }),
    [filteredTodos],
  )
  const selectedProjectName =
    selectedProject?.name ??
    (selectedProjectId === 'inbox' ? '받은 편지함' : '모든 프로젝트')

  const closeEditor = () => {
    setIsCreating(false)
    setEditingTodo(undefined)
  }

  return (
    <main className="todos-page">
      <div className="project-filter-layout todo-project-layout">
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          itemCounts={projectCounts}
          itemLabel="미완료 할 일"
          onSelectProject={setSelectedProjectId}
          onCreateProject={onCreateProject}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
        />

        <div className="project-filter-content">
          <section className="todo-page-heading" aria-labelledby="todo-page-title">
            <div>
              <p className="eyebrow">{formatSelectedDate(selectedDate)}</p>
              <h1 id="todo-page-title">{selectedProjectName}</h1>
              <p className="page-description">
                선택한 프로젝트의 할 일을 우선순위와 마감 시간으로 관리하세요.
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
                <p>{selectedProjectName} 진행률</p>
                <strong>
                  {completedCount}개 완료 · {totalTodoCount - completedCount}개 남음
                </strong>
              </div>
              <span className="task-count">
                {completedCount}/{totalTodoCount}
              </span>
            </div>

            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${completionRate}%` }} />
            </div>

            <div className="todo-list-heading">
              <div>
                <strong>{formatSelectedDate(selectedDate)} 할 일</strong>
                <span>미완료 항목은 우선순위와 마감 시간 순으로 보여요.</span>
              </div>
              <span>{totalTodoCount}개</span>
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
                      <span className="todo-kind-badge">{getTaskProject(todo)}</span>
                      <Link className="todo-title-link" to={`/todos/${todo.id}`}>
                        <span className="todo-text">{todo.text}</span>
                      </Link>
                    </div>
                    <div className="todo-item-meta">
                      <span className={`priority-badge ${todo.priority}`}>
                        우선순위 {priorityLabels[todo.priority]}
                      </span>
                      <span>예상 {getTaskEstimate(todo)}분</span>
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
              {dateSharedItems.map(({ roomId, roomName, memberId, item }) => {
                const isCompleted = item.completedMemberIds.includes(memberId)
                return (
                  <li
                    className={`${isCompleted ? 'completed ' : ''}color-blue shared-todo-item`}
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
                    <div className="todo-item-content">
                      <div className="todo-item-title-row">
                        <Link className="shared-source-badge" to={`/studies/${roomId}`}>
                          {roomName} · 함께할 일
                        </Link>
                        <span className="todo-text">{item.title}</span>
                      </div>
                      <div className="todo-item-meta">
                        <span>{item.repeat !== 'none' ? getSharedRepeatLabel(item) : `${formatSelectedDate(new Date(`${item.date}T00:00:00`))}까지`}</span>
                        <span>{item.completedMemberIds.length}명 완료</span>
                      </div>
                      {item.note && <p className="todo-note">{item.note}</p>}
                    </div>
                    <div className="todo-item-actions">
                      <Link className="todo-detail-link" to={`/studies/${roomId}`}>
                        모임 보기 <span aria-hidden="true">›</span>
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>

            {!totalTodoCount && (
              <div className="empty-todos">
                <span aria-hidden="true">✓</span>
                <p>{selectedProjectName}에 이날 등록된 할 일이 없어요.</p>
                <small>새 할 일을 만들면 선택한 프로젝트가 자동으로 연결돼요.</small>
                <button type="button" onClick={() => setIsCreating(true)}>
                  첫 할 일 추가
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {isCreating && (
        <PlanEditorModal
          initialType="todo"
          selectedDate={selectedDate}
          projects={projects}
          studyRooms={studyRooms}
          defaultProjectName={selectedProject?.name}
          onClose={closeEditor}
          onSaveTodo={(input, sharedRoomId) => {
            onAddTodo(input, sharedRoomId)
            closeEditor()
          }}
          onSaveEvent={(input, sharedRoomId) => {
            onAddEvent(input, sharedRoomId)
            closeEditor()
          }}
        />
      )}

      {editingTodo && (
        <TodoEditorModal
          selectedDate={selectedDate}
          projects={projects}
          studyRooms={studyRooms}
          defaultProjectName={selectedProject?.name}
          todo={editingTodo}
          onClose={closeEditor}
          onSave={(input) => {
            onUpdateTodo(editingTodo.id, input)
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
