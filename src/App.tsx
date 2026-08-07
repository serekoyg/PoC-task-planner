import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'
import {
  type CalendarEvent,
  createInitialEvents,
  createInitialTodos,
  type Todo,
  toDateKey,
} from './data/initialData'
import {
  createInitialStudyRooms,
  type StudyRoom,
  type StudyRoomCreateInput,
} from './data/studyRooms'
import { formatHeaderDate } from './lib/date'
import CalendarPage from './pages/CalendarPage'
import StudyRoomDetailPage from './pages/StudyRoomDetailPage'
import StudyRoomsPage from './pages/StudyRoomsPage'
import TodosPage from './pages/TodosPage'

const TODO_STORAGE_KEY = 'haru.todos'
const EVENT_STORAGE_KEY = 'haru.events'
const STUDY_STORAGE_KEY = 'haru.study-rooms'

const readStorage = <T,>(key: string, fallback: () => T): T => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback()
  } catch {
    return fallback()
  }
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

export default function App() {
  const today = useMemo(() => new Date(), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [todos, setTodos] = useState<Record<string, Todo[]>>(() =>
    readStorage(TODO_STORAGE_KEY, createInitialTodos),
  )
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    readStorage(EVENT_STORAGE_KEY, createInitialEvents),
  )
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>(() =>
    readStudyRooms(),
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

  const addEvent = (title: string, time: string) => {
    setEvents((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        date: selectedKey,
        title,
        time,
        color: 'coral',
      },
    ])
  }

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      done: false,
    }

    setTodos((current) => ({
      ...current,
      [selectedKey]: [...(current[selectedKey] ?? []), newTodo],
    }))
  }

  const toggleTodo = (todoId: string) => {
    setTodos((current) => ({
      ...current,
      [selectedKey]: (current[selectedKey] ?? []).map((todo) =>
        todo.id === todoId ? { ...todo, done: !todo.done } : todo,
      ),
    }))
  }

  const removeTodo = (todoId: string) => {
    setTodos((current) => ({
      ...current,
      [selectedKey]: (current[selectedKey] ?? []).filter(
        (todo) => todo.id !== todoId,
      ),
    }))
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
          <button className="avatar" type="button" aria-label="내 프로필">
            플
          </button>
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
            />
          }
        />
        <Route
          path="/todos"
          element={
            <TodosPage
              today={today}
              selectedDate={selectedDate}
              todos={todos[selectedKey] ?? []}
              onSelectDate={selectDate}
              onAddTodo={addTodo}
              onToggleTodo={toggleTodo}
              onRemoveTodo={removeTodo}
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
