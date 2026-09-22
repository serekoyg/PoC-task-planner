import { useCallback, useMemo } from 'react'
import type { CalendarEventInput, Todo, TodoInput } from '../data/initialData'
import {
  BACKLOG_PROJECT_NAME,
  isBacklogProject,
  type CalendarTodoVisibility,
  type PlannerProject,
  type ProjectInput,
} from '../data/projects'
import {
  CALENDAR_TODO_VISIBILITY_STORAGE_KEY,
  EVENT_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  TODO_STORAGE_KEY,
  TRASH_STORAGE_KEY,
  readEvents,
  readProjects,
  readStorage,
  readTodos,
  readTrash,
} from '../lib/plannerStorage'
import { useStoredState } from './useStoredState'

export function usePersonalPlans() {
  const [todos, setTodos] = useStoredState(TODO_STORAGE_KEY, readTodos)
  const [events, setEvents] = useStoredState(EVENT_STORAGE_KEY, readEvents)
  const [projects, setProjects] = useStoredState(PROJECT_STORAGE_KEY, readProjects)
  const [trash, setTrash] = useStoredState(TRASH_STORAGE_KEY, readTrash)
  const [calendarTodoVisibility, setCalendarTodoVisibility] = useStoredState(
    CALENDAR_TODO_VISIBILITY_STORAGE_KEY,
    () => readStorage<CalendarTodoVisibility>(CALENDAR_TODO_VISIBILITY_STORAGE_KEY, () => ({})),
  )

  const collectionCounts = useMemo(
    () => ({
      completed: todos.filter((todo) => todo.done).length,
      trash: trash.length,
    }),
    [todos, trash.length],
  )
  const projectPlanCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: todos.length + events.length,
      backlog:
        todos.filter((todo) => isBacklogProject(todo.project)).length +
        events.filter((event) => isBacklogProject(event.project)).length,
    }
    projects.forEach((project) => {
      counts[project.id] =
        todos.filter((todo) => todo.project === project.name).length +
        events.filter((event) => event.project === project.name).length
    })
    return counts
  }, [events, projects, todos])

  const addEvent = (event: CalendarEventInput) => {
    setEvents((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        ...event,
        project: event.project ?? BACKLOG_PROJECT_NAME,
      },
    ])
  }

  const updateEvent = (eventId: string, event: CalendarEventInput) => {
    setEvents((current) =>
      current.map((item) =>
        item.id === eventId
          ? {
              ...item,
              ...event,
              id: eventId,
              project: event.project ?? BACKLOG_PROJECT_NAME,
            }
          : item,
      ),
    )
  }

  const removeEvent = (eventId: string) => {
    const event = events.find((item) => item.id === eventId)
    if (event) {
      setTrash((current) => [
        {
          trashId: `trash-${crypto.randomUUID()}`,
          type: 'event',
          item: event,
          deletedAt: new Date().toISOString(),
        },
        ...current,
      ])
    }
    setEvents((current) => current.filter((event) => event.id !== eventId))
  }

  const addTodo = (input: TodoInput) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      done: false,
      ...input,
      project: input.project ?? BACKLOG_PROJECT_NAME,
    }

    setTodos((current) => [...current, newTodo])
  }

  const updateTodo = (todoId: string, input: TodoInput) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              ...input,
              project: input.project ?? BACKLOG_PROJECT_NAME,
            }
          : todo,
      ),
    )
  }

  const createProject = (input: ProjectInput) => {
    const projectId = `project-${crypto.randomUUID()}`

    setProjects((current) => [
      ...current,
      { id: projectId, ...input, createdAt: new Date().toISOString() },
    ])

    return projectId
  }

  const moveProjectPlans = (previousName: string, nextName: string) => {
    const movePlan = <T extends { project?: string }>(plan: T): T =>
      plan.project === previousName ? { ...plan, project: nextName } : plan
    setTodos((current) => current.map(movePlan))
    setEvents((current) => current.map(movePlan))
    setTrash((current) => current.map((entry) => {
      if (entry.item.project !== previousName) return entry
      // Keep the trash entry's discriminant and payload paired.
      return entry.type === 'todo'
        ? { ...entry, item: movePlan(entry.item) }
        : { ...entry, item: movePlan(entry.item) }
    }))
  }

  const updateProject = (projectId: string, input: ProjectInput) => {
    const previous = projects.find((project) => project.id === projectId)
    if (!previous) return
    setProjects((current) => current.map((project) =>
      project.id === projectId ? { ...project, ...input } : project,
    ))
    if (previous.name !== input.name) moveProjectPlans(previous.name, input.name)
  }

  const deleteProject = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    setProjects((current) => current.filter((item) => item.id !== projectId))
    moveProjectPlans(project.name, BACKLOG_PROJECT_NAME)
  }

  const reorderProjects = (orderedProjectIds: string[]) => {
    setProjects((current) => {
      const projectById = new Map(current.map((project) => [project.id, project]))
      const ordered = orderedProjectIds
        .map((projectId) => projectById.get(projectId))
        .filter((project): project is PlannerProject => Boolean(project))
      const orderedIds = new Set(orderedProjectIds)
      return [...ordered, ...current.filter((project) => !orderedIds.has(project.id))]
    })
  }

  const toggleTodo = (todoId: string) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === todoId ? { ...todo, done: !todo.done } : todo,
      ),
    )
  }

  const removeTodo = (todoId: string) => {
    const todo = todos.find((item) => item.id === todoId)
    if (todo) {
      setTrash((current) => [
        {
          trashId: `trash-${crypto.randomUUID()}`,
          type: 'todo',
          item: todo,
          deletedAt: new Date().toISOString(),
        },
        ...current,
      ])
    }
    setTodos((current) => current.filter((todo) => todo.id !== todoId))
  }

  const restoreTrash = (trashId: string) => {
    const entry = trash.find((item) => item.trashId === trashId)
    if (!entry) return

    if (entry.type === 'todo') {
      setTodos((current) =>
        current.some((todo) => todo.id === entry.item.id)
          ? current
          : [...current, entry.item],
      )
    } else {
      setEvents((current) =>
        current.some((event) => event.id === entry.item.id)
          ? current
          : [...current, entry.item],
      )
    }
    setTrash((current) => current.filter((item) => item.trashId !== trashId))
  }

  const deleteTrash = (trashId: string) => {
    setTrash((current) => current.filter((item) => item.trashId !== trashId))
  }

  const setTodoCompleted = useCallback((todoId: string, done: boolean) => {
    setTodos((current) => current.map((todo) =>
      todo.id === todoId && todo.done !== done ? { ...todo, done } : todo,
    ))
  }, [setTodos])

  const emptyTrash = () => setTrash([])

  return {
    todos, events, projects, trash, calendarTodoVisibility,
    collectionCounts, projectPlanCounts,
    addEvent, updateEvent, removeEvent, addTodo, updateTodo, toggleTodo,
    setTodoCompleted, removeTodo, createProject, updateProject, deleteProject,
    reorderProjects, restoreTrash, deleteTrash, emptyTrash, setCalendarTodoVisibility,
  }
}
