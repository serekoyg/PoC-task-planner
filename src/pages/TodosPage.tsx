import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useSearchParams } from 'react-router-dom'
import PlanEditorModal from '../components/PlanEditorModal'
import TodoDateListView from '../components/TodoDateListView'
import TodoKanbanView from '../components/TodoKanbanView'
import TodoProjectListView from '../components/TodoProjectListView'
import type { CalendarEventInput, Todo, TodoInput } from '../data/initialData'
import type { PlannerProject, ProjectFilter } from '../data/projects'
import { BACKLOG_PROJECT_NAME } from '../data/projects'
import type { StudySharedItemEntry } from '../data/studyRooms'
import { Button, PageToolbar, SegmentedControl } from '../design-system'
import type {
  FocusRecord,
  FocusRecordContext,
  FocusSourceType,
} from '../data/focusRecords'

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
  focusRecords: FocusRecord[]
  onAddTodo: (todo: TodoInput) => void
  onAddEvent: (event: CalendarEventInput) => void
  onUpdateTodo: (todoId: string, todo: TodoInput) => void
  onToggleTodo: (todoId: string) => void
  onRemoveTodo: (todoId: string) => void
  onToggleSharedItemStatus: (roomId: string, itemId: string) => void
  onStartFocus: (
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
    context?: FocusRecordContext,
  ) => void
  onPauseFocus: (recordId: string) => void
}

export default function TodosPage({
  today,
  selectedDate,
  todos,
  projects,
  sharedItems,
  focusRecords,
  onAddTodo,
  onAddEvent,
  onUpdateTodo,
  onToggleTodo,
  onRemoveTodo,
  onToggleSharedItemStatus,
  onStartFocus,
  onPauseFocus,
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
          <PageToolbar
            className="todo-view-toolbar"
            eyebrow={selectedProjectName}
            title={viewTitles[todoView]}
            description={viewDescriptions[todoView]}
            actionsClassName="todo-view-actions"
            actions={(
              <>
                <SegmentedControl
                  ariaLabel="할 일 보기 선택"
                  className="todo-view-tabs"
                  items={(Object.keys(viewLabels) as TodoView[]).map((view) => ({
                    value: view,
                    label: viewLabels[view],
                  }))}
                  value={todoView}
                  onChange={setTodoView}
                />
                <Button
                  className="add-todo-button"
                  variant="primary"
                  startIcon={<Plus size={16} weight="bold" />}
                  onClick={() => setIsCreating(true)}
                >
                  새 계획
                </Button>
              </>
            )}
          />

          {todoView === 'dates' && (
            <TodoDateListView
              today={today}
              todos={todos}
              projects={projects}
              sharedItems={sharedItems}
              focusRecords={focusRecords}
              selectedProjectId={selectedProjectId}
              onToggleTodo={onToggleTodo}
              onToggleSharedItemStatus={onToggleSharedItemStatus}
              onEditTodo={setEditingTodo}
              onCreateTodo={() => setIsCreating(true)}
              onStartFocus={onStartFocus}
              onPauseFocus={onPauseFocus}
            />
          )}

          {todoView === 'kanban' && (
            <TodoKanbanView
              todos={todos}
              projects={projects}
              focusRecords={focusRecords}
              selectedProjectId={selectedProjectId}
              onToggleTodo={onToggleTodo}
              onEditTodo={setEditingTodo}
              onStartFocus={onStartFocus}
              onPauseFocus={onPauseFocus}
            />
          )}

          {todoView === 'projects' && (
            <TodoProjectListView
              todos={todos}
              projects={projects}
              focusRecords={focusRecords}
              selectedProjectId={selectedProjectId}
              onToggleTodo={onToggleTodo}
              onEditTodo={setEditingTodo}
              onStartFocus={onStartFocus}
              onPauseFocus={onPauseFocus}
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
