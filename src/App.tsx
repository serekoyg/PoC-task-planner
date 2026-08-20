import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import GlobalSearch from './components/GlobalSearch'
import NotificationInbox from './components/NotificationInbox'
import ActiveFocusPopover from './components/ActiveFocusPopover'
import AppSidebar from './components/AppSidebar'
import {
  type CalendarEvent,
  type CalendarEventInput,
  createInitialEvents,
  createInitialTodos,
  type Todo,
  type TodoInput,
} from './data/initialData'
import {
  BACKLOG_PROJECT_NAME,
  createInitialProjects,
  isBacklogProject,
  normalizeBacklogProject,
  normalizeProjects,
  type CalendarTodoVisibility,
  type PlannerProject,
  type ProjectInput,
} from './data/projects'
import {
  createInitialStudyRooms,
  normalizeStudyRooms,
  type StudyProfileVisibility,
  type StudySharedItemEntry,
  type StudyRoom,
  type StudyRoomCreateInput,
} from './data/studyRooms'
import {
  createInitialNotifications,
  type PlannerNotification,
} from './data/notifications'
import { createInitialTrash, type TrashedPlan } from './data/trash'
import {
  createInitialFocusRecords,
  type FocusRecord,
  type FocusSourceType,
} from './data/focusRecords'
import {
  getFocusDurationSeconds,
  getFocusSegments,
  isFocusRecordRunning,
} from './lib/focus'
import type { AuthMethod } from './lib/auth'
import type { PlannerTarget } from './lib/plannerNavigation'
import CalendarPage from './pages/CalendarPage'
import FocusResultPage from './pages/FocusResultPage'
import FocusSessionPage from './pages/FocusSessionPage'
import LoginPage from './pages/LoginPage'
import PlanCollectionsPage from './pages/PlanCollectionsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import SignupPage from './pages/SignupPage'
import StudyRoomDetailPage from './pages/StudyRoomDetailPage'
import StudyRoomManagementPage from './pages/StudyRoomManagementPage'
import StudyRoomsPage from './pages/StudyRoomsPage'
import StudyMemberProfilePage from './pages/StudyMemberProfilePage'
import TodosPage from './pages/TodosPage'

const TODO_STORAGE_KEY = 'haru.v2.todos'
const EVENT_STORAGE_KEY = 'haru.v2.events'
const STUDY_STORAGE_KEY = 'haru.v2.study-rooms'
const FOCUS_STORAGE_KEY = 'haru.v2.focus-results'
const FOCUS_RECORD_STORAGE_KEY = 'haru.v2.focus-records'
const PROJECT_STORAGE_KEY = 'haru.v2.projects'
const CALENDAR_TODO_VISIBILITY_STORAGE_KEY =
  'haru.v2.calendar-todo-visibility'
const AUTH_STORAGE_KEY = 'haru.demo-authenticated'
const NOTIFICATION_STORAGE_KEY = 'haru.v2.notification-inbox'
const TRASH_STORAGE_KEY = 'haru.v2.deleted-plans'
const AUTH_METHOD_STORAGE_KEY = 'haru.demo-auth-method'

const readStorage = <T,>(key: string, fallback: () => T): T => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback()
  } catch {
    return fallback()
  }
}

const readProjects = () =>
  normalizeProjects(
    readStorage<PlannerProject[]>(PROJECT_STORAGE_KEY, createInitialProjects),
  )

const readEvents = () =>
  readStorage<CalendarEvent[]>(EVENT_STORAGE_KEY, createInitialEvents).map(
    (event) => ({ ...event, project: normalizeBacklogProject(event.project) }),
  )

const readTodos = () =>
  readStorage<Todo[]>(TODO_STORAGE_KEY, createInitialTodos).map((todo) => ({
    ...todo,
    project: normalizeBacklogProject(todo.project),
  }))

const readStudyRooms = () =>
  normalizeStudyRooms(
    readStorage<StudyRoom[]>(STUDY_STORAGE_KEY, createInitialStudyRooms),
  )

const readNotifications = () =>
  readStorage<PlannerNotification[]>(
    NOTIFICATION_STORAGE_KEY,
    createInitialNotifications,
  )

const readTrash = () =>
  readStorage<TrashedPlan[]>(TRASH_STORAGE_KEY, createInitialTrash).map(
    (entry) => ({
      ...entry,
      item: {
        ...entry.item,
        project: normalizeBacklogProject(entry.item.project),
      },
    }),
  ) as TrashedPlan[]

const readFocusRecords = () =>
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

type StudyRoomRouteProps = {
  rooms: StudyRoom[]
  activeFocusRecords: FocusRecord[]
  nowMs: number
  onJoinRoom: (roomId: string) => void
  onChangeRoom: (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => void
  onStartFocus: (
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
  ) => void
  onStopFocus: (recordId: string) => void
}

function StudyRoomRoute({
  rooms,
  activeFocusRecords,
  nowMs,
  onJoinRoom,
  onChangeRoom,
  onStartFocus,
  onStopFocus,
}: StudyRoomRouteProps) {
  const { roomId } = useParams()
  return (
    <StudyRoomDetailPage
      room={rooms.find((room) => room.id === roomId)}
      activeFocusRecords={activeFocusRecords}
      nowMs={nowMs}
      onJoinRoom={onJoinRoom}
      onChangeRoom={onChangeRoom}
      onStartFocus={onStartFocus}
      onStopFocus={onStopFocus}
    />
  )
}

type StudyRoomManagementRouteProps = {
  rooms: StudyRoom[]
  onChangeRoom: (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => void
}

function StudyRoomManagementRoute({
  rooms,
  onChangeRoom,
}: StudyRoomManagementRouteProps) {
  const { roomId } = useParams()
  return (
    <StudyRoomManagementPage
      room={rooms.find((room) => room.id === roomId)}
      onChangeRoom={onChangeRoom}
    />
  )
}

type StudyMemberProfileRouteProps = {
  rooms: StudyRoom[]
}

function StudyMemberProfileRoute({ rooms }: StudyMemberProfileRouteProps) {
  const { roomId, memberId } = useParams()
  const room = rooms.find((item) => item.id === roomId)
  return (
    <StudyMemberProfilePage
      room={room}
      member={room?.members.find((member) => member.id === memberId)}
    />
  )
}

type TaskEntry = {
  todo: Todo
}

const findTask = (
  todos: Todo[],
  todoId?: string,
): TaskEntry | undefined => {
  if (!todoId) return undefined
  const todo = todos.find((item) => item.id === todoId)
  return todo ? { todo } : undefined
}

type FocusSessionRouteProps = {
  todos: Todo[]
  activeFocusRecords: FocusRecord[]
  nowMs: number
  onStartFocus: (
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
  ) => void
  onPauseFocus: (recordId: string) => void
  onFinishFocus: (recordId: string) => void
}

function FocusSessionRoute({
  todos,
  activeFocusRecords,
  nowMs,
  onStartFocus,
  onPauseFocus,
  onFinishFocus,
}: FocusSessionRouteProps) {
  const { todoId } = useParams()
  const task = findTask(todos, todoId)
  const activeRecord = activeFocusRecords.find(
    (record) => record.sourceType === 'todo' && record.sourceId === todoId,
  )

  return (
    <FocusSessionPage
      todo={task?.todo}
      activeRecord={activeRecord}
      nowMs={nowMs}
      onStartFocus={onStartFocus}
      onPauseFocus={onPauseFocus}
      onFinishFocus={onFinishFocus}
    />
  )
}

type FocusResultRouteProps = {
  todos: Todo[]
  focusResults: Record<string, number>
}

function FocusResultRoute({
  todos,
  focusResults,
}: FocusResultRouteProps) {
  const { todoId } = useParams()
  const task = findTask(todos, todoId)

  return (
    <FocusResultPage
      todo={task?.todo}
      focusedSeconds={todoId ? focusResults[todoId] : undefined}
    />
  )
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_STORAGE_KEY) === 'true',
  )
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationInboxOpen, setIsNotificationInboxOpen] = useState(false)
  const [isFocusPopoverOpen, setIsFocusPopoverOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [profileActionMessage, setProfileActionMessage] = useState(
    '오늘 오후 9:27에 동기화됨',
  )
  const [selectedDate, setSelectedDate] = useState(today)
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [todos, setTodos] = useState<Todo[]>(readTodos)
  const [events, setEvents] = useState<CalendarEvent[]>(readEvents)
  const [projects, setProjects] = useState<PlannerProject[]>(readProjects)
  const [calendarTodoVisibility, setCalendarTodoVisibility] =
    useState<CalendarTodoVisibility>(() =>
      readStorage<CalendarTodoVisibility>(
        CALENDAR_TODO_VISIBILITY_STORAGE_KEY,
        () => ({}),
      ),
    )
  const [notifications, setNotifications] =
    useState<PlannerNotification[]>(readNotifications)
  const [trash, setTrash] = useState<TrashedPlan[]>(readTrash)
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>(() =>
    readStudyRooms(),
  )
  const [focusResults, setFocusResults] = useState<Record<string, number>>(() =>
    readStorage(FOCUS_STORAGE_KEY, () => ({})),
  )
  const [focusRecords, setFocusRecords] =
    useState<FocusRecord[]>(readFocusRecords)
  const [focusNowMs, setFocusNowMs] = useState(Date.now())
  const unfinishedFocusRecords = useMemo(
    () => focusRecords.filter((record) => !record.endedAt),
    [focusRecords],
  )
  const activeFocusRecords = useMemo(
    () => unfinishedFocusRecords.filter(isFocusRecordRunning),
    [unfinishedFocusRecords],
  )
  const joinedStudyRooms = useMemo(
    () => studyRooms.filter((room) => room.joined),
    [studyRooms],
  )
  const myProfileVisibility = useMemo<StudyProfileVisibility>(
    () =>
      studyRooms
        .flatMap((room) => room.members)
        .find((member) => member.isMe)?.profileVisibility ?? 'roomMembers',
    [studyRooms],
  )
  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.read,
  ).length
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

  const login = (method: AuthMethod) => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true')
    localStorage.setItem(AUTH_METHOD_STORAGE_KEY, method)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(AUTH_METHOD_STORAGE_KEY)
    setIsProfileMenuOpen(false)
    setIsAuthenticated(false)
  }

  const sharedItemEntries = useMemo<StudySharedItemEntry[]>(
    () =>
      joinedStudyRooms.flatMap((room) => {
        const me = room.members.find((member) => member.isMe)
        if (!me) return []
        const hasRoomManagementRole =
          room.ownerId === me.id || room.managerIds.includes(me.id)
        return room.sharedItems.map((item) => ({
          roomId: room.id,
          roomName: room.name,
          memberId: me.id,
          canManage:
            hasRoomManagementRole || item.createdById === me.id,
          item,
        }))
      }),
    [joinedStudyRooms],
  )
  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events))
  }, [events])

  useEffect(() => {
    localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(studyRooms))
  }, [studyRooms])

  useEffect(() => {
    localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(focusResults))
  }, [focusResults])

  useEffect(() => {
    localStorage.setItem(FOCUS_RECORD_STORAGE_KEY, JSON.stringify(focusRecords))
  }, [focusRecords])

  useEffect(() => {
    if (!activeFocusRecords.length) return

    setFocusNowMs(Date.now())
    const timer = window.setInterval(() => setFocusNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activeFocusRecords.length])

  useEffect(() => {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    localStorage.setItem(
      CALENDAR_TODO_VISIBILITY_STORAGE_KEY,
      JSON.stringify(calendarTodoVisibility),
    )
  }, [calendarTodoVisibility])

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(notifications),
    )
  }, [notifications])

  useEffect(() => {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trash))
  }, [trash])

  useEffect(() => {
    setIsProfileMenuOpen(false)
    setIsSearchOpen(false)
    setIsNotificationInboxOpen(false)
    setIsFocusPopoverOpen(false)
    setIsSidebarOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const openGlobalSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsProfileMenuOpen(false)
        setIsNotificationInboxOpen(false)
        setIsFocusPopoverOpen(false)
        setIsSearchOpen(true)
      }
    }

    window.addEventListener('keydown', openGlobalSearch)
    return () => window.removeEventListener('keydown', openGlobalSearch)
  }, [])

  useEffect(() => {
    if (!isProfileMenuOpen) return

    const closeProfileMenu = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    const closeProfileMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false)
    }

    document.addEventListener('mousedown', closeProfileMenu)
    window.addEventListener('keydown', closeProfileMenuOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeProfileMenu)
      window.removeEventListener('keydown', closeProfileMenuOnEscape)
    }
  }, [isProfileMenuOpen])

  const selectToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const selectDate = (date: Date) => {
    setSelectedDate(date)
    setVisibleMonth(
      (current) =>
        current.getFullYear() === date.getFullYear() &&
        current.getMonth() === date.getMonth()
          ? current
          : new Date(date.getFullYear(), date.getMonth(), 1),
    )
  }

  const navigateToTarget = (target: PlannerTarget) => {
    if (target.kind === 'event') {
      selectDate(new Date(`${target.date}T00:00:00`))
      navigate('/calendar')
    } else if (target.kind === 'todo') {
      navigate(`/todos/${target.id}`)
    } else {
      navigate(`/studies/${target.id}`)
    }
    setIsSearchOpen(false)
    setIsNotificationInboxOpen(false)
    setIsFocusPopoverOpen(false)
  }

  const openSearch = () => {
    setIsProfileMenuOpen(false)
    setIsNotificationInboxOpen(false)
    setIsFocusPopoverOpen(false)
    setIsSearchOpen(true)
  }

  const toggleNotificationInbox = () => {
    setIsProfileMenuOpen(false)
    setIsSearchOpen(false)
    setIsFocusPopoverOpen(false)
    setIsNotificationInboxOpen((current) => !current)
  }

  const closeFocusPopover = useCallback(() => {
    setIsFocusPopoverOpen(false)
  }, [])

  const markAllNotificationsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    )
  }

  const openNotification = (
    notificationId: string,
    target: PlannerTarget,
  ) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification,
      ),
    )
    navigateToTarget(target)
  }

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

  const updateProject = (projectId: string, input: ProjectInput) => {
    const previousProject = projects.find((project) => project.id === projectId)
    if (!previousProject) return

    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, ...input } : project,
      ),
    )

    if (previousProject.name !== input.name) {
      setTodos((current) =>
        current.map((todo) =>
          todo.project === previousProject.name
            ? { ...todo, project: input.name }
            : todo,
        ),
      )
      setEvents((current) =>
        current.map((event) =>
          event.project === previousProject.name
            ? { ...event, project: input.name }
            : event,
        ),
      )
      setTrash((current) =>
        current.map((entry) => {
          if (entry.item.project !== previousProject.name) return entry
          if (entry.type === 'todo') {
            return { ...entry, item: { ...entry.item, project: input.name } }
          }
          return { ...entry, item: { ...entry.item, project: input.name } }
        }),
      )
    }
  }

  const deleteProject = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return

    setProjects((current) => current.filter((item) => item.id !== projectId))
    setTodos((current) =>
      current.map((todo) =>
        todo.project === project.name
          ? { ...todo, project: BACKLOG_PROJECT_NAME }
          : todo,
      ),
    )
    setEvents((current) =>
      current.map((event) =>
        event.project === project.name
          ? { ...event, project: BACKLOG_PROJECT_NAME }
          : event,
      ),
    )
    setTrash((current) =>
      current.map((entry) => {
        if (entry.item.project !== project.name) return entry
        if (entry.type === 'todo') {
          return {
            ...entry,
            item: { ...entry.item, project: BACKLOG_PROJECT_NAME },
          }
        }
        return {
          ...entry,
          item: { ...entry.item, project: BACKLOG_PROJECT_NAME },
        }
      }),
    )
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

  const startFocus = useCallback((
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
  ) => {
    setFocusRecords((current) => {
      const existing = current.find(
        (record) =>
          !record.endedAt &&
          record.sourceType === sourceType &&
          record.sourceId === sourceId,
      )
      const startedAt = new Date().toISOString()
      if (existing) {
        if (isFocusRecordRunning(existing)) return current
        return current.map((record) =>
          record.id === existing.id
            ? {
                ...record,
                segments: [...getFocusSegments(record), { startedAt }],
              }
            : record,
        )
      }

      return [
        ...current,
        {
          id: `focus-${crypto.randomUUID()}`,
          sourceType,
          sourceId,
          title,
          startedAt,
          segments: [{ startedAt }],
        },
      ]
    })
  }, [])

  const pauseFocus = useCallback((recordId: string) => {
    const pausedAt = new Date().toISOString()
    setFocusRecords((current) =>
      current.map((record) => {
        if (record.id !== recordId || !isFocusRecordRunning(record)) {
          return record
        }
        const segments = getFocusSegments(record)
        return {
          ...record,
          segments: segments.map((segment, index) =>
            index === segments.length - 1
              ? { ...segment, endedAt: pausedAt }
              : segment,
          ),
        }
      }),
    )
  }, [])

  const finishFocus = useCallback((recordId: string) => {
    const record = focusRecords.find(
      (candidate) => candidate.id === recordId && !candidate.endedAt,
    )
    if (!record) return

    const endedAt = new Date()
    const endedAtIso = endedAt.toISOString()
    const segments = getFocusSegments(record)
    const finishedRecord: FocusRecord = {
      ...record,
      endedAt: endedAtIso,
      segments: segments.map((segment, index) =>
        index === segments.length - 1 && !segment.endedAt
          ? { ...segment, endedAt: endedAtIso }
          : segment,
      ),
    }
    const elapsedSeconds = getFocusDurationSeconds(
      finishedRecord,
      endedAt.getTime(),
    )

    setFocusRecords((current) =>
      current.map((candidate) =>
        candidate.id === recordId ? finishedRecord : candidate,
      ),
    )

    if (record.sourceType === 'todo') {
      setFocusResults((current) => ({
        ...current,
        [record.sourceId]: (current[record.sourceId] ?? 0) + elapsedSeconds,
      }))
    }
  }, [focusRecords])

  const pauseAllFocus = useCallback(() => {
    if (!activeFocusRecords.length) return

    const pausedAt = new Date().toISOString()
    setFocusRecords((current) =>
      current.map((record) => {
        if (!isFocusRecordRunning(record)) return record
        const segments = getFocusSegments(record)
        return {
          ...record,
          segments: segments.map((segment, index) =>
            index === segments.length - 1
              ? { ...segment, endedAt: pausedAt }
              : segment,
          ),
        }
      }),
    )
  }, [activeFocusRecords.length])

  const openFocusSource = (record: FocusRecord) => {
    navigate(
      record.sourceType === 'todo'
        ? `/todos/${record.sourceId}/focus`
        : `/studies/${record.sourceId}`,
    )
    setIsFocusPopoverOpen(false)
  }

  const joinStudyRoom = (roomId: string) => {
    setStudyRooms((current) =>
      current.map((room) => {
        if (room.id !== roomId || room.joined) return room

        return {
          ...room,
          joined: true,
          memberCount: room.memberCount + 1,
          members: [
            ...room.members,
            {
              id: 'me',
              name: '민서',
              avatar: '민',
              minutes: 0,
              status: 'resting',
              focusLabel: '오늘의 활동을 준비 중이에요',
              isMe: true,
              weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
              profileVisibility: myProfileVisibility,
              bio: '매일 조금씩 꾸준하게 이어가고 있어요.',
            },
          ],
        }
      }),
    )
  }

  const changeStudyRoom = (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => {
    setStudyRooms((current) =>
      current.map((room) => (room.id === roomId ? update(room) : room)),
    )
  }

  const updateMyProfileVisibility = (
    visibility: StudyProfileVisibility,
  ) => {
    setStudyRooms((current) =>
      current.map((room) => ({
        ...room,
        members: room.members.map((member) =>
          member.isMe
            ? { ...member, profileVisibility: visibility }
            : member,
        ),
      })),
    )
  }

  const toggleSharedItemStatus = (roomId: string, itemId: string) => {
    changeStudyRoom(roomId, (room) => {
      const me = room.members.find((member) => member.isMe)
      if (!me) return room
      return {
        ...room,
        sharedItems: room.sharedItems.map((item) => {
          if (item.id !== itemId) return item
          const statusMemberIds =
            item.type === 'event'
              ? item.participantMemberIds
              : item.completedMemberIds
          const nextMemberIds = statusMemberIds.includes(me.id)
            ? statusMemberIds.filter((memberId) => memberId !== me.id)
            : [...statusMemberIds, me.id]
          if (item.type === 'event') {
            return { ...item, participantMemberIds: nextMemberIds }
          }
          const nextCompletedAtByMember = { ...item.completedAtByMember }
          if (statusMemberIds.includes(me.id)) {
            delete nextCompletedAtByMember[me.id]
          } else {
            nextCompletedAtByMember[me.id] = new Date().toISOString()
          }
          return {
            ...item,
            completedMemberIds: nextMemberIds,
            completedAtByMember: nextCompletedAtByMember,
          }
        }),
      }
    })
  }

  const createStudyRoom = (input: StudyRoomCreateInput) => {
    const roomId = `study-${crypto.randomUUID()}`
    const accents: StudyRoom['accent'][] = ['coral', 'blue', 'green', 'violet']

    setStudyRooms((current) => [
      {
        ...input,
        id: roomId,
        accent: accents[current.length % accents.length],
        memberCount: 1,
        joined: true,
        visibility: 'public',
        todayMinutes: 0,
        weeklyProgress: 0,
        streak: 1,
        ownerId: 'me',
        managerIds: [],
        allowMemberSharing: true,
        sharedItems: [],
        chatMessages: [],
        members: [
          {
            id: 'me',
            name: '민서',
            avatar: '민',
            minutes: 0,
            status: 'resting',
            focusLabel: '첫 활동을 준비 중이에요',
            isMe: true,
            weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
            profileVisibility: myProfileVisibility,
            bio: '매일 조금씩 꾸준하게 이어가고 있어요.',
          },
        ],
      },
      ...current,
    ])

    return roomId
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="/signup" element={<SignupPage onSignup={login} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div
      className={`app-shell${activeFocusRecords.length ? ' focus-active' : ''}${
        isSidebarCollapsed ? ' sidebar-collapsed' : ''
      }`}
    >
      <AppSidebar
        projects={projects}
        itemCounts={projectPlanCounts}
        collectionCounts={collectionCounts}
        today={today}
        unreadNotificationCount={unreadNotificationCount}
        isNotificationInboxOpen={isNotificationInboxOpen}
        isProfileMenuOpen={isProfileMenuOpen}
        isMobileOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        profileActionMessage={profileActionMessage}
        profileMenuRef={profileMenuRef}
        onToggleMobile={() => setIsSidebarOpen((current) => !current)}
        onToggleCollapsed={() => {
          setIsNotificationInboxOpen(false)
          setIsProfileMenuOpen(false)
          setIsSidebarCollapsed((current) => !current)
        }}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onSearch={() => {
          setIsSidebarOpen(false)
          openSearch()
        }}
        onSelectToday={selectToday}
        onToggleNotifications={() => {
          setIsSidebarOpen(false)
          toggleNotificationInbox()
        }}
        onToggleProfile={() => {
          setIsSearchOpen(false)
          setIsNotificationInboxOpen(false)
          setIsFocusPopoverOpen(false)
          setIsProfileMenuOpen((current) => !current)
        }}
        onSync={() =>
          setProfileActionMessage('방금 모든 데이터를 동기화했어요')
        }
        onLogout={logout}
      />

      {activeFocusRecords.length > 0 && (
        <div className="focus-island">
          <ActiveFocusPopover
            records={unfinishedFocusRecords}
            nowMs={focusNowMs}
            isOpen={isFocusPopoverOpen}
            onToggle={() => {
              setIsProfileMenuOpen(false)
              setIsSearchOpen(false)
              setIsNotificationInboxOpen(false)
              setIsFocusPopoverOpen((current) => !current)
            }}
            onClose={closeFocusPopover}
            onSelect={openFocusSource}
            onPause={pauseFocus}
            onResume={(recordId) => {
              const record = unfinishedFocusRecords.find(
                (candidate) => candidate.id === recordId,
              )
              if (record) {
                startFocus(record.sourceType, record.sourceId, record.title)
              }
            }}
            onPauseAll={pauseAllFocus}
          />
        </div>
      )}

      {isSearchOpen && (
        <GlobalSearch
          events={events}
          todos={todos}
          rooms={studyRooms}
          onClose={() => setIsSearchOpen(false)}
          onSelect={navigateToTarget}
        />
      )}

      {isNotificationInboxOpen && (
        <NotificationInbox
          notifications={notifications}
          onClose={() => setIsNotificationInboxOpen(false)}
          onMarkAllRead={markAllNotificationsRead}
          onSelect={openNotification}
        />
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route
          path="/calendar"
          element={
            <CalendarPage
              today={today}
              selectedDate={selectedDate}
              visibleMonth={visibleMonth}
              events={events}
              todos={todos}
              projects={projects}
              calendarTodoVisibility={calendarTodoVisibility}
              studyRooms={joinedStudyRooms}
              sharedItems={sharedItemEntries}
              onSelectDate={selectDate}
              onMoveMonth={(amount) =>
                setVisibleMonth(
                  (current) =>
                    new Date(
                      current.getFullYear(),
                      current.getMonth() + amount,
                      1,
                    ),
                )
              }
              onSelectToday={selectToday}
              onAddEvent={addEvent}
              onAddTodo={addTodo}
              onUpdateEvent={updateEvent}
              onRemoveEvent={removeEvent}
              onRemoveTodo={removeTodo}
              onToggleSharedItemStatus={toggleSharedItemStatus}
              onChangeRoom={changeStudyRoom}
            />
          }
        />
        <Route
          path="/todos"
          element={
            <TodosPage
              today={today}
              selectedDate={selectedDate}
              todos={todos}
              projects={projects}
              sharedItems={sharedItemEntries}
              onAddTodo={addTodo}
              onAddEvent={addEvent}
              onUpdateTodo={updateTodo}
              onToggleTodo={toggleTodo}
              onRemoveTodo={removeTodo}
              onToggleSharedItemStatus={toggleSharedItemStatus}
            />
          }
        />
        <Route
          path="/projects/:projectId?"
          element={<Navigate to="/todos" replace />}
        />
        <Route
          path="/collections/completed"
          element={
            <PlanCollectionsPage
              collection="completed"
              todos={todos}
              trash={trash}
              collectionCounts={collectionCounts}
              onToggleTodo={toggleTodo}
              onRemoveTodo={removeTodo}
              onRestoreTrash={restoreTrash}
              onDeleteTrash={deleteTrash}
              onEmptyTrash={() => setTrash([])}
            />
          }
        />
        <Route
          path="/collections/trash"
          element={
            <PlanCollectionsPage
              collection="trash"
              todos={todos}
              trash={trash}
              collectionCounts={collectionCounts}
              onToggleTodo={toggleTodo}
              onRemoveTodo={removeTodo}
              onRestoreTrash={restoreTrash}
              onDeleteTrash={deleteTrash}
              onEmptyTrash={() => setTrash([])}
            />
          }
        />
        <Route
          path="/todos/:todoId"
          element={<Navigate to="/todos" replace />}
        />
        <Route
          path="/todos/:todoId/focus"
          element={
            <FocusSessionRoute
              todos={todos}
              activeFocusRecords={activeFocusRecords}
              nowMs={focusNowMs}
              onStartFocus={startFocus}
              onPauseFocus={pauseFocus}
              onFinishFocus={finishFocus}
            />
          }
        />
        <Route
          path="/todos/:todoId/result"
          element={
            <FocusResultRoute
              todos={todos}
              focusResults={focusResults}
            />
          }
        />
        <Route
          path="/studies"
          element={
            <StudyRoomsPage
              rooms={studyRooms}
              onJoinRoom={joinStudyRoom}
              onCreateRoom={createStudyRoom}
            />
          }
        />
        <Route
          path="/studies/:roomId/manage"
          element={
            <StudyRoomManagementRoute
              rooms={studyRooms}
              onChangeRoom={changeStudyRoom}
            />
          }
        />
        <Route
          path="/studies/:roomId/members/:memberId"
          element={<StudyMemberProfileRoute rooms={studyRooms} />}
        />
        <Route
          path="/studies/:roomId"
          element={
            <StudyRoomRoute
              rooms={studyRooms}
              activeFocusRecords={activeFocusRecords}
              nowMs={focusNowMs}
              onJoinRoom={joinStudyRoom}
              onChangeRoom={changeStudyRoom}
              onStartFocus={startFocus}
              onStopFocus={finishFocus}
            />
          }
        />
        <Route
          path="/profile"
          element={<ProfilePage todos={todos} rooms={studyRooms} />}
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              projects={projects}
              itemCounts={projectPlanCounts}
              calendarTodoVisibility={calendarTodoVisibility}
              onCreateProject={createProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onReorderProjects={reorderProjects}
              onUpdateCalendarTodoVisibility={setCalendarTodoVisibility}
              profileVisibility={myProfileVisibility}
              onUpdateProfileVisibility={updateMyProfileVisibility}
            />
          }
        />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>

      <footer>
        <p>오늘 해야 할 일과 중요한 일정을 한곳에서.</p>
        <Link to="/calendar" onClick={selectToday}>
          오늘 일정 보기
        </Link>
      </footer>
    </div>
  )
}
