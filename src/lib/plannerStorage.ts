import { createInitialEvents, createInitialTodos, type CalendarEvent, type Todo } from '../data/initialData'
import { createInitialProjects, normalizeBacklogProject, normalizeProjects, type PlannerProject } from '../data/projects'
import { createInitialStudyRooms, normalizeStudyRooms, type StudyRoom } from '../data/studyRooms'
import { createInitialNotifications, type PlannerNotification } from '../data/notifications'
import { createInitialTrash, type TrashedPlan } from '../data/trash'
import { createInitialFocusRecords, type FocusRecord } from '../data/focusRecords'

export const TODO_STORAGE_KEY = 'haru.v2.todos'
export const EVENT_STORAGE_KEY = 'haru.v2.events'
export const STUDY_STORAGE_KEY = 'haru.v2.study-rooms'
export const FOCUS_STORAGE_KEY = 'haru.v2.focus-results'
export const FOCUS_RECORD_STORAGE_KEY = 'haru.v2.focus-records'
export const PROJECT_STORAGE_KEY = 'haru.v2.projects'
export const CALENDAR_TODO_VISIBILITY_STORAGE_KEY =
  'haru.v2.calendar-todo-visibility'
export const AUTH_STORAGE_KEY = 'haru.demo-authenticated'
export const NOTIFICATION_STORAGE_KEY = 'haru.v2.notification-inbox'
export const TRASH_STORAGE_KEY = 'haru.v2.deleted-plans'
export const AUTH_METHOD_STORAGE_KEY = 'haru.demo-auth-method'
export const LIVE_FOCUS_ALWAYS_VISIBLE_STORAGE_KEY =
  'haru.v2.live-focus-always-visible'

export const readStorage = <T,>(key: string, fallback: () => T): T => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback()
  } catch {
    return fallback()
  }
}

export const readProjects = (): PlannerProject[] =>
  normalizeProjects(
    readStorage<PlannerProject[]>(PROJECT_STORAGE_KEY, createInitialProjects),
  )

export const readEvents = (): CalendarEvent[] =>
  readStorage<CalendarEvent[]>(EVENT_STORAGE_KEY, createInitialEvents).map(
    (event) => ({ ...event, project: normalizeBacklogProject(event.project) }),
  )

export const readTodos = (): Todo[] =>
  readStorage<Todo[]>(TODO_STORAGE_KEY, createInitialTodos).map((todo) => ({
    ...todo,
    project: normalizeBacklogProject(todo.project),
  }))

export const readStudyRooms = () =>
  normalizeStudyRooms(
    readStorage<StudyRoom[]>(STUDY_STORAGE_KEY, createInitialStudyRooms),
  )

export const readNotifications = () =>
  readStorage<PlannerNotification[]>(
    NOTIFICATION_STORAGE_KEY,
    createInitialNotifications,
  )

export const readTrash = () =>
  readStorage<TrashedPlan[]>(TRASH_STORAGE_KEY, createInitialTrash).map(
    (entry) => ({
      ...entry,
      item: {
        ...entry.item,
        project: normalizeBacklogProject(entry.item.project),
      },
    }),
  ) as TrashedPlan[]

export const readFocusRecords = () =>
  readStorage<FocusRecord[]>(
    FOCUS_RECORD_STORAGE_KEY,
    createInitialFocusRecords,
  ).filter(
    (record) =>
      record.id &&
      record.sourceId &&
      record.title &&
      record.startedAt &&
      (record.sourceType === 'todo' || record.sourceType === 'study'),
  )
