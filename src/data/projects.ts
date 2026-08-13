export type ProjectAccent = 'coral' | 'blue' | 'green' | 'violet'

export type PlannerProject = {
  id: string
  name: string
  accent: ProjectAccent
}

export type ProjectInput = {
  name: string
  accent: ProjectAccent
}

export const BACKLOG_PROJECT_NAME = '백로그'
export const LEGACY_INBOX_PROJECT_NAME = '받은 편지함'

export const isBacklogProject = (project?: string) =>
  !project ||
  project === BACKLOG_PROJECT_NAME ||
  project === LEGACY_INBOX_PROJECT_NAME

export const normalizeBacklogProject = (project?: string) =>
  project === LEGACY_INBOX_PROJECT_NAME ? BACKLOG_PROJECT_NAME : project

export const createInitialProjects = (): PlannerProject[] => [
  { id: 'haru-renewal', name: '하루 리뉴얼', accent: 'coral' },
  { id: 'team-operations', name: '팀 운영', accent: 'blue' },
  { id: 'weekly-plan', name: '주간 계획', accent: 'green' },
  { id: 'license-prep', name: '자격증 준비', accent: 'violet' },
]
