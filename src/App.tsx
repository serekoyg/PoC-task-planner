import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import {
  type CalendarEvent,
  type CalendarEventInput,
  createInitialEvents,
  createInitialTodos,
  type Todo,
  type TodoInput,
  toDateKey,
} from './data/initialData'
import {
  createInitialStudyRooms,
  type StudyRoom,
  type StudyRoomCreateInput,
} from './data/studyRooms'
import { formatHeaderDate } from './lib/date'
import CalendarPage from './pages/CalendarPage'
import FocusResultPage from './pages/FocusResultPage'
import FocusSessionPage from './pages/FocusSessionPage'
import ProfilePage from './pages/ProfilePage'
import StudyRoomDetailPage from './pages/StudyRoomDetailPage'
import StudyRoomsPage from './pages/StudyRoomsPage'
import TaskDetailPage from './pages/TaskDetailPage'
import TodosPage from './pages/TodosPage'

const TODO_STORAGE_KEY = 'haru.todos'
const EVENT_STORAGE_KEY = 'haru.events'
const STUDY_STORAGE_KEY = 'haru.study-rooms'
const FOCUS_STORAGE_KEY = 'haru.focus-results'

const readStorage = <T,>(key: string, fallback: () => T): T => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback()
  } catch {
    return fallback()
  }
}

const getDefaultEndTime = (startTime: string) => {
  const [hours, minutes] = startTime.split(':').map(Number)
  const endMinutes = Math.min(hours * 60 + minutes + 60, 23 * 60 + 59)
  return `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(
    endMinutes % 60,
  ).padStart(2, '0')}`
}

const readEvents = () =>
  readStorage<CalendarEvent[]>(EVENT_STORAGE_KEY, createInitialEvents).map(
    (event) => {
      const startTime = event.startTime ?? event.time ?? '09:00'
      return {
        ...event,
        startTime,
        endTime: event.endTime ?? getDefaultEndTime(startTime),
        allDay: event.allDay ?? false,
        category: event.category ?? '개인',
        location: event.location ?? '',
        note: event.note ?? '',
        repeat: event.repeat ?? 'none',
        reminder: event.reminder ?? 'none',
      }
    },
  )

type LegacyTodo = Omit<Partial<Todo>, 'priority'> &
  Pick<Todo, 'id' | 'text' | 'done'> & {
    priority?: Todo['priority'] | '높음' | '보통' | '낮음'
  }

const normalizePriority = (priority: LegacyTodo['priority']): Todo['priority'] => {
  if (priority === '높음') return 'high'
  if (priority === '낮음') return 'low'
  if (priority === '보통') return 'medium'
  return priority ?? 'medium'
}

const normalizeTodo = (todo: LegacyTodo, date: string): Todo => ({
  id: todo.id,
  date: todo.date ?? date,
  text: todo.text,
  done: todo.done,
  priority: normalizePriority(todo.priority),
  category: todo.category ?? '개인',
  dueTime: todo.dueTime ?? '',
  reminder: todo.reminder ?? 'none',
  color: todo.color ?? 'blue',
  note: todo.note ?? todo.memo ?? '',
  project: todo.project,
  estimatedMinutes: todo.estimatedMinutes ?? 30,
  memo: todo.memo,
})

const readTodos = () => {
  const stored = readStorage<Todo[] | Record<string, LegacyTodo[]>>(
    TODO_STORAGE_KEY,
    createInitialTodos,
  )

  if (Array.isArray(stored)) {
    const fallbackDate = toDateKey(new Date())
    return stored.map((todo) => normalizeTodo(todo, fallbackDate))
  }

  return Object.entries(stored).flatMap(([date, items]) =>
    items.map((todo) => normalizeTodo(todo, date)),
  )
}

const readStudyRooms = () =>
  readStorage(STUDY_STORAGE_KEY, createInitialStudyRooms).map((room) =>
    room.description ===
    '출근 전 조용히 모여 각자 준비하는 아침 집중 스터디예요.'
      ? {
          ...room,
          description: '출근 전 조용히 모여 각자 준비하는 아침 집중 모임이에요.',
        }
      : room,
  )

type StudyRoomRouteProps = {
  rooms: StudyRoom[]
  onJoinRoom: (roomId: string) => void
}

function StudyRoomRoute({ rooms, onJoinRoom }: StudyRoomRouteProps) {
  const { roomId } = useParams()
  return (
    <StudyRoomDetailPage
      room={rooms.find((room) => room.id === roomId)}
      onJoinRoom={onJoinRoom}
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
  const today = useMemo(() => new Date(), [])
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today)
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [todos, setTodos] = useState<Todo[]>(readTodos)
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    readEvents(),
  )
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>(() =>
    readStudyRooms(),
  )
  const [focusResults, setFocusResults] = useState<Record<string, number>>(() =>
    readStorage(FOCUS_STORAGE_KEY, () => ({})),
  )
  const selectedKey = toDateKey(selectedDate)

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
    setIsProfileMenuOpen(false)
  }, [location.pathname])

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

  const addEvent = (event: CalendarEventInput) => {
    setEvents((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        ...event,
      },
    ])
  }

  const updateEvent = (eventId: string, event: CalendarEventInput) => {
    setEvents((current) =>
      current.map((item) => (item.id === eventId ? { id: eventId, ...event } : item)),
    )
  }

  const removeEvent = (eventId: string) => {
    setEvents((current) => current.filter((event) => event.id !== eventId))
  }

  const addTodo = (input: TodoInput) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      done: false,
      ...input,
    }

    setTodos((current) => [...current, newTodo])
  }

  const updateTodo = (todoId: string, input: TodoInput) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === todoId ? { ...todo, ...input } : todo,
      ),
    )
  }

  const toggleTodo = (todoId: string) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === todoId ? { ...todo, done: !todo.done } : todo,
      ),
    )
  }

  const removeTodo = (todoId: string) => {
    setTodos((current) => current.filter((todo) => todo.id !== todoId))
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
              focusLabel: '오늘의 공부를 준비 중이에요',
              isMe: true,
            },
          ],
        }
      }),
    )
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
        members: [
          {
            id: 'me',
            name: '민서',
            avatar: '민',
            minutes: 0,
            status: 'resting',
            focusLabel: '첫 집중을 준비 중이에요',
            isMe: true,
          },
        ],
      },
      ...current,
    ])

    return roomId
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
            캘린더
          </NavLink>
          <NavLink to="/todos">
            <span aria-hidden="true">✓</span>
            할 일
          </NavLink>
          <NavLink to="/studies">
            <span aria-hidden="true">◉</span>
            모임
          </NavLink>
        </nav>

        <div className="header-meta">
          <p className="today-label">{formatHeaderDate(today)}</p>
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
                  <Link role="menuitem" to="/todos">
                    <span aria-hidden="true">✓</span>
                    오늘 할 일
                    <i aria-hidden="true">›</i>
                  </Link>
                  <Link role="menuitem" to="/studies">
                    <span aria-hidden="true">◉</span>
                    참여 중인 모임
                    <i aria-hidden="true">›</i>
                  </Link>
                </div>
                <p className="profile-menu-message">
                  이번 주 목표까지 <strong>2일</strong> 남았어요.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

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
              onUpdateEvent={updateEvent}
              onRemoveEvent={removeEvent}
            />
          }
        />
        <Route
          path="/todos"
          element={
            <TodosPage
              today={today}
              selectedDate={selectedDate}
              todos={todos.filter((todo) => todo.date === selectedKey)}
              onSelectDate={selectDate}
              onAddTodo={addTodo}
              onUpdateTodo={updateTodo}
              onToggleTodo={toggleTodo}
              onRemoveTodo={removeTodo}
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
          path="/studies/:roomId"
          element={
            <StudyRoomRoute rooms={studyRooms} onJoinRoom={joinStudyRoom} />
          }
        />
        <Route
          path="/profile"
          element={<ProfilePage todos={todos} rooms={studyRooms} />}
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
