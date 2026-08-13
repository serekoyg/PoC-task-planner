import type { Todo } from '../data/initialData'
import { BACKLOG_PROJECT_NAME } from '../data/projects'

export const getTaskProject = (todo: Todo) =>
  todo.project ?? todo.category ?? BACKLOG_PROJECT_NAME

export const getTaskEstimate = (todo: Todo) => todo.estimatedMinutes ?? 30

export const getTaskPriority = (todo: Todo) => {
  if (todo.priority === 'high') return '높음'
  if (todo.priority === 'low') return '낮음'
  return '보통'
}

export const formatTaskDate = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

export const formatTimer = (seconds: number) => {
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${rest}`
}

export const formatFocusedTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}초`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}시간 ${minutes}분` : `${minutes}분`
}
