import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { CalendarEvent, Todo } from '../data/initialData'
import type {
  PlannerProject,
  ProjectAccent,
  ProjectCategory,
  ProjectCreateInput,
} from '../data/projects'

type ProjectTaskEntry = {
  todo: Todo
  dateKey: string
}

type ProjectsPageProps = {
  categories: ProjectCategory[]
  todos: Todo[]
  events: CalendarEvent[]
  todayKey: string
  onCreateProject: (input: ProjectCreateInput) => string
  onAddTodo: (projectName: string, text: string) => void
  onToggleTodo: (todoId: string) => void
  onAddEvent: (projectName: string, title: string, time: string) => void
}

const accentLabels: Record<ProjectAccent, string> = {
  coral: '코랄',
  blue: '블루',
  green: '그린',
  violet: '바이올렛',
}

const priorityLabels: Record<Todo['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

const formatProjectDate = (dateKey: string, todayKey: string) => {
  if (dateKey === todayKey) return '오늘'
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}

const findProject = (
  categories: ProjectCategory[],
  projectId?: string,
): { category: ProjectCategory; project: PlannerProject } | undefined => {
  for (const category of categories) {
    const project = category.projects.find((item) => item.id === projectId)
    if (project) return { category, project }
  }

  const category = categories.find((item) => item.projects.length)
  const project = category?.projects[0]
  return category && project ? { category, project } : undefined
}

export default function ProjectsPage({
  categories,
  todos,
  events,
  todayKey,
  onCreateProject,
  onAddTodo,
  onToggleTodo,
  onAddEvent,
}: ProjectsPageProps) {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const selected = findProject(categories, projectId)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  )
  const [todoText, setTodoText] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventTime, setEventTime] = useState('09:00')
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [newProject, setNewProject] = useState<ProjectCreateInput>({
    categoryId: categories[0]?.id ?? '',
    name: '',
    description: '',
    accent: 'coral',
  })

  const allTasks = useMemo<ProjectTaskEntry[]>(
    () => todos.map((todo) => ({ todo, dateKey: todo.date })),
    [todos],
  )

  if (!selected) {
    return (
      <main className="projects-page project-empty-state">
        <span aria-hidden="true">＋</span>
        <h1>첫 프로젝트를 만들어 보세요.</h1>
        <p>카테고리 아래에 프로젝트를 만들면 할 일과 일정을 함께 볼 수 있어요.</p>
      </main>
    )
  }

  const { category, project } = selected
  const projectTasks = allTasks.filter(
    ({ todo }) => todo.project === project.name,
  )
  const projectEvents = events
    .filter((event) => event.project === project.name)
    .sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
    )
  const completedCount = projectTasks.filter(({ todo }) => todo.done).length
  const completionRate = projectTasks.length
    ? Math.round((completedCount / projectTasks.length) * 100)
    : 0

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const addTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = todoText.trim()
    if (!text) return
    onAddTodo(project.name, text)
    setTodoText('')
  }

  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = eventTitle.trim()
    if (!title) return
    onAddEvent(project.name, title, eventTime)
    setEventTitle('')
    setEventTime('09:00')
  }

  const createProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newProject.name.trim() || !newProject.categoryId) return

    const createdId = onCreateProject({
      ...newProject,
      name: newProject.name.trim(),
      description: newProject.description.trim(),
    })
    setIsCreateProjectOpen(false)
    setNewProject({
      categoryId: categories[0]?.id ?? '',
      name: '',
      description: '',
      accent: 'coral',
    })
    navigate(`/projects/${createdId}`)
  }

  return (
    <main className="projects-page">
      <aside className="project-tree" aria-label="카테고리와 프로젝트">
        <div className="project-tree-heading">
          <div>
            <p className="eyebrow">나의 계획</p>
            <h1>프로젝트</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateProjectOpen(true)}
            aria-label="새 프로젝트 만들기"
          >
            ＋
          </button>
        </div>

        <div className="project-overview-link">
          <Link to="/todos"><span aria-hidden="true">☀</span> 오늘 할 일</Link>
          <strong>{allTasks.filter(({ dateKey }) => dateKey === todayKey).length}</strong>
        </div>

        <nav className="project-category-tree" aria-label="프로젝트 목록">
          {categories.map((item) => {
            const isCollapsed = collapsedCategories.has(item.id)
            return (
              <section key={item.id}>
                <button
                  className="project-category-button"
                  type="button"
                  onClick={() => toggleCategory(item.id)}
                  aria-expanded={!isCollapsed}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.name}
                  <small>{item.projects.length}</small>
                  <i aria-hidden="true">{isCollapsed ? '›' : '⌄'}</i>
                </button>
                {!isCollapsed && (
                  <div className="project-tree-children">
                    {item.projects.map((child) => {
                      const taskCount = allTasks.filter(
                        ({ todo }) => todo.project === child.name && !todo.done,
                      ).length
                      return (
                        <Link
                          className={child.id === project.id ? 'active' : ''}
                          to={`/projects/${child.id}`}
                          key={child.id}
                        >
                          <span className={child.accent} aria-hidden="true" />
                          {child.name}
                          {taskCount > 0 && <small>{taskCount}</small>}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </nav>

        <button
          className="project-tree-add"
          type="button"
          onClick={() => setIsCreateProjectOpen(true)}
        >
          <span aria-hidden="true">＋</span> 새 프로젝트
        </button>
      </aside>

      <section className="project-workspace" aria-labelledby="project-title">
        <header className={`project-hero ${project.accent}`}>
          <div className="project-breadcrumb">
            <span>{category.name}</span><i aria-hidden="true">›</i><strong>{project.name}</strong>
          </div>
          <div className="project-hero-main">
            <div>
              <p className="eyebrow">진행 중인 프로젝트</p>
              <h1 id="project-title">{project.name}</h1>
              <p>{project.description || '이 프로젝트의 할 일과 일정을 한곳에서 관리해요.'}</p>
            </div>
            <div className="project-progress-card" aria-label={`프로젝트 ${completionRate}% 완료`}>
              <span>전체 진행률</span>
              <strong>{completionRate}%</strong>
              <div aria-hidden="true"><i style={{ width: `${completionRate}%` }} /></div>
              <small>{completedCount}개 완료 · {projectTasks.length - completedCount}개 남음</small>
            </div>
          </div>
          <div className="project-goal-line">
            <span aria-hidden="true">◎</span>
            <small>이번 목표</small>
            <strong>{project.goal}</strong>
          </div>
        </header>

        <div className="project-content-grid">
          <section className="project-task-panel" aria-labelledby="project-task-title">
            <div className="project-panel-heading">
              <div>
                <p className="eyebrow">실행할 일</p>
                <h2 id="project-task-title">할 일</h2>
              </div>
              <span>{completedCount}/{projectTasks.length} 완료</span>
            </div>

            <form className="project-quick-form" onSubmit={addTodo}>
              <label className="sr-only" htmlFor="project-new-todo">프로젝트에 새 할 일 추가</label>
              <span aria-hidden="true">＋</span>
              <input
                id="project-new-todo"
                value={todoText}
                onChange={(event) => setTodoText(event.target.value)}
                placeholder={`${project.name}에 할 일 추가`}
              />
              <button type="submit">추가</button>
            </form>

            <ul className="project-task-list">
              {projectTasks.map(({ todo, dateKey }) => (
                <li className={todo.done ? 'completed' : ''} key={todo.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => onToggleTodo(todo.id)}
                    />
                    <span aria-hidden="true">✓</span>
                    <span className="sr-only">{todo.text} 완료 상태 변경</span>
                  </label>
                  <Link to={`/todos/${todo.id}`}>
                    <strong>{todo.text}</strong>
                    <small>
                      {formatProjectDate(dateKey, todayKey)} · 예상 {todo.estimatedMinutes ?? 30}분
                    </small>
                  </Link>
                  <span className={`project-priority priority-${todo.priority}`}>
                    {priorityLabels[todo.priority]}
                  </span>
                </li>
              ))}
            </ul>

            {!projectTasks.length && (
              <div className="project-panel-empty">
                <span aria-hidden="true">✓</span>
                <p>아직 등록된 할 일이 없어요.</p>
                <small>위 입력창에서 첫 할 일을 추가해 보세요.</small>
              </div>
            )}
          </section>

          <aside className="project-schedule-panel" aria-labelledby="project-schedule-title">
            <div className="project-panel-heading">
              <div>
                <p className="eyebrow">시간 약속</p>
                <h2 id="project-schedule-title">일정</h2>
              </div>
              <span>{projectEvents.length}개</span>
            </div>

            <form className="project-event-form" onSubmit={addEvent}>
              <label>
                <span>시간</span>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                />
              </label>
              <label>
                <span>일정 이름</span>
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="새 일정"
                />
              </label>
              <button type="submit">일정 추가</button>
            </form>

            <div className="project-event-list">
              {projectEvents.map((item) => (
                <article key={item.id}>
                  <time>
                    <strong>{item.startTime}</strong>
                    <small>{formatProjectDate(item.date, todayKey)}</small>
                  </time>
                  <span className={project.accent} aria-hidden="true" />
                  <p>{item.title}</p>
                </article>
              ))}
            </div>

            {!projectEvents.length && (
              <div className="project-panel-empty compact">
                <span aria-hidden="true">◷</span>
                <p>연결된 일정이 없어요.</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      {isCreateProjectOpen && (
        <div className="project-modal-backdrop" role="presentation">
          <section
            className="project-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
          >
            <div className="project-modal-heading">
              <div>
                <p className="eyebrow">계획 확장하기</p>
                <h2 id="new-project-title">새 프로젝트</h2>
              </div>
              <button
                type="button"
                aria-label="새 프로젝트 닫기"
                onClick={() => setIsCreateProjectOpen(false)}
              >×</button>
            </div>
            <form onSubmit={createProject}>
              <label>
                <span>상위 카테고리</span>
                <select
                  value={newProject.categoryId}
                  onChange={(event) => setNewProject({ ...newProject, categoryId: event.target.value })}
                >
                  {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>프로젝트 이름</span>
                <input
                  autoFocus
                  required
                  maxLength={30}
                  value={newProject.name}
                  onChange={(event) => setNewProject({ ...newProject, name: event.target.value })}
                  placeholder="예: 가을 여행 준비"
                />
              </label>
              <label>
                <span>한 줄 설명</span>
                <textarea
                  maxLength={90}
                  value={newProject.description}
                  onChange={(event) => setNewProject({ ...newProject, description: event.target.value })}
                  placeholder="이 프로젝트에서 이루고 싶은 일을 적어보세요."
                />
              </label>
              <fieldset>
                <legend>프로젝트 색상</legend>
                <div className="project-color-options">
                  {(Object.keys(accentLabels) as ProjectAccent[]).map((accent) => (
                    <label key={accent}>
                      <input
                        type="radio"
                        name="project-accent"
                        value={accent}
                        checked={newProject.accent === accent}
                        onChange={() => setNewProject({ ...newProject, accent })}
                      />
                      <span className={accent} aria-hidden="true" />
                      <small>{accentLabels[accent]}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="project-modal-actions">
                <button type="button" onClick={() => setIsCreateProjectOpen(false)}>취소</button>
                <button type="submit">프로젝트 만들기</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
