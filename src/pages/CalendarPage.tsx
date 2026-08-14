import { type CSSProperties, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DateJumpDialog from '../components/DateJumpDialog'
import ProjectSidebar, {
  type PlanCollection,
  type ProjectFilter,
} from '../components/ProjectSidebar'
import PlanEditorModal from '../components/PlanEditorModal'
import SchedulePanel from '../components/SchedulePanel'
import type {
  CalendarEvent,
  CalendarEventInput,
  Todo,
  TodoInput,
} from '../data/initialData'
import { toDateKey } from '../data/initialData'
import {
  BACKLOG_PROJECT_NAME,
  getProjectColorByName,
  isBacklogProject,
  type CalendarTodoVisibility,
  type PlannerProject,
} from '../data/projects'
import type {
  StudyRoom,
  StudySharedItemEntry,
  StudySharedItemInput,
} from '../data/studyRooms'
import {
  formatSelectedDate,
  getCalendarDays,
  getWeekDays,
  isCalendarEventOnDate,
  isTodoOnDate,
  moveDate,
} from '../lib/date'
import { isSharedItemOnDate } from '../lib/studyShared'

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

type CalendarView = 'day' | 'week' | 'month'

const viewLabels: Record<CalendarView, string> = {
  day: '일간',
  week: '주간',
  month: '월간',
}

const formatShortDate = (date: Date) =>
  `${date.getMonth() + 1}월 ${date.getDate()}일`

const formatWeekTitle = (weekDays: Date[]) => {
  const start = weekDays[0]
  const end = weekDays[weekDays.length - 1]
  return `${start.getFullYear()}년 ${formatShortDate(start)} – ${formatShortDate(end)}`
}

type CalendarPageProps = {
  today: Date
  selectedDate: Date
  visibleMonth: Date
  events: CalendarEvent[]
  todos: Todo[]
  projects: PlannerProject[]
  calendarTodoVisibility: CalendarTodoVisibility
  studyRooms: StudyRoom[]
  sharedItems: StudySharedItemEntry[]
  collectionCounts: Record<PlanCollection, number>
  onSelectDate: (date: Date) => void
  onMoveMonth: (amount: number) => void
  onSelectToday: () => void
  onAddEvent: (event: CalendarEventInput, sharedRoomId?: string) => void
  onAddTodo: (todo: TodoInput, sharedRoomId?: string) => void
  onUpdateEvent: (eventId: string, event: CalendarEventInput) => void
  onRemoveEvent: (eventId: string) => void
  onToggleSharedItemStatus: (roomId: string, itemId: string) => void
  onChangeRoom: (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => void
}

export default function CalendarPage({
  today,
  selectedDate,
  visibleMonth,
  events,
  todos,
  projects,
  calendarTodoVisibility,
  studyRooms,
  sharedItems,
  collectionCounts,
  onSelectDate,
  onMoveMonth,
  onSelectToday,
  onAddEvent,
  onAddTodo,
  onUpdateEvent,
  onRemoveEvent,
  onToggleSharedItemStatus,
  onChangeRoom,
}: CalendarPageProps) {
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] =
    useState<ProjectFilter>('all')
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [isDateJumpOpen, setIsDateJumpOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorDate, setEditorDate] = useState(selectedDate)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent>()
  const [editingSharedEvent, setEditingSharedEvent] =
    useState<StudySharedItemEntry>()
  const dateJumpTriggerRef = useRef<HTMLButtonElement>(null)
  const selectedKey = toDateKey(selectedDate)
  const todayKey = toDateKey(today)
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  )
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const isBacklogEvent = (event: CalendarEvent) =>
    isBacklogProject(event.project)
  const filteredEvents = useMemo(() => {
    if (selectedProjectId === 'all') return events
    if (selectedProjectId === 'backlog') return events.filter(isBacklogEvent)
    const project = projects.find((item) => item.id === selectedProjectId)
    return project
      ? events.filter((event) => event.project === project.name)
      : events
  }, [events, projects, selectedProjectId])
  const enabledCalendarTodos = useMemo(
    () =>
      todos.filter((todo) => {
        if (isBacklogProject(todo.project)) {
          return Boolean(calendarTodoVisibility.backlog)
        }
        const project = projects.find((item) => item.name === todo.project)
        return project
          ? Boolean(calendarTodoVisibility[project.id])
          : false
      }),
    [calendarTodoVisibility, projects, todos],
  )
  const filteredTodos = useMemo(() => {
    if (selectedProjectId === 'all') return enabledCalendarTodos
    if (selectedProjectId === 'backlog') {
      return enabledCalendarTodos.filter((todo) =>
        isBacklogProject(todo.project),
      )
    }
    const project = projects.find((item) => item.id === selectedProjectId)
    return project
      ? enabledCalendarTodos.filter((todo) => todo.project === project.name)
      : enabledCalendarTodos
  }, [enabledCalendarTodos, projects, selectedProjectId])
  const visibleSharedEvents = useMemo(
    () =>
      selectedProjectId === 'all'
        ? sharedItems.filter((entry) => entry.item.type === 'event')
        : [],
    [selectedProjectId, sharedItems],
  )
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all:
        events.length +
        enabledCalendarTodos.length +
        sharedItems.filter((entry) => entry.item.type === 'event').length,
      backlog:
        events.filter(isBacklogEvent).length +
        enabledCalendarTodos.filter((todo) =>
          isBacklogProject(todo.project),
        ).length,
    }
    projects.forEach((project) => {
      counts[project.id] = events.filter(
        (event) => event.project === project.name,
      ).length + enabledCalendarTodos.filter(
        (todo) => todo.project === project.name,
      ).length
    })
    return counts
  }, [enabledCalendarTodos, events, projects, sharedItems])
  const selectedProjectName =
    selectedProject?.name ??
    (selectedProjectId === 'backlog'
      ? BACKLOG_PROJECT_NAME
      : '모든 목록')
  const getEventProjectStyle = (projectName?: string) =>
    ({
      '--project-color': getProjectColorByName(projects, projectName),
    }) as CSSProperties
  const periodTitle =
    calendarView === 'day'
      ? formatSelectedDate(selectedDate)
      : calendarView === 'week'
        ? formatWeekTitle(weekDays)
        : `${visibleMonth.getFullYear()}년 ${visibleMonth.getMonth() + 1}월`

  const movePeriod = (amount: number) => {
    if (calendarView === 'month') {
      const nextMonth = new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + amount,
        1,
      )
      onMoveMonth(amount)
      onSelectDate(nextMonth)
      return
    }
    onSelectDate(
      moveDate(selectedDate, calendarView === 'week' ? amount * 7 : amount),
    )
  }

  const closeDateJump = () => {
    setIsDateJumpOpen(false)
    window.requestAnimationFrame(() => dateJumpTriggerRef.current?.focus())
  }

  const jumpToDate = (date: Date) => {
    onSelectDate(date)
    closeDateJump()
  }

  const openDayView = (date: Date) => {
    onSelectDate(date)
    setCalendarView('day')
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setEditingEvent(undefined)
    setEditingSharedEvent(undefined)
  }

  const openNewEvent = (date = selectedDate) => {
    onSelectDate(date)
    setEditorDate(date)
    setEditingEvent(undefined)
    setEditingSharedEvent(undefined)
    setIsEditorOpen(true)
  }

  const openEditEvent = (event: CalendarEvent, occurrenceDate?: Date) => {
    if (occurrenceDate) onSelectDate(occurrenceDate)
    setEditorDate(occurrenceDate ?? new Date(`${event.date}T00:00:00`))
    setEditingEvent(event)
    setEditingSharedEvent(undefined)
    setIsEditorOpen(true)
  }

  const openEditSharedEvent = (
    entry: StudySharedItemEntry,
    occurrenceDate?: Date,
  ) => {
    if (!entry.canManage) return
    if (occurrenceDate) onSelectDate(occurrenceDate)
    setEditorDate(occurrenceDate ?? new Date(`${entry.item.date}T00:00:00`))
    setEditingEvent(undefined)
    setEditingSharedEvent(entry)
    setIsEditorOpen(true)
  }

  const updateSharedEvent = (input: StudySharedItemInput) => {
    if (!editingSharedEvent) return
    onChangeRoom(editingSharedEvent.roomId, (room) => ({
      ...room,
      sharedItems: room.sharedItems.map((item) =>
        item.id === editingSharedEvent.item.id ? { ...item, ...input } : item,
      ),
    }))
    closeEditor()
  }

  const removeSharedEvent = () => {
    if (!editingSharedEvent) return
    onChangeRoom(editingSharedEvent.roomId, (room) => ({
      ...room,
      sharedItems: room.sharedItems.filter(
        (item) => item.id !== editingSharedEvent.item.id,
      ),
    }))
    closeEditor()
  }

  return (
    <main className="planner calendar-page">
      <div className="project-filter-layout">
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          itemCounts={projectCounts}
          itemLabel="일정과 할 일"
          collectionCounts={collectionCounts}
          onSelectProject={setSelectedProjectId}
          onSelectCollection={(collection) =>
            navigate(`/collections/${collection}`)
          }
        />

        <div className="project-filter-content calendar-view-content">
          <header className="calendar-view-toolbar">
            <div>
              <p className="eyebrow">{selectedProjectName}</p>
              <h1>
                <button
                  className="calendar-period-trigger"
                  type="button"
                  ref={dateJumpTriggerRef}
                  aria-haspopup="dialog"
                  aria-expanded={isDateJumpOpen}
                  onClick={() => setIsDateJumpOpen(true)}
                >
                  {periodTitle}
                  <span aria-hidden="true">⌄</span>
                </button>
              </h1>
            </div>
            <div className="calendar-view-actions">
              <div className="calendar-view-tabs" aria-label="캘린더 보기 선택">
                {(Object.keys(viewLabels) as CalendarView[]).map((view) => (
                  <button
                    className={calendarView === view ? 'active' : ''}
                    type="button"
                    key={view}
                    onClick={() => setCalendarView(view)}
                    aria-pressed={calendarView === view}
                  >
                    {viewLabels[view]}
                  </button>
                ))}
              </div>
              <button
                className="add-event-button calendar-toolbar-add"
                type="button"
                onClick={() => openNewEvent()}
              >
                <span aria-hidden="true">＋</span> 새 일정
              </button>
              <div className="calendar-period-navigation">
                <button
                  className="today-button"
                  type="button"
                  onClick={onSelectToday}
                >
                  오늘
                </button>
                <div
                  className="month-navigation"
                  aria-label={`${viewLabels[calendarView]} 이동`}
                >
                  <button
                    type="button"
                    onClick={() => movePeriod(-1)}
                    aria-label={`이전 ${viewLabels[calendarView]}`}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => movePeriod(1)}
                    aria-label={`다음 ${viewLabels[calendarView]}`}
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </header>

          {calendarView === 'day' && (
            <SchedulePanel
              selectedDate={selectedDate}
              events={filteredEvents}
              todos={filteredTodos}
              projects={projects}
              sharedItems={visibleSharedEvents}
              onCreateEvent={() => openNewEvent()}
              onEditEvent={openEditEvent}
              onEditSharedEvent={openEditSharedEvent}
              onToggleSharedItemStatus={onToggleSharedItemStatus}
            />
          )}

          {calendarView === 'week' && (
            <section className="calendar-card week-calendar-card" aria-label="주간 일정">
              <div className="week-calendar-grid">
                {weekDays.map((date, index) => {
                  const dateKey = toDateKey(date)
                  const dateEvents = filteredEvents
                    .filter((event) => isCalendarEventOnDate(event, dateKey))
                    .sort((first, second) =>
                      first.startTime.localeCompare(second.startTime),
                    )
                  const dateSharedEvents = visibleSharedEvents.filter((entry) =>
                    isSharedItemOnDate(entry.item, dateKey),
                  )
                  const dateTodos = filteredTodos
                    .filter((todo) => isTodoOnDate(todo, dateKey))
                    .sort((first, second) =>
                      first.dueTime.localeCompare(second.dueTime),
                    )
                  const isSelected = dateKey === selectedKey
                  const isToday = dateKey === todayKey

                  return (
                    <article
                      className={`week-day${isSelected ? ' selected' : ''}${
                        isToday ? ' today' : ''
                      }`}
                      key={dateKey}
                    >
                      <button
                        className="week-day-heading"
                        type="button"
                        onClick={() => onSelectDate(date)}
                        aria-label={`${formatSelectedDate(date)} 선택`}
                        aria-pressed={isSelected}
                      >
                        <span>{weekdayLabels[index]}</span>
                        <strong>{date.getDate()}</strong>
                      </button>
                      <div className="week-day-events">
                        {dateEvents.map((event) => (
                          <button
                            className="week-event project-color-surface"
                            style={getEventProjectStyle(event.project)}
                            type="button"
                            key={event.id}
                            onClick={() => openEditEvent(event, date)}
                            aria-label={`${event.title} 편집`}
                          >
                            <time>{event.allDay ? '종일' : event.startTime}</time>
                            <strong>{event.title}</strong>
                            <small>{event.project ?? BACKLOG_PROJECT_NAME} · 나의 계획</small>
                          </button>
                        ))}
                        {dateTodos.map((todo) => (
                          <button
                            className={`week-event calendar-todo-card project-color-surface${
                              todo.done ? ' done' : ''
                            }`}
                            style={getEventProjectStyle(todo.project)}
                            type="button"
                            key={todo.id}
                            onClick={() => navigate(`/todos/${todo.id}`)}
                            aria-label={`${todo.text} 할 일 상세 보기`}
                          >
                            <time>{todo.done ? '✓ 완료' : todo.dueTime}</time>
                            <strong>{todo.text}</strong>
                            <small>{todo.project ?? BACKLOG_PROJECT_NAME} · 할 일</small>
                          </button>
                        ))}
                        {dateSharedEvents.map((entry) => (
                          <button
                            className="week-event blue shared"
                            type="button"
                            key={`${entry.roomId}-${entry.item.id}`}
                            onClick={() =>
                              entry.canManage
                                ? openEditSharedEvent(entry, date)
                                : openDayView(date)
                            }
                            aria-label={
                              entry.canManage
                                ? `${entry.item.title} 편집`
                                : `${entry.item.title}, 일간 보기에서 열기`
                            }
                          >
                            <time>{entry.item.time ?? '종일'}</time>
                            <strong>{entry.item.title}</strong>
                            <small>{entry.roomName} · 모임</small>
                          </button>
                        ))}
                        {!dateEvents.length &&
                          !dateTodos.length &&
                          !dateSharedEvents.length && (
                          <span className="week-day-empty">계획 없음</span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {calendarView === 'month' && (
            <section className="calendar-card" aria-label="월간 일정">
              <div className="calendar-grid weekday-row" aria-hidden="true">
                {weekdayLabels.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="calendar-grid month-grid">
                {calendarDays.map((date) => {
                  const dateKey = toDateKey(date)
                  const dateEvents = filteredEvents.filter((event) =>
                    isCalendarEventOnDate(event, dateKey),
                  )
                  const dateSharedEvents = visibleSharedEvents.filter((entry) =>
                    isSharedItemOnDate(entry.item, dateKey),
                  )
                  const dateTodos = filteredTodos
                    .filter((todo) => isTodoOnDate(todo, dateKey))
                    .sort((first, second) =>
                      first.dueTime.localeCompare(second.dueTime),
                    )
                  const datePlanCount =
                    dateEvents.length +
                    dateTodos.length +
                    dateSharedEvents.length
                  const visibleDateEvents = dateEvents.slice(
                    0,
                    dateTodos.length ? 2 : 3,
                  )
                  const visibleDateTodos = dateTodos.slice(
                    0,
                    Math.max(0, 3 - visibleDateEvents.length),
                  )
                  const visibleSharedEventsForDate = dateSharedEvents.slice(
                    0,
                    Math.max(
                      0,
                      3 - visibleDateEvents.length - visibleDateTodos.length,
                    ),
                  )
                  const isSelected = dateKey === selectedKey
                  const isToday = dateKey === todayKey
                  const isCurrentMonth =
                    date.getMonth() === visibleMonth.getMonth()

                  return (
                    <article
                      className={`calendar-day${isSelected ? ' selected' : ''}${
                        isToday ? ' today' : ''
                      }${isCurrentMonth ? '' : ' muted'}`}
                      key={dateKey}
                    >
                      <button
                        className="calendar-day-select"
                        type="button"
                        onClick={() => onSelectDate(date)}
                        onDoubleClick={() => openDayView(date)}
                        aria-label={`${formatSelectedDate(date)}${
                          datePlanCount ? `, 계획 ${datePlanCount}개` : ''
                        }`}
                        aria-pressed={isSelected}
                      >
                        <span className="day-number">{date.getDate()}</span>
                      </button>
                      <span className="day-events">
                        {visibleDateEvents.map((item) => (
                          <button
                            className="event-chip project-color-surface"
                            style={getEventProjectStyle(item.project)}
                            type="button"
                            key={item.id}
                            onClick={() => openEditEvent(item, date)}
                            aria-label={`${item.title} 편집`}
                          >
                            {item.allDay ? '종일' : item.startTime} {item.title}
                          </button>
                        ))}
                        {visibleDateTodos.map((todo) => (
                          <button
                            className={`event-chip calendar-todo-chip project-color-surface${
                              todo.done ? ' done' : ''
                            }`}
                            style={getEventProjectStyle(todo.project)}
                            type="button"
                            key={todo.id}
                            onClick={() => navigate(`/todos/${todo.id}`)}
                            aria-label={`${todo.text} 할 일 상세 보기`}
                          >
                            <span aria-hidden="true">✓</span>{' '}
                            {todo.dueTime} {todo.text}
                          </button>
                        ))}
                        {visibleSharedEventsForDate.map((entry) => (
                          <button
                            className="event-chip blue shared"
                            type="button"
                            key={`${entry.roomId}-${entry.item.id}`}
                            onClick={() =>
                              entry.canManage
                                ? openEditSharedEvent(entry, date)
                                : openDayView(date)
                            }
                            aria-label={
                              entry.canManage
                                ? `${entry.item.title} 편집`
                                : `${entry.item.title}, 일간 보기에서 열기`
                            }
                          >
                            {entry.item.time ?? '종일'} {entry.item.title}
                          </button>
                        ))}
                        {datePlanCount > 3 && (
                          <span className="more-events">+{datePlanCount - 3}</span>
                        )}
                      </span>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {isDateJumpOpen && (
            <DateJumpDialog
              initialDate={selectedDate}
              today={today}
              onClose={closeDateJump}
              onSelect={jumpToDate}
            />
          )}
        </div>
      </div>

      {isEditorOpen && (
        <PlanEditorModal
          initialType="event"
          selectedDate={editorDate}
          projects={projects}
          studyRooms={studyRooms}
          fixedRoom={
            editingSharedEvent
              ? studyRooms.find(
                  (room) => room.id === editingSharedEvent.roomId,
                )
              : undefined
          }
          memberId={editingSharedEvent?.memberId}
          item={editingSharedEvent?.item}
          calendarEvent={editingEvent}
          defaultProjectName={selectedProject?.name}
          onClose={closeEditor}
          onSaveTodo={(input, sharedRoomId) => {
            onAddTodo(input, sharedRoomId)
            closeEditor()
          }}
          onSaveEvent={(input, sharedRoomId) => {
            if (editingEvent) onUpdateEvent(editingEvent.id, input)
            else onAddEvent(input, sharedRoomId)
            closeEditor()
          }}
          onSaveShared={updateSharedEvent}
          onDelete={
            editingSharedEvent
              ? removeSharedEvent
              : editingEvent
                ? () => {
                    onRemoveEvent(editingEvent.id)
                    closeEditor()
                  }
                : undefined
          }
        />
      )}
    </main>
  )
}
