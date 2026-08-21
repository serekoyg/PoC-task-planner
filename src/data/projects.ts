export type ProjectAccent =
  | 'coral'
  | 'blue'
  | 'green'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'custom'

export type PlannerProject = {
  id: string
  name: string
  accent: ProjectAccent
  color?: string
  createdAt?: string
}

export type ProjectFilter = 'all' | 'backlog' | string
export type PlanCollection = 'completed' | 'trash'

export type CalendarTodoVisibility = Record<string, boolean>

export type ProjectInput = {
  name: string
  accent: ProjectAccent
  color: string
}

export const PROJECT_ACCENT_COLORS: Record<Exclude<ProjectAccent, 'custom'>, string> = {
  coral: '#d65c4a',
  blue: '#2563eb',
  green: '#2f7d5a',
  violet: '#7c3aed',
  amber: '#d97706',
  rose: '#db2777',
}

export const DEFAULT_PROJECT_COLOR = '#64748b'

export const getProjectColor = (project?: PlannerProject) =>
  project?.color ??
  (project?.accent === 'custom'
    ? DEFAULT_PROJECT_COLOR
    : project?.accent
      ? PROJECT_ACCENT_COLORS[project.accent]
      : DEFAULT_PROJECT_COLOR)

export const getProjectColorByName = (
  projects: PlannerProject[],
  projectName?: string,
) => getProjectColor(projects.find((project) => project.name === projectName))

export const normalizeProjects = (projects: PlannerProject[]) =>
  projects.map((project, index) => ({
    ...project,
    color: getProjectColor(project),
    createdAt:
      project.createdAt ??
      new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }))

export const BACKLOG_PROJECT_NAME = '미분류'
export const LEGACY_BACKLOG_PROJECT_NAME = '백로그'
export const LEGACY_INBOX_PROJECT_NAME = '받은 편지함'

export const isBacklogProject = (project?: string) =>
  !project ||
  project === BACKLOG_PROJECT_NAME ||
  project === LEGACY_BACKLOG_PROJECT_NAME ||
  project === LEGACY_INBOX_PROJECT_NAME

export const normalizeBacklogProject = (project?: string) =>
  !project ||
  project === LEGACY_BACKLOG_PROJECT_NAME ||
  project === LEGACY_INBOX_PROJECT_NAME
    ? BACKLOG_PROJECT_NAME
    : project

export const createInitialProjects = (): PlannerProject[] => [
  { id: 'haru-renewal', name: '하루 리뉴얼', accent: 'coral', color: PROJECT_ACCENT_COLORS.coral, createdAt: '2026-07-01T09:00:00.000Z' },
  { id: 'team-operations', name: '팀 운영', accent: 'blue', color: PROJECT_ACCENT_COLORS.blue, createdAt: '2026-07-02T09:00:00.000Z' },
  { id: 'weekly-plan', name: '주간 계획', accent: 'green', color: PROJECT_ACCENT_COLORS.green, createdAt: '2026-07-03T09:00:00.000Z' },
  { id: 'license-prep', name: '자격증 준비', accent: 'violet', color: PROJECT_ACCENT_COLORS.violet, createdAt: '2026-07-04T09:00:00.000Z' },
]
