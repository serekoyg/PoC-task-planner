import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ProjectSidebar, {
  type PlanCollection,
  type ProjectFilter,
} from '../components/ProjectSidebar'
import PlanEditorModal from '../components/PlanEditorModal'
import TodoDateListView from '../components/TodoDateListView'
import TodoKanbanView from '../components/TodoKanbanView'
import TodoProjectListView from '../components/TodoProjectListView'
import type { CalendarEventInput, Todo, TodoInput } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import { BACKLOG_PROJECT_NAME, isBacklogProject } from '../data/projects'
import type { StudyRoom, StudySharedItemEntry } from '../data/studyRooms'

type TodoView = 'dates' | 'kanban' | 'projects'

const viewLabels: Record<TodoView, string> = {
  dates: '날짜별',
  kanban: '칸반',
  projects: '목록별',
}

const viewTitles: Record<TodoView, string> = {
  dates: '날짜별 할 일',
  kanban: '목록 칸반',
  projects: '목록별 보기',
}

const viewDescriptions: Record<TodoView, string> = {
  dates: '모든 할 일을 날짜 순서대로 계속 내려가며 확인하세요.',
  kanban: '모든 날짜의 할 일을 목록별 열로 나누어 한눈에 확인하세요.',
  projects: '목록별 할 일을 날짜와 함께 세로로 계속 탐색하세요.',
}

type TodosPageProps = {
  today: Date
  selectedDate: Date
  todos: Todo[]
  projects: PlannerProject[]
  studyRooms: StudyRoom[]
  sharedItems: StudySharedItemEntry[]
  collectionCounts: Record<PlanCollection, number>
  onAddTodo: (todo: TodoInput, sharedRoomId?: string) => void
  onAddEvent: (event: CalendarEventInput, sharedRoomId?: string) => void
  onUpdateTodo: (todoId: string, todo: TodoInput) => void
  onToggleTodo: (todoId: string) => void
  onRemoveTodo: (todoId: string) => void
  onToggleSharedItemStatus: (roomId: string, itemId: string) => void
}

export default function TodosPage({
  today,
  selectedDate,
  todos,
  projects,
  studyRooms,
  sharedItems,
  collectionCounts,
  onAddTodo,
  onAddEvent,
  onUpdateTodo,
  onToggleTodo,
  onRemoveTodo,
  onToggleSharedItemStatus,
}: TodosPageProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProjectId = (searchParams.get('project') ??
    'all') as ProjectFilter
  const [todoView, setTodoView] = useState<TodoView>('dates')
  const [isCreating, setIsCreating] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo>()
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const isBacklogTodo = (todo: Todo) => isBacklogProject(todo.project)
  const projectCounts = useMemo(() => {
    const openTodos = todos.filter((todo) => !todo.done)
    const openSharedPlans = sharedItems.filter(({ item, memberId }) =>
      item.type === 'todo'
        ? !item.completedMemberIds.includes(memberId)
        : !item.participantMemberIds.includes(memberId),
    )
    const counts: Record<string, number> = {
      all: openTodos.length + openSharedPlans.length,
      backlog: openTodos.filter(isBacklogTodo).length,
    }
    projects.forEach((project) => {
      counts[project.id] = openTodos.filter(
        (todo) => todo.project === project.name,
      ).length
    })
    return counts
  }, [projects, sharedItems, todos])
  const selectedProjectName =
    selectedProject?.name ??
    (selectedProjectId === 'backlog'
      ? BACKLOG_PROJECT_NAME
      : '모든 목록')

  const closeEditor = () => {
    setIsCreating(false)
    setEditingTodo(undefined)
  }

  const selectProject = (projectId: ProjectFilter) => {
    if (projectId === 'all') setSearchParams({})
    else setSearchParams({ project: projectId })
  }

  return (
    <main className="todos-page">
      <div className="project-filter-layout todo-project-layout">
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          itemCounts={projectCounts}
          itemLabel="미완료 할 일"
          collectionCounts={collectionCounts}
          onSelectProject={selectProject}
          onSelectCollection={(collection) =>
            navigate(`/collections/${collection}`)
          }
        />

        <div className="project-filter-content todo-view-content">
          <header className="todo-view-toolbar">
            <div>
              <p className="eyebrow">{selectedProjectName}</p>
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

              <button
                className="add-todo-button"
                type="button"
                onClick={() => setIsCreating(true)}
              >
                <span aria-hidden="true">＋</span>
                새 계획
              </button>
            </div>
          </header>

          {todoView === 'dates' && (
            <TodoDateListView
              today={today}
              todos={todos}
              projects={projects}
              sharedItems={sharedItems}
              selectedProjectId={selectedProjectId}
              onToggleTodo={onToggleTodo}
              onToggleSharedItemStatus={onToggleSharedItemStatus}
              onEditTodo={setEditingTodo}
              onCreateTodo={() => setIsCreating(true)}
            />
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
        <PlanEditorModal
          initialType="todo"
          selectedDate={selectedDate}
          projects={projects}
          studyRooms={studyRooms}
          todo={editingTodo}
          defaultProjectName={selectedProject?.name}
          onClose={closeEditor}
          onSaveTodo={(input, sharedRoomId) => {
            if (editingTodo) onUpdateTodo(editingTodo.id, input)
            else onAddTodo(input, sharedRoomId)
            closeEditor()
          }}
          onSaveEvent={(input, sharedRoomId) => {
            onAddEvent(input, sharedRoomId)
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
