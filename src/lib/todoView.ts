import type { Todo } from '../data/initialData'
import type { PlannerProject, ProjectAccent } from '../data/projects'
import type { ProjectFilter } from '../components/ProjectSidebar'

export type TodoProjectBucket = {
  id: string
  name: string
  accent: ProjectAccent | 'neutral'
}

const inboxBucket: TodoProjectBucket = {
  id: 'inbox',
  name: '받은 편지함',
  accent: 'neutral',
}

export const getTodoProjectBuckets = (
  projects: PlannerProject[],
  selectedProjectId: ProjectFilter,
): TodoProjectBucket[] => {
  if (selectedProjectId === 'inbox') return [inboxBucket]

  if (selectedProjectId !== 'all') {
    const selectedProject = projects.find(
      (project) => project.id === selectedProjectId,
    )
    return selectedProject ? [selectedProject] : []
  }

  return [inboxBucket, ...projects]
}

export const getBucketTodos = (
  todos: Todo[],
  bucket: TodoProjectBucket,
) =>
  todos
    .filter((todo) =>
      bucket.id === 'inbox'
        ? !todo.project || todo.project === '받은 편지함'
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
