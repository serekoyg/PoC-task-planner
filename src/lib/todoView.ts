import type { Todo } from '../data/initialData'
import type { PlannerProject, ProjectAccent } from '../data/projects'
import { BACKLOG_PROJECT_NAME, isBacklogProject } from '../data/projects'
import type { ProjectFilter } from '../components/ProjectSidebar'

export type TodoProjectBucket = {
  id: string
  name: string
  accent: ProjectAccent | 'neutral'
}

const backlogBucket: TodoProjectBucket = {
  id: 'backlog',
  name: BACKLOG_PROJECT_NAME,
  accent: 'neutral',
}

export const getTodoProjectBuckets = (
  projects: PlannerProject[],
  selectedProjectId: ProjectFilter,
): TodoProjectBucket[] => {
  if (selectedProjectId === 'backlog') return [backlogBucket]

  if (selectedProjectId !== 'all') {
    const selectedProject = projects.find(
      (project) => project.id === selectedProjectId,
    )
    return selectedProject ? [selectedProject] : []
  }

  return [backlogBucket, ...projects]
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
