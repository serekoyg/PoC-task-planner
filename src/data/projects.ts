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

export const createInitialProjects = (): PlannerProject[] => [
  { id: 'haru-renewal', name: '하루 리뉴얼', accent: 'coral' },
  { id: 'team-operations', name: '팀 운영', accent: 'blue' },
  { id: 'weekly-plan', name: '주간 계획', accent: 'green' },
  { id: 'license-prep', name: '자격증 준비', accent: 'violet' },
]

type LegacyProjectCategory = {
  projects?: PlannerProject[]
}

export const normalizeProjects = (value: unknown): PlannerProject[] => {
  if (!Array.isArray(value)) return createInitialProjects()

  const legacyProjects = (value as LegacyProjectCategory[]).flatMap(
    (category) => category.projects ?? [],
  )
  const candidates = legacyProjects.length
    ? legacyProjects
    : (value as PlannerProject[])

  const projects = candidates.filter(
    (project) => project?.id && project?.name && project?.accent,
  )

  return projects.length ? projects : createInitialProjects()
}
