import type { Todo } from '../data/initialData'
import type { PlannerProject, ProjectAccent } from '../data/projects'
import {
  BACKLOG_PROJECT_NAME,
  DEFAULT_PROJECT_COLOR,
  getProjectColor,
  isBacklogProject,
} from '../data/projects'
import type { ProjectSelection } from '../data/projects'

export type TodoProjectBucket = {
  id: string
  name: string
  accent: ProjectAccent | 'neutral'
  color: string
}

const backlogBucket: TodoProjectBucket = {
  id: 'backlog',
  name: BACKLOG_PROJECT_NAME,
  accent: 'neutral',
  color: DEFAULT_PROJECT_COLOR,
}

export const getTodoProjectBuckets = (
  projects: PlannerProject[],
  selectedProjectIds: ProjectSelection,
): TodoProjectBucket[] => {
  if (selectedProjectIds.length) {
    return [
      ...(selectedProjectIds.includes('backlog') ? [backlogBucket] : []),
      ...projects
        .filter((project) => selectedProjectIds.includes(project.id))
        .map((project) => ({ ...project, color: getProjectColor(project) })),
    ]
  }

  return [
    backlogBucket,
    ...projects.map((project) => ({
      ...project,
      color: getProjectColor(project),
    })),
  ]
}

export const getBucketTodos = (
  todos: Todo[],
  bucket: TodoProjectBucket,
) =>
  todos
    .filter((todo) =>
      bucket.id === 'backlog'
        ? isBacklogProject(todo.project)
        : todo.project === bucket.name,
    )
    .sort((first, second) => {
      if (first.done !== second.done) return first.done ? 1 : -1
      const dateDifference = first.date.localeCompare(second.date)
      if (dateDifference) return dateDifference
      return (first.dueTime || '99:99').localeCompare(
        second.dueTime || '99:99',
      )
    })
