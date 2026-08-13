import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import GlobalSearch from './components/GlobalSearch'
import NotificationInbox from './components/NotificationInbox'
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
  type PlannerProject,
  type ProjectInput,
} from './data/projects'
import {
  createInitialStudyRooms,
  type StudySharedItem,
  type StudySharedItemEntry,
  type StudyRoom,
  type StudyRoomCreateInput,
} from './data/studyRooms'
import {
  createInitialNotifications,
  type PlannerNotification,
} from './data/notifications'
import { createInitialTrash, type TrashedPlan } from './data/trash'
import { formatHeaderDate } from './lib/date'
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
import TaskDetailPage from './pages/TaskDetailPage'
import TodosPage from './pages/TodosPage'

const TODO_STORAGE_KEY = 'haru.v2.todos'
const EVENT_STORAGE_KEY = 'haru.v2.events'
const STUDY_STORAGE_KEY = 'haru.v2.study-rooms'
const FOCUS_STORAGE_KEY = 'haru.v2.focus-results'
const PROJECT_STORAGE_KEY = 'haru.v2.projects'
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
  readStorage<StudyRoom[]>(STUDY_STORAGE_KEY, createInitialStudyRooms)

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

type StudyRoomRouteProps = {
  rooms: StudyRoom[]
  onJoinRoom: (roomId: string) => void
  onChangeRoom: (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => void
}

function StudyRoomRoute({
  rooms,
  onJoinRoom,
  onChangeRoom,
}: StudyRoomRouteProps) {
  const { roomId } = useParams()
  return (
    <StudyRoomDetailPage
      room={rooms.find((room) => room.id === roomId)}
      onJoinRoom={onJoinRoom}
      onChangeRoom={onChangeRoom}
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

type TaskEntry = {
  todo: Todo
  dateKey: string
}

const findTask = (
  todos: Todo[],
  todoId?: string,
): TaskEntry | undefined => {
  if (!todoId) return undefined
  const todo = todos.find((item) => item.id === todoId)
  return todo ? { todo, dateKey: todo.date } : undefined
}

type TaskRouteProps = {
  todos: Todo[]
  focusResults: Record<string, number>
}

function TaskDetailRoute({ todos, focusResults }: TaskRouteProps) {
  const { todoId } = useParams()
  const task = findTask(todos, todoId)

  return (
    <TaskDetailPage
      todo={task?.todo}
      dateKey={task?.dateKey}
      focusedSeconds={todoId ? focusResults[todoId] : undefined}
    />
  )
}

type FocusSessionRouteProps = {
  todos: Todo[]
  onFinish: (todoId: string, elapsedSeconds: number) => void
}

function FocusSessionRoute({ todos, onFinish }: FocusSessionRouteProps) {
  const { todoId } = useParams()
  const task = findTask(todos, todoId)

  return <FocusSessionPage todo={task?.todo} onFinish={onFinish} />
}

type FocusResultRouteProps = TaskRouteProps & {
  onComplete: (todoId: string, dateKey: string) => void
  onReschedule: (
    todoId: string,
    fromDateKey: string,
    toDateKey: string,
  ) => void
}

function FocusResultRoute({
  todos,
  focusResults,
  onComplete,
  onReschedule,
}: FocusResultRouteProps) {
  const { todoId } = useParams()
  const task = findTask(todos, todoId)

  return (
    <FocusResultPage
      todo={task?.todo}
      dateKey={task?.dateKey}
      focusedSeconds={todoId ? focusResults[todoId] : undefined}
      onComplete={onComplete}
      onReschedule={onReschedule}
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
  const [notifications, setNotifications] =
    useState<PlannerNotification[]>(readNotifications)
  const [trash, setTrash] = useState<TrashedPlan[]>(readTrash)
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>(() =>
    readStudyRooms(),
  )
  const [focusResults, setFocusResults] = useState<Record<string, number>>(() =>
    readStorage(FOCUS_STORAGE_KEY, () => ({})),
  )
  const joinedStudyRooms = useMemo(
    () => studyRooms.filter((room) => room.joined),
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
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

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
  }, [location.pathname])

  useEffect(() => {
    const openGlobalSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsProfileMenuOpen(false)
        setIsNotificationInboxOpen(false)
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
  }

  const openSearch = () => {
    setIsProfileMenuOpen(false)
    setIsNotificationInboxOpen(false)
    setIsSearchOpen(true)
  }

  const toggleNotificationInbox = () => {
    setIsProfileMenuOpen(false)
    setIsSearchOpen(false)
    setIsNotificationInboxOpen((current) => !current)
  }

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

  const addSharedItem = (
    roomId: string,
    createItem: (memberId: string) => StudySharedItem,
  ) => {
    setStudyRooms((current) =>
      current.map((room) => {
        if (room.id !== roomId) return room
        const me = room.members.find((member) => member.isMe)
        if (!me) return room
        const canShare =
          room.ownerId === me.id ||
          room.managerIds.includes(me.id) ||
          room.allowMemberSharing
        if (!canShare) return room
        return {
          ...room,
          sharedItems: [createItem(me.id), ...room.sharedItems],
        }
      }),
    )
  }

  const addEvent = (event: CalendarEventInput, sharedRoomId?: string) => {
    if (sharedRoomId) {
      addSharedItem(sharedRoomId, (memberId) => ({
        id: `shared-${crypto.randomUUID()}`,
        type: 'event',
        title: event.title,
        date: event.date,
        time: event.allDay ? undefined : event.startTime,
        endTime: event.allDay ? undefined : event.endTime,
        location: event.location,
        repeat: event.repeat,
        repeatWeekdays:
          event.repeat === 'weekly'
            ? event.repeatWeekdays ?? [new Date(`${event.date}T00:00:00`).getDay()]
            : undefined,
        repeatIntervalWeeks:
          event.repeat === 'weekly' ? event.repeatIntervalWeeks ?? 1 : undefined,
        repeatMonthDay:
          event.repeat === 'monthly'
            ? event.repeatMonthDay ?? new Date(`${event.date}T00:00:00`).getDate()
            : undefined,
        repeatMonthlyWeek:
          event.repeat === 'monthlyWeekday'
            ? event.repeatMonthlyWeek ?? 'first'
            : undefined,
        repeatMonthlyWeekday:
          event.repeat === 'monthlyWeekday'
            ? event.repeatMonthlyWeekday ?? new Date(`${event.date}T00:00:00`).getDay()
            : undefined,
        repeatEnd: event.repeatEnd,
        repeatCount: event.repeatCount,
        repeatEndDate: event.repeatEndDate,
        note: event.note,
        createdById: memberId,
        completedMemberIds: [],
        participantMemberIds: [],
      }))
      return
    }
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

  const addTodo = (input: TodoInput, sharedRoomId?: string) => {
    if (sharedRoomId) {
      addSharedItem(sharedRoomId, (memberId) => ({
        id: `shared-${crypto.randomUUID()}`,
        type: 'todo',
        title: input.text,
        date: input.date,
        time: input.dueTime || undefined,
        repeat: input.repeat ?? 'none',
        repeatWeekdays: input.repeatWeekdays,
        repeatIntervalWeeks: input.repeatIntervalWeeks,
        repeatMonthDay: input.repeatMonthDay,
        repeatMonthlyWeek: input.repeatMonthlyWeek,
        repeatMonthlyWeekday: input.repeatMonthlyWeekday,
        repeatEnd: input.repeatEnd,
        repeatCount: input.repeatCount,
        repeatEndDate: input.repeatEndDate,
        note: input.note,
        createdById: memberId,
        completedMemberIds: [],
        participantMemberIds: [],
      }))
      return
    }
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

  const finishFocus = (todoId: string, elapsedSeconds: number) => {
    setFocusResults((current) => ({
      ...current,
      [todoId]: elapsedSeconds,
    }))
  }

  const completeTodo = (todoId: string, dateKey: string) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === todoId ? { ...todo, done: true } : todo,
      ),
    )
    selectDate(new Date(`${dateKey}T00:00:00`))
  }

  const rescheduleTodo = (
    todoId: string,
    fromDateKey: string,
    toDateKey: string,
  ) => {
    if (fromDateKey === toDateKey) {
      selectDate(new Date(`${toDateKey}T00:00:00`))
      return
    }

    setTodos((current) =>
      current.map((todo) =>
        todo.id === todoId
          ? { ...todo, date: toDateKey, done: false }
          : todo,
      ),
    )
    selectDate(new Date(`${toDateKey}T00:00:00`))
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
          return item.type === 'event'
            ? { ...item, participantMemberIds: nextMemberIds }
            : { ...item, completedMemberIds: nextMemberIds }
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
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/calendar" aria-label="하루 홈">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <span>하루</span>
        </Link>

        <nav className="primary-nav" aria-label="주요 메뉴">
          <NavLink to="/calendar">
            <span aria-hidden="true">▦</span>
            <span className="nav-label">캘린더</span>
          </NavLink>
          <NavLink to="/todos">
            <span aria-hidden="true">✓</span>
            <span className="nav-label">할 일</span>
          </NavLink>
          <NavLink to="/studies">
            <span aria-hidden="true">◉</span>
            <span className="nav-label">모임</span>
          </NavLink>
        </nav>

        <div className="header-meta">
          <p className="today-label">{formatHeaderDate(today)}</p>
          <div className="header-utilities">
            <button
              className="header-utility-button"
              type="button"
              aria-label="통합 검색 열기"
              onClick={openSearch}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6" />
                <path d="m16 16 4 4" />
              </svg>
              <span className="header-shortcut">⌘K</span>
            </button>
            <button
              className={`header-utility-button notification-button${
                isNotificationInboxOpen ? ' active' : ''
              }`}
              type="button"
              aria-label={`알림 수신함, 읽지 않은 알림 ${unreadNotificationCount}개`}
              aria-expanded={isNotificationInboxOpen}
              onClick={toggleNotificationInbox}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" />
                <path d="M10 21h4" />
              </svg>
              {unreadNotificationCount > 0 && (
                <span className="notification-badge">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
          </div>
          <div className="profile-menu" ref={profileMenuRef}>
            <button
              className={`avatar${isProfileMenuOpen ? ' active' : ''}`}
              type="button"
              aria-label="사용자 메뉴"
              aria-controls="profile-menu-popover"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen((current) => !current)}
            >
              민
            </button>

            {isProfileMenuOpen && (
              <div
                className="profile-menu-popover"
                id="profile-menu-popover"
                role="menu"
              >
                <div className="profile-menu-user">
                  <span aria-hidden="true">민</span>
                  <div>
                    <strong>민서</strong>
                    <small>오늘도 한 걸음씩</small>
                  </div>
                </div>
                <div className="profile-menu-links">
                  <Link role="menuitem" to="/profile">
                    <span aria-hidden="true">◯</span>
                    내 프로필
                    <i aria-hidden="true">›</i>
                  </Link>
                  <Link role="menuitem" to="/settings">
                    <span aria-hidden="true">⚙</span>
                    설정
                    <i aria-hidden="true">›</i>
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() =>
                      setProfileActionMessage('방금 모든 데이터를 동기화했어요')
                    }
                  >
                    <span aria-hidden="true">↻</span>
                    지금 동기화
                    <i aria-hidden="true">›</i>
                  </button>
                </div>
                <p className="profile-menu-message" aria-live="polite">
                  <span aria-hidden="true">●</span> {profileActionMessage}
                </p>
                <button
                  className="profile-menu-logout"
                  role="menuitem"
                  type="button"
                  onClick={logout}
                >
                  <span aria-hidden="true">↪</span>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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
              projects={projects}
              collectionCounts={collectionCounts}
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
              collectionCounts={collectionCounts}
              studyRooms={joinedStudyRooms}
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
              events={events}
              projects={projects}
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
              events={events}
              projects={projects}
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
          element={
            <TaskDetailRoute todos={todos} focusResults={focusResults} />
          }
        />
        <Route
          path="/todos/:todoId/focus"
          element={<FocusSessionRoute todos={todos} onFinish={finishFocus} />}
        />
        <Route
          path="/todos/:todoId/result"
          element={
            <FocusResultRoute
              todos={todos}
              focusResults={focusResults}
              onComplete={completeTodo}
              onReschedule={rescheduleTodo}
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
          path="/studies/:roomId"
          element={
            <StudyRoomRoute
              rooms={studyRooms}
              onJoinRoom={joinStudyRoom}
              onChangeRoom={changeStudyRoom}
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
              onCreateProject={createProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onReorderProjects={reorderProjects}
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
