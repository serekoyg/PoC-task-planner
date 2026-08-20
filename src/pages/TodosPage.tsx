import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PlanEditorModal from '../components/PlanEditorModal'
import TodoDateListView from '../components/TodoDateListView'
import TodoKanbanView from '../components/TodoKanbanView'
import TodoProjectListView from '../components/TodoProjectListView'
import type { CalendarEventInput, Todo, TodoInput } from '../data/initialData'
import type { PlannerProject, ProjectFilter } from '../data/projects'
import { BACKLOG_PROJECT_NAME } from '../data/projects'
import type { StudySharedItemEntry } from '../data/studyRooms'

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
  sharedItems: StudySharedItemEntry[]
  onAddTodo: (todo: TodoInput) => void
  onAddEvent: (event: CalendarEventInput) => void
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
  sharedItems,
  onAddTodo,
  onAddEvent,
  onUpdateTodo,
  onToggleTodo,
  onRemoveTodo,
  onToggleSharedItemStatus,
}: TodosPageProps) {
  const [searchParams] = useSearchParams()
  const selectedProjectId = (searchParams.get('project') ??
    'all') as ProjectFilter
  const [todoView, setTodoView] = useState<TodoView>('dates')
  const [isCreating, setIsCreating] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo>()
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const selectedProjectName =
    selectedProject?.name ??
    (selectedProjectId === 'backlog'
      ? BACKLOG_PROJECT_NAME
      : '모든 목록')

  const closeEditor = () => {
    setIsCreating(false)
    setEditingTodo(undefined)
  }

  return (
    <main className="todos-page">
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

      {(isCreating || editingTodo) && (
        <PlanEditorModal
          initialType="todo"
          selectedDate={selectedDate}
          projects={projects}
          todo={editingTodo}
          defaultProjectName={selectedProject?.name}
          onClose={closeEditor}
          onSaveTodo={(input) => {
            if (editingTodo) onUpdateTodo(editingTodo.id, input)
            else onAddTodo(input)
            closeEditor()
          }}
          onSaveEvent={(input) => {
            onAddEvent(input)
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
