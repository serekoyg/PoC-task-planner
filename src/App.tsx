import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import {
  type CalendarEvent,
  createInitialEvents,
  createInitialTodos,
  type Todo,
  toDateKey,
} from './data/initialData'
import { formatHeaderDate } from './lib/date'
import CalendarPage from './pages/CalendarPage'
import TodosPage from './pages/TodosPage'

const TODO_STORAGE_KEY = 'haru.todos'
const EVENT_STORAGE_KEY = 'haru.events'

const readStorage = <T,>(key: string, fallback: () => T): T => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback()
  } catch {
    return fallback()
  }
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
  const selectedKey = toDateKey(selectedDate)

  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events))
  }, [events])

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/calendar" aria-label="하루 홈">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <span className="brand-copy">
            <strong>하루</strong>
            <small>나를 위한 데일리 플래너</small>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="주요 메뉴">
          <NavLink to="/calendar">
            <span className="nav-glyph" aria-hidden="true">▦</span>
            <span className="nav-copy">
              <strong>캘린더</strong>
              <small>일정 관리</small>
            </span>
          </NavLink>
          <NavLink to="/todos">
            <span className="nav-glyph" aria-hidden="true">✓</span>
            <span className="nav-copy">
              <strong>할 일</strong>
              <small>오늘 집중</small>
            </span>
          </NavLink>
        </nav>

        <div className="header-meta">
          <div className="today-label">
            <span>오늘</span>
            <strong>{formatHeaderDate(today)}</strong>
          </div>
          <button className="avatar" type="button" aria-label="내 프로필">
            민
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
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>

      <footer>
        <p>하루 · 오늘을 가볍게 정리하는 플래너</p>
        <Link to="/calendar" onClick={selectToday}>
          오늘로 돌아가기
        </Link>
      </footer>
    </div>
  )
}
