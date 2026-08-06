import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  CalendarEvent,
  createInitialEvents,
  createInitialTodos,
  Todo,
  toDateKey,
} from './data/initialData'

const TODO_STORAGE_KEY = 'haru.todos'
const EVENT_STORAGE_KEY = 'haru.events'
const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

const readStorage = <T,>(key: string, fallback: () => T): T => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback()
  } catch {
    return fallback()
  }
}

const getCalendarDays = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const calendarStart = new Date(firstDay)
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + index)
    return date
  })
}

const formatSelectedDate = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)

const formatHeaderDate = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)

function Planner() {
  const today = useMemo(() => new Date(), [])
  const todayKey = toDateKey(today)
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
  const [todoText, setTodoText] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventTime, setEventTime] = useState('09:00')
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)

  const selectedKey = toDateKey(selectedDate)
  const selectedTodos = todos[selectedKey] ?? []
  const selectedEvents = events
    .filter((event) => event.date === selectedKey)
    .sort((a, b) => a.time.localeCompare(b.time))
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  )
  const completedCount = selectedTodos.filter((todo) => todo.done).length
  const completionRate = selectedTodos.length
    ? Math.round((completedCount / selectedTodos.length) * 100)
    : 0

  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events))
  }, [events])

  const moveMonth = (amount: number) => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    )
  }

  const selectToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const addTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = todoText.trim()
    if (!text) return

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      done: false,
    }

    setTodos((current) => ({
      ...current,
      [selectedKey]: [...(current[selectedKey] ?? []), newTodo],
    }))
    setTodoText('')
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

  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = eventTitle.trim()
    if (!title) return

    setEvents((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        date: selectedKey,
        title,
        time: eventTime,
        color: 'coral',
      },
    ])
    setEventTitle('')
    setEventTime('09:00')
    setIsEventFormOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="하루 홈">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <span>하루</span>
        </a>
        <p className="today-label">{formatHeaderDate(today)}</p>
        <button className="avatar" type="button" aria-label="내 프로필">
          플
        </button>
      </header>

      <main className="planner">
        <section className="calendar-card" aria-labelledby="calendar-title">
          <div className="section-heading calendar-heading">
            <div>
              <p className="eyebrow">나의 일정</p>
              <h1 id="calendar-title">
                {visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월
              </h1>
            </div>
            <div className="calendar-actions">
              <button className="today-button" type="button" onClick={selectToday}>
                오늘
              </button>
              <div className="month-navigation" aria-label="월 이동">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  aria-label="이전 달"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  aria-label="다음 달"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          <div className="calendar-grid weekday-row" aria-hidden="true">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-grid month-grid">
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date)
              const dateEvents = events.filter((item) => item.date === dateKey)
              const isSelected = dateKey === selectedKey
              const isToday = dateKey === todayKey
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()

              return (
                <button
                  className={`calendar-day${isSelected ? ' selected' : ''}${
                    isToday ? ' today' : ''
                  }${isCurrentMonth ? '' : ' muted'}`}
                  type="button"
                  key={dateKey}
                  onClick={() => setSelectedDate(date)}
                  aria-label={`${formatSelectedDate(date)}${
                    dateEvents.length ? `, 일정 ${dateEvents.length}개` : ''
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="day-number">{date.getDate()}</span>
                  <span className="day-events" aria-hidden="true">
                    {dateEvents.slice(0, 2).map((item) => (
                      <span className={`event-chip ${item.color}`} key={item.id}>
                        {item.time} {item.title}
                      </span>
                    ))}
                    {dateEvents.length > 2 && (
                      <span className="more-events">+{dateEvents.length - 2}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="day-panel" aria-labelledby="selected-date-title">
          <div className="section-heading day-heading">
            <div>
              <p className="eyebrow">선택한 날짜</p>
              <h2 id="selected-date-title">{formatSelectedDate(selectedDate)}</h2>
            </div>
            <button
              className="add-event-button"
              type="button"
              onClick={() => setIsEventFormOpen((current) => !current)}
              aria-expanded={isEventFormOpen}
            >
              <span aria-hidden="true">＋</span> 일정
            </button>
          </div>

          {isEventFormOpen && (
            <form className="event-form" onSubmit={addEvent}>
              <label>
                <span className="sr-only">일정 시간</span>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">일정 이름</span>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="새 일정 이름"
                  autoFocus
                />
              </label>
              <button type="submit">추가</button>
            </form>
          )}

          <div className="schedule-list" aria-label="선택한 날짜의 일정">
            {selectedEvents.length ? (
              selectedEvents.map((item) => (
                <article className="schedule-item" key={item.id}>
                  <span className={`schedule-dot ${item.color}`} />
                  <div>
                    <time>{item.time}</time>
                    <p>{item.title}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-schedule">등록된 일정이 없습니다.</p>
            )}
          </div>

          <div className="todo-heading">
            <div>
              <p className="eyebrow">오늘의 할 일</p>
              <h2>할 일 목록</h2>
            </div>
            <span className="task-count">
              {completedCount}/{selectedTodos.length}
            </span>
          </div>

          <div className="progress-track" aria-label={`할 일 ${completionRate}% 완료`}>
            <span style={{ width: `${completionRate}%` }} />
          </div>

          <form className="todo-form" onSubmit={addTodo}>
            <label className="sr-only" htmlFor="new-todo">
              새 할 일
            </label>
            <input
              id="new-todo"
              type="text"
              value={todoText}
              onChange={(event) => setTodoText(event.target.value)}
              placeholder="할 일을 입력하세요"
            />
            <button type="submit" aria-label="할 일 추가">
              ＋
            </button>
          </form>

          <ul className="todo-list">
            {selectedTodos.map((todo) => (
              <li className={todo.done ? 'completed' : ''} key={todo.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => toggleTodo(todo.id)}
                  />
                  <span className="custom-checkbox" aria-hidden="true">
                    ✓
                  </span>
                  <span className="todo-text">{todo.text}</span>
                </label>
                <button
                  className="delete-todo"
                  type="button"
                  onClick={() => removeTodo(todo.id)}
                  aria-label={`${todo.text} 삭제`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          {!selectedTodos.length && (
            <div className="empty-todos">
              <span aria-hidden="true">✓</span>
              <p>이날의 할 일을 모두 비웠어요.</p>
              <small>가벼운 마음으로 새 할 일을 추가해 보세요.</small>
            </div>
          )}
        </aside>
      </main>

      <footer>
        <p>오늘 해야 할 일과 중요한 일정을 한곳에서.</p>
        <button type="button" onClick={selectToday}>
          오늘로 돌아가기
        </button>
      </footer>
    </div>
  )
}

export default function App() {
  return <Planner />
}
