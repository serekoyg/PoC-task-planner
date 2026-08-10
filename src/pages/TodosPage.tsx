import { type CSSProperties, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ProjectSidebar, {
  type ProjectFilter,
} from '../components/ProjectSidebar'
import TodoEditorModal from '../components/TodoEditorModal'
import TodoKanbanView from '../components/TodoKanbanView'
import TodoProjectListView from '../components/TodoProjectListView'
import type { Todo, TodoInput } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject, ProjectInput } from '../data/projects'
import { formatSelectedDate, moveDate } from '../lib/date'
import { getTaskEstimate, getTaskProject } from '../lib/task'

type TodoView = 'today' | 'kanban' | 'projects'

const viewLabels: Record<TodoView, string> = {
  today: '오늘',
  kanban: '칸반',
  projects: '프로젝트 목록',
}

const viewTitles: Record<TodoView, string> = {
  today: '오늘 보기',
  kanban: '프로젝트 칸반',
  projects: '프로젝트 목록',
}

const viewDescriptions: Record<TodoView, string> = {
  today: '선택한 날짜에 실행할 일을 우선순위와 마감 시간으로 관리하세요.',
  kanban: '모든 날짜의 할 일을 프로젝트 열로 나누어 한눈에 확인하세요.',
  projects: '프로젝트별 할 일을 날짜와 함께 세로로 계속 탐색하세요.',
}

type TodosPageProps = {
  today: Date
  selectedDate: Date
  todos: Todo[]
  projects: PlannerProject[]
  onSelectDate: (date: Date) => void
  onAddTodo: (todo: TodoInput) => void
  onUpdateTodo: (todoId: string, todo: TodoInput) => void
  onToggleTodo: (todoId: string) => void
  onRemoveTodo: (todoId: string) => void
  onCreateProject: (input: ProjectInput) => string
  onUpdateProject: (projectId: string, input: ProjectInput) => void
  onDeleteProject: (projectId: string) => void
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
  onSelectDate,
  onAddTodo,
  onUpdateTodo,
  onToggleTodo,
  onRemoveTodo,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: TodosPageProps) {
  const [selectedProjectId, setSelectedProjectId] =
    useState<ProjectFilter>('all')
  const [todoView, setTodoView] = useState<TodoView>('today')
  const [isCreating, setIsCreating] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo>()
  const selectedDateKey = toDateKey(selectedDate)
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const isInboxTodo = (todo: Todo) =>
    !todo.project || todo.project === '받은 편지함'
  const dateTodos = todos.filter((todo) => todo.date === selectedDateKey)
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
  const completedCount = filteredTodos.filter((todo) => todo.done).length
  const completionRate = filteredTodos.length
    ? Math.round((completedCount / filteredTodos.length) * 100)
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

        <div className="project-filter-content todo-view-content">
          <header className="todo-view-toolbar">
            <div>
              <p className="eyebrow">
                {todoView === 'today'
                  ? `${formatSelectedDate(selectedDate)} · ${selectedProjectName}`
                  : selectedProjectName}
              </p>
              <h1>{viewTitles[todoView]}</h1>
              <p>{viewDescriptions[todoView]}</p>
            </div>
            <div className="todo-view-actions">
              <div className="todo-view-tabs" aria-label="할 일 보기 선택">
                {(Object.keys(viewLabels) as TodoView[]).map((view) => (
                  <button
                    className={todoView === view ? 'active' : ''}
                    type="button"
                    key={view}
                    onClick={() => setTodoView(view)}
                    aria-pressed={todoView === view}
                  >
                    {viewLabels[view]}
                  </button>
                ))}
              </div>

              {todoView === 'today' && (
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
              )}

              <button
                className="add-todo-button"
                type="button"
                onClick={() => setIsCreating(true)}
              >
                <span aria-hidden="true">＋</span>
                새 할 일
              </button>
            </div>
          </header>

          {todoView === 'today' && (
            <section className="todo-workspace" aria-label="오늘 할 일 관리">
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
                    {completedCount}개 완료 · {filteredTodos.length - completedCount}개 남음
                  </strong>
                </div>
                <span className="task-count">
                  {completedCount}/{filteredTodos.length}
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
                <span>{filteredTodos.length}개</span>
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
              </ul>

              {!filteredTodos.length && (
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
          )}

          {todoView === 'kanban' && (
            <TodoKanbanView
              todos={todos}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onToggleTodo={onToggleTodo}
              onEditTodo={setEditingTodo}
            />
          )}

          {todoView === 'projects' && (
            <TodoProjectListView
              todos={todos}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onToggleTodo={onToggleTodo}
              onEditTodo={setEditingTodo}
            />
          )}
        </div>
      </div>

      {(isCreating || editingTodo) && (
        <TodoEditorModal
          selectedDate={selectedDate}
          projects={projects}
          defaultProjectName={selectedProject?.name}
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
