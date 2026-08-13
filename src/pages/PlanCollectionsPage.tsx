import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProjectSidebar, {
  type PlanCollection,
  type ProjectFilter,
} from '../components/ProjectSidebar'
import type { CalendarEvent, Todo } from '../data/initialData'
import {
  BACKLOG_PROJECT_NAME,
  isBacklogProject,
  type PlannerProject,
  type ProjectInput,
} from '../data/projects'
import type { TrashedPlan } from '../data/trash'
import { formatTaskDate, getTaskProject } from '../lib/task'

type TrashFilter = 'all' | 'todo' | 'event'

type PlanCollectionsPageProps = {
  collection: PlanCollection
  todos: Todo[]
  events: CalendarEvent[]
  projects: PlannerProject[]
  trash: TrashedPlan[]
  collectionCounts: Record<PlanCollection, number>
  managementItemCounts: Record<string, number>
  onToggleTodo: (todoId: string) => void
  onRemoveTodo: (todoId: string) => void
  onRestoreTrash: (trashId: string) => void
  onDeleteTrash: (trashId: string) => void
  onEmptyTrash: () => void
  onCreateProject: (input: ProjectInput) => string
  onUpdateProject: (projectId: string, input: ProjectInput) => void
  onDeleteProject: (projectId: string) => void
  onReorderProjects: (orderedProjectIds: string[]) => void
}

const formatDeletedAt = (deletedAt: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(deletedAt))

export default function PlanCollectionsPage({
  collection,
  todos,
  events,
  projects,
  trash,
  collectionCounts,
  managementItemCounts,
  onToggleTodo,
  onRemoveTodo,
  onRestoreTrash,
  onDeleteTrash,
  onEmptyTrash,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onReorderProjects,
}: PlanCollectionsPageProps) {
  const navigate = useNavigate()
  const [trashFilter, setTrashFilter] = useState<TrashFilter>('all')
  const [confirmingTrashId, setConfirmingTrashId] = useState<string>()
  const [isEmptyConfirming, setIsEmptyConfirming] = useState(false)
  const completedTodos = useMemo(
    () =>
      todos
        .filter((todo) => todo.done)
        .sort((first, second) => second.date.localeCompare(first.date)),
    [todos],
  )
  const visibleTrash =
    trashFilter === 'all'
      ? trash
      : trash.filter((entry) => entry.type === trashFilter)
  const openTodos = todos.filter((todo) => !todo.done)
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: openTodos.length + events.length,
      backlog:
        openTodos.filter((todo) => isBacklogProject(todo.project)).length +
        events.filter((event) => isBacklogProject(event.project)).length,
    }
    projects.forEach((project) => {
      counts[project.id] =
        openTodos.filter((todo) => todo.project === project.name).length +
        events.filter((event) => event.project === project.name).length
    })
    return counts
  }, [events, openTodos, projects])

  const selectProject = (projectId: ProjectFilter) => {
    navigate(projectId === 'all' ? '/todos' : `/todos?project=${projectId}`)
  }

  return (
    <main className="todos-page plan-collections-page">
      <div className="project-filter-layout todo-project-layout">
        <ProjectSidebar
          projects={projects}
          selectedProjectId="all"
          selectedCollection={collection}
          itemCounts={projectCounts}
          managementItemCounts={managementItemCounts}
          itemLabel="활성 계획"
          collectionCounts={collectionCounts}
          onSelectProject={selectProject}
          onSelectCollection={(nextCollection) =>
            navigate(`/collections/${nextCollection}`)
          }
          onCreateProject={(input) => {
            const id = onCreateProject(input)
            navigate(`/todos?project=${id}`)
            return id
          }}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
          onReorderProjects={onReorderProjects}
        />

        <div className="project-filter-content plan-collection-content">
          <header className="plan-collection-hero">
            <div>
              <p className="eyebrow">계획 보관함</p>
              <h1>{collection === 'completed' ? '완료 모음' : '쓰레기통'}</h1>
              <p>
                {collection === 'completed'
                  ? '완료한 할 일을 다시 확인하거나 필요한 항목을 되돌릴 수 있어요.'
                  : '삭제한 일정과 할 일을 복원하거나 영구적으로 정리할 수 있어요.'}
              </p>
            </div>
            <div className="plan-collection-switch" aria-label="계획 보관함 선택">
              <Link
                className={collection === 'completed' ? 'active' : ''}
                to="/collections/completed"
              >
                완료 모음 <span>{collectionCounts.completed}</span>
              </Link>
              <Link
                className={collection === 'trash' ? 'active' : ''}
                to="/collections/trash"
              >
                쓰레기통 <span>{collectionCounts.trash}</span>
              </Link>
            </div>
          </header>

          {collection === 'completed' ? (
            <section className="plan-collection-card" aria-label="완료한 할 일">
              <header className="plan-collection-card-heading">
                <div>
                  <h2>완료한 할 일</h2>
                  <p>계획 날짜가 최근인 순서로 모아봤어요.</p>
                </div>
                <strong>{completedTodos.length}개</strong>
              </header>

              {completedTodos.length > 0 ? (
                <ul className="completed-plan-list">
                  {completedTodos.map((todo) => (
                    <li key={todo.id}>
                      <span className="collection-plan-icon completed" aria-hidden="true">✓</span>
                      <div>
                        <Link to={`/todos/${todo.id}`}>{todo.text}</Link>
                        <span>
                          {getTaskProject(todo)} · 나의 계획 · {formatTaskDate(todo.date)}
                          {todo.dueTime ? ` · ${todo.dueTime}` : ''}
                        </span>
                      </div>
                      <div className="collection-row-actions">
                        <button type="button" onClick={() => onToggleTodo(todo.id)}>
                          완료 취소
                        </button>
                        <button
                          className="collection-danger-action"
                          type="button"
                          onClick={() => onRemoveTodo(todo.id)}
                        >
                          쓰레기통
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="plan-collection-empty">
                  <span aria-hidden="true">✓</span>
                  <strong>아직 완료한 할 일이 없어요</strong>
                  <p>할 일을 완료하면 이곳에 자동으로 모아둘게요.</p>
                  <Link to="/todos">할 일 확인하기</Link>
                </div>
              )}
            </section>
          ) : (
            <section className="plan-collection-card" aria-label="삭제한 계획">
              <header className="trash-toolbar">
                <div className="trash-filter-tabs" aria-label="쓰레기통 항목 필터">
                  {(
                    [
                      ['all', '전체'],
                      ['todo', '할 일'],
                      ['event', '일정'],
                    ] as const
                  ).map(([filter, label]) => (
                    <button
                      className={trashFilter === filter ? 'active' : ''}
                      type="button"
                      key={filter}
                      aria-pressed={trashFilter === filter}
                      onClick={() => setTrashFilter(filter)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {!isEmptyConfirming ? (
                  <button
                    className="empty-trash-button"
                    type="button"
                    disabled={!trash.length}
                    onClick={() => setIsEmptyConfirming(true)}
                  >
                    쓰레기통 비우기
                  </button>
                ) : (
                  <div className="empty-trash-confirm" role="alert">
                    <span>모두 영구 삭제할까요?</span>
                    <button type="button" onClick={() => setIsEmptyConfirming(false)}>
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onEmptyTrash()
                        setIsEmptyConfirming(false)
                      }}
                    >
                      모두 삭제
                    </button>
                  </div>
                )}
              </header>

              {visibleTrash.length > 0 ? (
                <ul className="trash-plan-list">
                  {visibleTrash.map((entry) => {
                    const title =
                      entry.type === 'todo' ? entry.item.text : entry.item.title
                    const time =
                      entry.type === 'todo'
                        ? entry.item.dueTime
                        : entry.item.startTime
                    return (
                      <li key={entry.trashId}>
                        <span
                          className={`collection-plan-icon ${entry.type}`}
                          aria-hidden="true"
                        >
                          {entry.type === 'todo' ? '✓' : '▦'}
                        </span>
                        <div>
                          <strong>{title}</strong>
                          <span>
                            {entry.type === 'todo' ? '할 일' : '일정'} ·{' '}
                            {entry.item.project ?? BACKLOG_PROJECT_NAME} · 나의 계획 ·{' '}
                            {formatTaskDate(entry.item.date)}
                            {time ? ` · ${time}` : ''}
                          </span>
                          <small>{formatDeletedAt(entry.deletedAt)} 삭제</small>
                        </div>
                        <div className="collection-row-actions">
                          <button type="button" onClick={() => onRestoreTrash(entry.trashId)}>
                            복원
                          </button>
                          {confirmingTrashId === entry.trashId ? (
                            <span className="delete-forever-confirm">
                              <button type="button" onClick={() => setConfirmingTrashId(undefined)}>
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteTrash(entry.trashId)
                                  setConfirmingTrashId(undefined)
                                }}
                              >
                                영구 삭제
                              </button>
                            </span>
                          ) : (
                            <button
                              className="collection-danger-action"
                              type="button"
                              onClick={() => setConfirmingTrashId(entry.trashId)}
                            >
                              영구 삭제
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="plan-collection-empty">
                  <span aria-hidden="true">♲</span>
                  <strong>
                    {trashFilter === 'all'
                      ? '쓰레기통이 비어 있어요'
                      : `삭제한 ${trashFilter === 'todo' ? '할 일' : '일정'}이 없어요`}
                  </strong>
                  <p>삭제한 계획은 복원할 수 있도록 이곳에 보관돼요.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
